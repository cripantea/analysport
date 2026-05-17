import sys
from pathlib import Path
sys.path.append(str(Path(__file__).parent))

from database import get_connection
from search import init_index, index_article

def reindex_all():
    init_index()
    conn = get_connection()
    conn.row_factory = lambda c, r: dict(zip([d[0] for d in c.description], r))
    articles = conn.execute("SELECT * FROM articles").fetchall()
    conn.close()

    print(f"Indicizzando {len(articles)} articoli...")
    for article in articles:
        index_article(article["id"], article)

    print("Done")

if __name__ == "__main__":
    reindex_all()
