import sys
from pathlib import Path
sys.path.append(str(Path(__file__).parent))

from elasticsearch import Elasticsearch
from datetime import datetime

es = Elasticsearch("http://localhost:9200")
INDEX = "project_alfa_articles"

def init_index():
    if es.indices.exists(index=INDEX):
        return
    es.indices.create(index=INDEX, body={
        "mappings": {
            "properties": {
                "title":      {"type": "text", "analyzer": "italian"},
                "summary":    {"type": "text", "analyzer": "italian"},
                "source":     {"type": "keyword"},
                "published":  {"type": "keyword"},
                "article_id": {"type": "integer"},
                "link":       {"type": "keyword"}
            }
        }
    })
    print(f"Indice '{INDEX}' creato")

def index_article(article_id: int, article: dict):
    es.index(index=INDEX, id=article_id, document={
        "article_id": article_id,
        "title":      article["title"],
        "summary":    article["summary"],
        "source":     article["source"],
        "link":       article["link"],
        "published":  article.get("published", ""),
    })

def search_similar(query: str, size: int = 5, min_score: float = 12.0) -> list[dict]:
    result = es.search(index=INDEX, body={
        "query": {
            "multi_match": {
                "query": query,
                "fields": ["title^2", "summary"],
                "type": "best_fields"
            }
        },
        "size": size,
        "min_score": min_score
    })

    hits = result["hits"]["hits"]
    return [hit["_source"] for hit in hits if hit["_score"] >= min_score]

if __name__ == "__main__":
    init_index()
    print("ES pronto")
