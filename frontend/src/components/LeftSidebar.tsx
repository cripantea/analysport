import type { Analysis } from "../types"

interface Props {
  analyses: Analysis[]
  activeTag: string | null
  activePeriod: string | null
  onTagClick: (tag: string) => void
  onPeriodClick: (period: string) => void
}

const STOP_WORDS = new Set([
  "della", "dello", "delle", "degli", "nella", "nello", "nelle", "negli",
  "sulla", "sullo", "sulle", "sugli", "dalla", "dallo", "dalle", "dagli",
  "alla", "allo", "alle", "agli", "con", "per", "che", "non", "sono",
  "come", "dopo", "dove", "quando", "questa", "questo", "questi", "queste",
  "anche", "ancora", "sempre", "tutto", "tutti", "tutte", "ogni", "solo",
  "stato", "stati", "stata", "state", "viene", "verso", "dall", "nell",
  "sull", "del", "dei", "nel", "sul", "dal", "tra", "euro", "coppa",
  "fase", "gruppo", "match", "news", "goal", "gara", "anno", "primo",
  "prima", "secondo", "terzo", "terza", "quale", "quali", "quella", "quello",
  "quelli", "quelle", "over", "under", "head", "more", "best", "most",
  "first", "last", "next", "from", "with", "that", "this", "have", "will",
  "what", "when", "were", "they", "their", "been", "into", "about",
  "partita", "stagione", "campionato", "finale", "semifinale", "giocatore",
])

const MONTHS_IT = [
  "Gennaio", "Febbraio", "Marzo", "Aprile", "Maggio", "Giugno",
  "Luglio", "Agosto", "Settembre", "Ottobre", "Novembre", "Dicembre",
]

function extractTags(analyses: Analysis[]): { tag: string; count: number }[] {
  const freq: Record<string, number> = {}
  for (const a of analyses) {
    const words = a.title.split(/[\s\-–—:,.()\[\]]+/)
    for (const word of words) {
      const clean = word.replace(/[^a-zA-ZÀ-ÿ]/g, "").toLowerCase()
      if (clean.length < 4) continue
      if (STOP_WORDS.has(clean)) continue
      freq[clean] = (freq[clean] || 0) + 1
    }
  }
  return Object.entries(freq)
    .filter(([, c]) => c >= 2)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 28)
    .map(([tag, count]) => ({ tag, count }))
}

function extractPeriods(analyses: Analysis[]): { period: string; sortKey: string; count: number }[] {
  const freq: Record<string, { display: string; count: number }> = {}
  for (const a of analyses) {
    const d = new Date(a.published)
    if (isNaN(d.getTime())) continue
    const sortKey = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`
    const display = `${MONTHS_IT[d.getMonth()]} ${d.getFullYear()}`
    if (!freq[sortKey]) freq[sortKey] = { display, count: 0 }
    freq[sortKey].count++
  }
  return Object.entries(freq)
    .sort(([a], [b]) => b.localeCompare(a))
    .map(([sortKey, { display, count }]) => ({ period: display, sortKey, count }))
}

export default function LeftSidebar({ analyses, activeTag, activePeriod, onTagClick, onPeriodClick }: Props) {
  const tags = extractTags(analyses)
  const periods = extractPeriods(analyses)

  return (
    <div style={styles.container}>
      {tags.length > 0 && (
        <div style={styles.section}>
          <div style={styles.sectionTitle}>Argomenti</div>
          <div style={styles.tagList}>
            {tags.map(({ tag, count }) => (
              <button
                key={tag}
                className="sidebar-tag"
                style={{
                  ...styles.tag,
                  ...(activeTag === tag ? styles.tagActive : {}),
                }}
                onClick={() => onTagClick(tag)}
                title={`${count} analisi`}
              >
                {tag}
              </button>
            ))}
          </div>
        </div>
      )}

      {periods.length > 0 && (
        <div style={styles.section}>
          <div style={styles.sectionTitle}>Periodo</div>
          <div style={styles.periodList}>
            {periods.map(({ period, count }) => (
              <button
                key={period}
                className="sidebar-period"
                style={{
                  ...styles.periodItem,
                  ...(activePeriod === period ? styles.periodActive : {}),
                }}
                onClick={() => onPeriodClick(period)}
              >
                <span>{period}</span>
                <span style={styles.periodCount}>{count}</span>
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}

const styles: Record<string, React.CSSProperties> = {
  container: { position: "sticky", top: "80px" },
  section: { marginBottom: "28px" },
  sectionTitle: {
    fontSize: "10px",
    color: "#4fc3f7",
    textTransform: "uppercase",
    letterSpacing: "0.1em",
    marginBottom: "12px",
    fontWeight: 600,
  },
  tagList: { display: "flex", flexWrap: "wrap", gap: "6px" },
  tag: {
    background: "none",
    border: "1px solid #1a2a40",
    color: "#888",
    fontSize: "12px",
    padding: "4px 10px",
    borderRadius: "20px",
    cursor: "pointer",
    transition: "all 0.15s",
    fontFamily: "inherit",
  },
  tagActive: {
    backgroundColor: "#4fc3f7",
    borderColor: "#4fc3f7",
    color: "#000",
  },
  periodList: { display: "flex", flexDirection: "column", gap: "2px" },
  periodItem: {
    background: "none",
    border: "none",
    color: "#777",
    fontSize: "13px",
    padding: "7px 8px",
    cursor: "pointer",
    display: "flex",
    justifyContent: "space-between",
    alignItems: "center",
    borderRadius: "4px",
    width: "100%",
    fontFamily: "inherit",
    transition: "all 0.15s",
  },
  periodActive: {
    backgroundColor: "#0d1b2e",
    color: "#4fc3f7",
  },
  periodCount: {
    fontSize: "11px",
    color: "#444",
    backgroundColor: "#16213e",
    padding: "2px 7px",
    borderRadius: "10px",
    minWidth: "24px",
    textAlign: "center",
  },
}
