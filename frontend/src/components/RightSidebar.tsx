import type { Analysis } from "../types"

interface Props {
  analyses: Analysis[]
  onSelect: (a: Analysis) => void
}

export default function RightSidebar({ analyses, onSelect }: Props) {
  const featured = analyses.filter(a => a.image).slice(0, 5)

  if (featured.length === 0) return null

  return (
    <div style={styles.container}>
      <div style={styles.sectionTitle}>In evidenza</div>
      <div style={styles.list}>
        {featured.map(a => (
          <div
            key={a.id}
            className="featured-card"
            style={styles.card}
            onClick={() => onSelect(a)}
          >
            <img
              src={a.image}
              alt={a.title}
              style={styles.image}
              onError={(e) => (e.currentTarget.style.display = "none")}
            />
            <div style={styles.cardBody}>
              <div style={styles.source}>{a.source}</div>
              <div style={styles.title}>{a.title}</div>
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}

const styles: Record<string, React.CSSProperties> = {
  container: { position: "sticky", top: "80px" },
  sectionTitle: {
    fontSize: "10px",
    color: "#4fc3f7",
    textTransform: "uppercase",
    letterSpacing: "0.1em",
    marginBottom: "16px",
    fontWeight: 600,
  },
  list: { display: "flex", flexDirection: "column", gap: "14px" },
  card: {
    cursor: "pointer",
    borderRadius: "6px",
    overflow: "hidden",
    border: "1px solid #0f3460",
    backgroundColor: "#16213e",
    transition: "border-color 0.2s",
  },
  image: { width: "100%", height: "120px", objectFit: "cover", display: "block" },
  cardBody: { padding: "10px 12px" },
  source: {
    fontSize: "10px",
    color: "#4fc3f7",
    textTransform: "uppercase",
    marginBottom: "5px",
  },
  title: { fontSize: "13px", color: "#ddd", lineHeight: 1.4 },
}
