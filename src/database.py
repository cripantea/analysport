import sqlite3
from pathlib import Path
from datetime import datetime

DB_PATH = "data/project_alfa.db"

def get_connection():
    Path("data").mkdir(exist_ok=True)
    return sqlite3.connect(DB_PATH)

def init_db():
    conn = get_connection()
    conn.executescript("""
        CREATE TABLE IF NOT EXISTS articles (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            source TEXT,
            title TEXT,
            link TEXT UNIQUE,
            summary TEXT,
            image TEXT,
            published TEXT,
            fetched_at TEXT
        );

        CREATE TABLE IF NOT EXISTS analyses (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            article_id INTEGER REFERENCES articles(id),
            analysis_text TEXT,
            analyzed_at TEXT
        );
        CREATE TABLE IF NOT EXISTS analysis_sources (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            analysis_id INTEGER REFERENCES analyses(id),
            title TEXT,
            source TEXT,
            link TEXT,
            published TEXT
        );
    """)
    conn.commit()
    conn.close()
    print("Database inizializzato")

def save_analysis_sources(analysis_id: int, sources: list[dict]):
    conn = get_connection()
    for s in sources:
        conn.execute("""
            INSERT INTO analysis_sources (analysis_id, title, source, link, published)
            VALUES (?, ?, ?, ?, ?)
        """, (analysis_id, s.get("title",""), s.get("source",""), s.get("link",""), s.get("published","")))
    conn.commit()
    conn.close()

def get_analysis_sources(analysis_id: int) -> list[dict]:
    conn = get_connection()
    conn.row_factory = lambda c, r: dict(zip([d[0] for d in c.description], r))
    rows = conn.execute("""
        SELECT
            s.title,
            s.source,
            s.link,
            s.published,
            an.id as internal_analysis_id
        FROM analysis_sources s
        LEFT JOIN articles a ON a.link = s.link
        LEFT JOIN analyses an ON an.article_id = a.id
        WHERE s.analysis_id = ?
    """, (analysis_id,)).fetchall()
    conn.close()
    return rows

def save_article(article: dict) -> int | None:
    conn = get_connection()
    try:
        cursor = conn.execute("""
            INSERT INTO articles (source, title, link, summary, image, published, fetched_at)
            VALUES (?, ?, ?, ?, ?, ?, ?)
        """, (
            article["source"], article["title"], article["link"],
            article["summary"], article.get("image", ""),
            article["published"], article["fetched_at"]
        ))
        conn.commit()
        return cursor.lastrowid
    except sqlite3.IntegrityError:
        return None
    finally:
        conn.close()

def save_analysis(article_id: int, analysis_text: str) -> int:
    conn = get_connection()
    cursor = conn.execute("""
        INSERT INTO analyses (article_id, analysis_text, analyzed_at)
        VALUES (?, ?, ?)
    """, (article_id, analysis_text, datetime.now().isoformat()))
    conn.commit()
    analysis_id = cursor.lastrowid
    conn.close()
    return analysis_id

def get_unanalyzed_articles(limit: int = 10) -> list[dict]:
    """Articoli senza analisi ancora."""
    conn = get_connection()
    conn.row_factory = sqlite3.Row
    rows = conn.execute("""
        SELECT a.* FROM articles a
        LEFT JOIN analyses an ON an.article_id = a.id
        WHERE an.id IS NULL
        ORDER BY a.fetched_at DESC
        LIMIT ?
    """, (limit,)).fetchall()
    conn.close()
    return [dict(row) for row in rows]

if __name__ == "__main__":
    init_db()
