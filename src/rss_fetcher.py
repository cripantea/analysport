import feedparser
import json
import re
import requests
from datetime import datetime
from pathlib import Path
from html import unescape
from bs4 import BeautifulSoup
from database import save_article, init_db

BLACKLIST_KEYWORDS = [
    "pronostico", "scommesse", "multigol", "quota", "betting",
    "over 2.5", "under", "handicap", "schedina",
    "voti e pagelle", "pagelle", "fantacalcio"
]

RSS_FEEDS = {
    "tmw": "https://www.tuttomercatoweb.com/rss/",
    "giallorossi": "https://www.giallorossi.net/feed/",
    "lazionews": "https://www.lazionews.eu/feed/",
    "juvenews": "https://www.juvenews.eu/feed/",
    "milanista": "https://www.ilmilanista.it/feed/",
    "fcinter1908": "https://www.fcinter1908.it/feed/",
    "corriere_sport": "https://www.corrieredellosport.it/rss/",
    "corriere_serie_a": "https://www.corrieredellosport.it/rss/calcio/serie-a",
    "corriere_mercato": "https://www.corrieredellosport.it/rss/calcio/calcio-mercato",
    "corriere_champions": "https://www.corrieredellosport.it/rss/calcio/champions-league",
    "calcionapoli24": "https://www.calcionapoli24.it/feed/",
}

def store_articles(articles: list[dict]) -> int:
    init_db()
    saved = 0
    for article in articles:
        if save_article(article):
            saved += 1
    print(f"Salvati {saved} nuovi articoli ({len(articles) - saved} duplicati scartati)")
    return saved

def get_image(entry) -> str:
    """Estrae URL immagine dall'entry RSS."""
    # Prova media_content
    if entry.get("media_content"):
        return entry["media_content"][0].get("url", "")
    # Prova media_thumbnail
    if entry.get("media_thumbnail"):
        return entry["media_thumbnail"][0].get("url", "")
    # Prova enclosures
    if entry.get("enclosures"):
        for enc in entry["enclosures"]:
            if "image" in enc.get("type", ""):
                return enc.get("href", "")
    return ""

def scrape_article_body(url: str) -> str:
    """Scarica il corpo dell'articolo quando il summary RSS è vuoto."""
    try:
        headers = {"User-Agent": "Mozilla/5.0"}
        response = requests.get(url, headers=headers, timeout=10)
        soup = BeautifulSoup(response.text, "html.parser")

        # CalcioNapoli24 — il corpo è in div.article-body o simile
        selectors = [
            "div.article-body",
            "div.entry-content",
            "div.post-content",
            "article p"
        ]

        for selector in selectors:
            body = soup.select_one(selector)
            if body:
                text = body.get_text(separator=" ", strip=True)
                return text[:1000]  # primi 1000 caratteri bastano

        return ""
    except Exception as e:
        print(f"  → scraping fallito: {e}")
        return ""

def clean_html(text: str) -> str:
    if not text:
        return ""
    text = unescape(text)  # &egrave; → è, &quot; → "
    text = re.sub(r'<[^>]+>', '', text)  # rimuove tag HTML
    text = re.sub(r'\s+', ' ', text).strip()  # spazi multipli
    return text

def fetch_feed(name: str, url: str) -> list[dict]:
    print(f"Fetching {name}...")
    feed = feedparser.parse(url)

    articles = []
    for entry in feed.entries:
        article = {
            "source": name,
            "title": clean_html(entry.get("title", "")),
            "link": entry.get("link", ""),
            "summary": clean_html(entry.get("summary", "")),
            "published": entry.get("published", ""),
            "image": get_image(entry),  # aggiunto
            "fetched_at": datetime.now().isoformat()
        }
        if not article["summary"] and article["link"]:
            print(f"  → scraping {article['link'][:60]}...")
            article["summary"] = scrape_article_body(article["link"])
        articles.append(article)

    print(f"  → {len(articles)} articoli trovati")
    return articles

def fetch_all() -> list[dict]:
    all_articles = []
    for name, url in RSS_FEEDS.items():
        try:
            articles = fetch_feed(name, url)
            all_articles.extend(articles)
        except Exception as e:
            print(f"  → Errore su {name}: {e}")
    return filter_articles(all_articles)

def save_articles(articles: list[dict], output_dir: str = "data/raw"):
    Path(output_dir).mkdir(parents=True, exist_ok=True)
    filename = f"{output_dir}/articles_{datetime.now().strftime('%Y%m%d_%H%M%S')}.json"
    with open(filename, "w", encoding="utf-8") as f:
        json.dump(articles, f, ensure_ascii=False, indent=2)
    print(f"\nSalvati {len(articles)} articoli in {filename}")
    return filename

def filter_articles(articles: list[dict]) -> list[dict]:
    filtered = []
    for article in articles:
        title_lower = article["title"].lower()
        if any(kw in title_lower for kw in BLACKLIST_KEYWORDS):
            continue
        filtered.append(article)

    removed = len(articles) - len(filtered)
    print(f"Filtrati {removed} articoli irrilevanti su {len(articles)}")
    return filtered

def update_images():
    """Aggiorna le immagini mancanti per articoli già nel DB."""
    from database import get_connection
    conn = get_connection()

    updated = 0
    for name, url in RSS_FEEDS.items():
        feed = feedparser.parse(url)
        for entry in feed.entries:
            image = get_image(entry)
            if not image:
                continue
            link = entry.get("link", "")
            result = conn.execute(
                "UPDATE articles SET image = ? WHERE link = ? AND (image IS NULL OR image = '')",
                (image, link)
            )
            updated += result.rowcount

    conn.commit()
    conn.close()
    print(f"Aggiornate {updated} immagini")


if __name__ == "__main__":
    articles = fetch_all()
    store_articles(articles)
    update_images()
