import { useEffect, useState } from "react"
import type { Analysis, Source } from "../types"

const API_URL = "http://localhost:8002"

export default function AnalysisDetail({
  analysis,
  onBack,
  onSelectById
}: {
  analysis: Analysis
  onBack: () => void
  onSelectById: (id: number) => void
}) {
  const [sources, setSources] = useState<Source[]>([])
  const [generating, setGenerating] = useState<string | null>(null)
  const [streamingText, setStreamingText] = useState<string>("")
  const [isStreaming, setIsStreaming] = useState(false)

  useEffect(() => {
    fetch(`${API_URL}/analyses/${analysis.id}/sources`)
      .then(r => r.json())
      .then(setSources)
  }, [analysis.id])



const handleSourceClick = async (s: Source) => {
  if (s.internal_analysis_id) {
    onSelectById(s.internal_analysis_id)
    return
  }

  // Trova article_id
  const searchRes = await fetch(`${API_URL}/articles/by-link?link=${encodeURIComponent(s.link)}`)
  const articleData = await searchRes.json()

  if (!articleData?.id) return

  setGenerating(s.link)
  setIsStreaming(true)
  setStreamingText("")

  const response = await fetch(`${API_URL}/analyze/${articleData.id}/stream`, {
    method: "POST"
  })

  const reader = response.body!.getReader()
  const decoder = new TextDecoder()

  while (true) {
    const { done, value } = await reader.read()
    if (done) break

    const chunk = decoder.decode(value)
    const lines = chunk.split("\n")

    for (const line of lines) {
      if (!line.startsWith("data: ")) continue
      try {
        const data = JSON.parse(line.slice(6))
        if (data.type === "token") {
          //console.log("token:", data.text)
          setStreamingText(prev => prev + data.text)
        } else if (data.type === "done") {
          setIsStreaming(false)
          setGenerating(null)
          onSelectById(data.analysis_id)
        }
      } catch {}
    }
  }
}

  return (
    <div style={styles.container}>
      <button onClick={onBack} style={styles.back}>← Torna alla lista</button>

      {analysis.image && (
        <img src={analysis.image} alt={analysis.title} style={styles.heroImage}
          onError={(e) => (e.currentTarget.style.display = "none")} />
      )}

      <div style={styles.source}>{analysis.source}</div>
      <h1 style={styles.title}>{analysis.title}</h1>
      <div style={styles.date}>
        {new Date(analysis.published).toLocaleDateString("it-IT", {
          day: "numeric", month: "long", year: "numeric",
          hour: "2-digit", minute: "2-digit"
        })}
      </div>
      <a href={analysis.link} target="_blank" rel="noreferrer" style={styles.originalLink}>
        Leggi articolo originale →
      </a>

      <div style={styles.analysis}>
        {analysis.analysis_text.split("\n").map((line, i) => {
          if (line.startsWith("## ")) return <h2 key={i} style={styles.h2}>{line.replace("## ", "")}</h2>
          if (line.startsWith("# ")) return <h1 key={i} style={styles.h1}>{line.replace(/^# /, "")}</h1>
          if (line.startsWith("- ") || line.startsWith("* ")) return <li key={i} style={styles.li}>{line.replace(/^[-*] /, "")}</li>
          if (line.trim() === "") return <br key={i} />
          return <p key={i} style={styles.p}>{line}</p>
        })}
      </div>
        {isStreaming && (
        <div style={styles.streamBox}>
            <div style={styles.streamHeader}>⚡ Generando analisi...</div>
            <div style={styles.streamText}>{streamingText}</div>
        </div>
        )}
      {sources.length >= 2 && (
        <div style={styles.sourcesBox}>
          <h3 style={styles.sourcesTitle}>Analisi correlate</h3>
          {sources.map((s, i) => (
            <div key={i} style={styles.sourceRow}>
              <span style={styles.sourceTag}>{s.source}</span>
              {s.internal_analysis_id ? (
                    <span style={styles.sourceLinkInternal} onClick={() => handleSourceClick(s)}>
                        {s.title} →
                    </span>
                    ) : (
                    <span
                        style={{...styles.sourceText, cursor: "pointer", color: generating === s.link ? "#666" : "#888"}}
                        onClick={() => handleSourceClick(s)}
                    >
                        {generating === s.link ? "Generando analisi..." : s.title + " ⚡"}
                    </span>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  )
}

const styles: Record<string, React.CSSProperties> = {
  container: { maxWidth: "800px", margin: "0 auto" },
  back: { background: "none", border: "1px solid #333", color: "#aaa", padding: "8px 16px", borderRadius: "4px", cursor: "pointer", marginBottom: "24px" },
  heroImage: { width: "100%", height: "300px", objectFit: "cover", borderRadius: "8px", marginBottom: "20px" },
  source: { fontSize: "11px", color: "#4fc3f7", textTransform: "uppercase", marginBottom: "8px" },
  title: { fontSize: "24px", color: "#ffffff", lineHeight: 1.3, marginBottom: "12px" },
  date: { fontSize: "13px", color: "#666", marginBottom: "12px" },
  originalLink: { color: "#4fc3f7", fontSize: "13px", display: "block", marginBottom: "32px" },
  analysis: { color: "#cccccc", lineHeight: 1.7 },
  h1: { color: "#ffffff", fontSize: "20px", marginTop: "24px", marginBottom: "8px" },
  h2: { color: "#4fc3f7", fontSize: "16px", marginTop: "20px", marginBottom: "8px" },
  p: { marginBottom: "8px" },
  li: { marginLeft: "20px", marginBottom: "4px" },
  sourcesBox: { marginTop: "40px", borderTop: "1px solid #1a1a3e", paddingTop: "24px" },
  sourcesTitle: { color: "#4fc3f7", fontSize: "14px", marginBottom: "16px", textTransform: "uppercase" },
  sourceRow: { display: "flex", gap: "12px", alignItems: "baseline", marginBottom: "12px" },
  sourceTag: { fontSize: "10px", color: "#4fc3f7", textTransform: "uppercase", minWidth: "100px" },
  sourceLinkInternal: { fontSize: "14px", color: "#ffffff", lineHeight: 1.3, cursor: "pointer" },
  sourceText: { fontSize: "14px", color: "#555", lineHeight: 1.3 },
  streamBox: {
  marginTop: "32px",
  padding: "20px",
  backgroundColor: "#0d1117",
  borderRadius: "8px",
  border: "1px solid #4fc3f7"
},
streamHeader: {
  color: "#4fc3f7",
  fontSize: "12px",
  marginBottom: "12px",
  textTransform: "uppercase"
},
streamText: {
  color: "#cccccc",
  lineHeight: 1.7,
  whiteSpace: "pre-wrap",
  fontSize: "14px"
},
}
