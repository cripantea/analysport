import anthropic
import os
import sys
from pathlib import Path
from dotenv import load_dotenv
from datetime import date

load_dotenv()

sys.path.append(str(Path(__file__).parent))
from database import get_unanalyzed_articles, save_analysis, save_analysis_sources

from search import search_similar

client = anthropic.Anthropic()

def build_prompt(article: dict) -> tuple[str, list[dict]]:
    similar = search_similar(article["title"], size=5)
    similar = [s for s in similar if s.get("link") != article["link"]]

    pub_date = article.get("published", "")
    previous = [s for s in similar if s.get("published", "") <= pub_date]
    followups = [s for s in similar if s.get("published", "") > pub_date]

    all_sources = previous + followups  # salveremo questi

    context = ""
    if previous:
        context += "\n\nArticoli correlati nel nostro archivio:\n"
        for s in previous:
            context += f"- {s['title']} ({s['source']}, {s['published']})\n"
            if s.get("summary"):
                context += f"  {s['summary'][:200]}\n"

    if followups:
        context += "\n\nAggiornamenti successivi su questo tema:\n"
        for s in followups:
            context += f"- {s['title']} ({s['source']}, {s['published']})\n"
            if s.get("summary"):
                context += f"  {s['summary'][:200]}\n"

    oggi = date.today().strftime("%d %B %Y")

    prompt = f"""Sei un giornalista sportivo esperto con memoria storica approfondita.
Data di oggi: {oggi}

Analizza questa notizia e produci:
1. **Riassunto analitico** (3-4 frasi) che va oltre il semplice fatto
2. **Contesto più ampio** — cosa significa per la squadra, il campionato, i protagonisti
3. **Precedenti e collegamenti** — usa gli articoli correlati per citare episodi reali e specifici. Se non sufficienti, cita precedenti storici noti ma segnalali come tali
4. **Sviluppi futuri probabili** — se esistono aggiornamenti successivi nell'archivio, usali per dire come la storia si è già evoluta. Per eventi futuri usa il futuro ("si giocherà"), non il passato

Notizia da analizzare:
Titolo: {article['title']}
Fonte: {article['source']}
Data pubblicazione: {pub_date}
Testo: {article['summary']}
{context}
Regole:
- Tieni conto della data di pubblicazione — non scrivere "nelle prossime ore" se la notizia ha già qualche giorno
- Se la notizia ha più di 24 ore, usa il passato per gli sviluppi attesi
- Se esistono aggiornamenti successivi, integra quello che è già successo
- Distingui chiaramente tra riferimenti dall'archivio e conoscenza generale
- Cita solo fatti reali e verificabili
- MAI descrivere come accaduti eventi futuri rispetto alla data di oggi ({oggi})
- Se una partita o evento è programmato nel futuro, usa sempre il futuro ("si giocherà", "affronterà")
- Non inventare MAI risultati, punteggi o esiti di eventi non ancora accaduti — è una regola assoluta
- Se non hai dati sufficienti su un fatto specifico, scrivi "secondo le fonti disponibili" o ometti il dettaglio
- Per eventi futuri usa il futuro ("si giocherà", "dovrebbe avvenire"), non il passato
- Usa il passato solo per eventi già accaduti rispetto alla data di oggi ({oggi})
- Rispondi in italiano, diretto e professionale"""

    return prompt, all_sources



articles = get_unanalyzed_articles(limit=10)
print(f"Articoli da analizzare: {len(articles)}")

for article in articles:
    print(f"Analizzo: {article['title'][:60]}...")

    prompt, sources = build_prompt(article)

    message = client.messages.create(
        model=os.getenv("ANTHROPIC_MODEL", "claude-haiku-4-5-20251001"),
        max_tokens=1000,
        messages=[{"role": "user", "content": prompt}]
    )

    analysis_id = save_analysis(article["id"], message.content[0].text)
    if sources:
        save_analysis_sources(analysis_id, sources)

    print(f"  → token: input={message.usage.input_tokens} output={message.usage.output_tokens}")
    print(f"  → fonti correlate: {len(sources)}")
    print(f"  → fatto")
