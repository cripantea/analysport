import type { Analysis } from "../types"

interface Props {
  analyses: Analysis[]
  loading: boolean
  activeTag: string | null
  activePeriod: string | null
  onSelect: (a: Analysis) => void
}

const MONTHS_IT = [
  "Gennaio", "Febbraio", "Marzo", "Aprile", "Maggio", "Giugno",
  "Luglio", "Agosto", "Settembre", "Ottobre", "Novembre", "Dicembre",
]

function periodLabel(dateStr: string): string {
  const d = new Date(dateStr)
  if (isNaN(d.getTime())) return ""
  return `${MONTHS_IT[d.getMonth()]} ${d.getFullYear()}`
}

export default function AnalysisList({ analyses, loading, activeTag, activePeriod, onSelect }: Props) {
  if (loading) return <div style={styles.loading}>Caricamento...</div>

  let filtered = analyses
  if (activeTag) {
    filtered = filtered.filter(a => a.title.toLowerCase().includes(activeTag.toLowerCase()))
  }
  if (activePeriod) {
    filtered = filtered.filter(a => periodLabel(a.published) === activePeriod)
  }

  return (
    <div>
      {(activeTag || activePeriod) && (
        <div style={styles.filterBadge}>
          Filtro attivo: <strong style={{ color: "#fff" }}>{activeTag || activePeriod}</strong>
          {" — "}{filtered.length} risultat{filtered.length === 1 ? "o" : "i"}
        </div>
      )}
      <div style={styles.list}>
        {filtered.length === 0 ? (
          <div style={styles.empty}>Nessuna analisi trovata per questo filtro.</div>
        ) : (
          filtered.map(a => (
            <div
              key={a.id}
              className="analysis-card"
              style={styles.card}
              onClick={() => onSelect(a)}
            >
              {a.image && (
                <img
                  src={a.image}
                  alt={a.title}
                  style={styles.image}
                  onError={(e) => (e.currentTarget.style.display = "none")}
                />
              )}
              <div style={styles.cardBody}>
                <div style={styles.source}>{a.source}</div>
                <div style={styles.title}>{a.title}</div>
                <div style={styles.date}>
                  {new Date(a.published).toLocaleDateString("it-IT", {
                    day: "numeric", month: "long", year: "numeric",
                  })}
                </div>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  )
}

const styles: Record<string, React.CSSProperties> = {
  loading: { color: "#888", padding: "20px" },
  filterBadge: {
    color: "#888",
    fontSize: "13px",
    marginBottom: "16px",
    padding: "8px 12px",
    backgroundColor: "#0d1b2e",
    borderRadius: "6px",
    border: "1px solid #1a2e4a",
  },
  list: { display: "flex", flexDirection: "column", gap: "12px" },
  empty: { color: "#555", padding: "40px 20px", textAlign: "center" },
  card: {
    backgroundColor: "#16213e",
    border: "1px solid #0f3460",
    borderRadius: "8px",
    cursor: "pointer",
    overflow: "hidden",
    display: "flex",
    flexDirection: "row",
    transition: "border-color 0.2s",
  },
  image: { width: "160px", minWidth: "160px", height: "110px", objectFit: "cover" },
  cardBody: { padding: "16px", flex: 1, minWidth: 0 },
  source: { fontSize: "11px", color: "#4fc3f7", textTransform: "uppercase", marginBottom: "6px" },
  title: { fontSize: "15px", color: "#ffffff", lineHeight: 1.4, marginBottom: "8px" },
  date: { fontSize: "12px", color: "#666" },
}
