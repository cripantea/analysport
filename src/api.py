import os
import sys
from pathlib import Path
sys.path.append(str(Path(__file__).parent))

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from database import get_connection, init_db, increment_views

app = FastAPI()

@app.on_event("startup")
def startup():
    init_db()

_default_origins = "http://localhost:5173,http://localhost:5174"
_allow_origins = os.getenv("ALLOW_ORIGINS", _default_origins).split(",")

app.add_middleware(
    CORSMiddleware,
    allow_origins=_allow_origins,
    allow_methods=["*"],
    allow_headers=["*"],
)

@app.get("/analyses")
def get_analyses(limit: int = 500, offset: int = 0):
    conn = get_connection()
    conn.row_factory = dict_factory
    rows = conn.execute("""
        SELECT
            an.id,
            an.analysis_text,
            an.analyzed_at,
            an.views,
            a.title,
            a.source,
            a.link,
            a.image,
            a.published,
            (SELECT COUNT(*) FROM analysis_sources s WHERE s.analysis_id = an.id) AS sources_count
        FROM analyses an
        JOIN articles a ON a.id = an.article_id
        ORDER BY an.analyzed_at DESC
        LIMIT ? OFFSET ?
    """, (limit, offset)).fetchall()
    conn.close()
    return rows

def dict_factory(cursor, row):
    fields = [description[0] for description in cursor.description]
    return dict(zip(fields, row))

from database import get_analysis_sources

@app.get("/analyses/{id}/sources")
def get_sources(id: int):
    return get_analysis_sources(id)


@app.get("/analyses/{id}")
def get_analysis(id: int):
    increment_views(id)
    conn = get_connection()
    conn.row_factory = dict_factory
    row = conn.execute("""
        SELECT
            an.id,
            an.analysis_text,
            an.analyzed_at,
            a.title,
            a.source,
            a.link,
            a.image,
            a.published,
            a.summary
        FROM analyses an
        JOIN articles a ON a.id = an.article_id
        WHERE an.id = ?
    """, (id,)).fetchone()
    conn.close()
    return row
@app.get("/articles/by-link")
def get_article_by_link(link: str):
    conn = get_connection()
    conn.row_factory = dict_factory
    row = conn.execute("SELECT id FROM articles WHERE link = ?", (link,)).fetchone()
    conn.close()
    return row or {}

@app.post("/analyze/{article_id}")
async def analyze_on_demand(article_id: int):
    import os
    sys.path.append("src")
    from dotenv import load_dotenv
    load_dotenv()

    conn = get_connection()
    conn.row_factory = dict_factory

    # Controlla se esiste già
    existing = conn.execute(
        "SELECT an.id FROM analyses an WHERE an.article_id = ?",
        (article_id,)
    ).fetchone()

    if existing:
        conn.close()
        return {"analysis_id": existing["id"]}

    article = conn.execute(
        "SELECT * FROM articles WHERE id = ?",
        (article_id,)
    ).fetchone()
    conn.close()

    if not article:
        return {"error": "articolo non trovato"}

    from analyzer import build_prompt
    from database import save_analysis, save_analysis_sources
    import anthropic

    client = anthropic.Anthropic()
    prompt, sources = build_prompt(article)

    # Esegui in thread separato per non bloccare
    import asyncio
    loop = asyncio.get_event_loop()

    def call_api():
        return client.messages.create(
            model=os.getenv("ANTHROPIC_MODEL", "claude-haiku-4-5-20251001"),
            max_tokens=1000,
            messages=[{"role": "user", "content": prompt}]
        )

    message = await loop.run_in_executor(None, call_api)

    analysis_id = save_analysis(article["id"], message.content[0].text)
    if sources:
        save_analysis_sources(analysis_id, sources)

    return {"analysis_id": analysis_id}

from fastapi.responses import StreamingResponse
import json

def _scrape_og_image(url: str) -> str:
    """Prova a recuperare l'og:image dalla pagina HTML dell'articolo."""
    try:
        import requests
        from bs4 import BeautifulSoup
        r = requests.get(url, headers={"User-Agent": "Mozilla/5.0"}, timeout=8)
        soup = BeautifulSoup(r.text, "html.parser")
        for attr in ("og:image", "twitter:image"):
            tag = soup.find("meta", property=attr) or soup.find("meta", attrs={"name": attr})
            if tag and tag.get("content"):
                return tag["content"]
    except Exception:
        pass
    return ""

@app.post("/analyze/{article_id}/stream")
async def analyze_stream(article_id: int):
    import os
    sys.path.append("src")
    from dotenv import load_dotenv
    load_dotenv()

    conn = get_connection()
    conn.row_factory = dict_factory

    existing = conn.execute(
        "SELECT an.id FROM analyses an WHERE an.article_id = ?",
        (article_id,)
    ).fetchone()

    if existing:
        conn.close()
        # Ritorna analisi già esistente come stream finto
        analysis = conn.execute("""
            SELECT an.analysis_text FROM analyses an WHERE an.id = ?
        """, (existing["id"],)).fetchone()

        async def already_done():
            yield f"data: {json.dumps({'type': 'done', 'analysis_id': existing['id']})}\n\n"

        return StreamingResponse(already_done(), media_type="text/event-stream")

    article = conn.execute(
        "SELECT * FROM articles WHERE id = ?",
        (article_id,)
    ).fetchone()
    conn.close()

    if not article:
        async def error():
            yield f"data: {json.dumps({'type': 'error', 'message': 'articolo non trovato'})}\n\n"
        return StreamingResponse(error(), media_type="text/event-stream")

    # Recupera immagine se mancante
    if not article.get("image") and article.get("link"):
        image = _scrape_og_image(article["link"])
        if image:
            c = get_connection()
            c.execute("UPDATE articles SET image = ? WHERE id = ?", (image, article_id))
            c.commit()
            c.close()
            article = dict(article)
            article["image"] = image

    from analyzer import build_prompt
    from database import save_analysis, save_analysis_sources
    import anthropic

    client = anthropic.Anthropic()
    prompt, sources = build_prompt(article)

    async def generate():
        full_text = ""

        with client.messages.stream(
            model=os.getenv("ANTHROPIC_MODEL", "claude-haiku-4-5-20251001"),
            max_tokens=1000,
            messages=[{"role": "user", "content": prompt}]
        ) as stream:
            for text in stream.text_stream:
                full_text += text
                yield f"data: {json.dumps({'type': 'token', 'text': text})}\n\n"

        # Salva nel DB
        analysis_id = save_analysis(article["id"], full_text)
        if sources:
            save_analysis_sources(analysis_id, sources)

        yield f"data: {json.dumps({'type': 'done', 'analysis_id': analysis_id})}\n\n"

    return StreamingResponse(generate(), media_type="text/event-stream")
