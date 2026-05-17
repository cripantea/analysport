import { useState, useEffect } from "react"
import AnalysisList from "./components/AnalysisList"
import AnalysisDetail from "./components/AnalysisDetail"
import LeftSidebar from "./components/LeftSidebar"
import RightSidebar from "./components/RightSidebar"
import type { Analysis } from "./types"
import { API_URL } from "./config"

export default function App() {
  const [selected, setSelected] = useState<Analysis | null>(null)
  const [analyses, setAnalyses] = useState<Analysis[]>([])
  const [loading, setLoading] = useState(true)
  const [activeTag, setActiveTag] = useState<string | null>(null)
  const [activePeriod, setActivePeriod] = useState<string | null>(null)

  useEffect(() => {
    fetch(`${API_URL}/analyses`)
      .then(r => r.json())
      .then((data: Analysis[]) => {
        const seen = new Set<string>()
        const unique = data.filter(a => {
          if (seen.has(a.link)) return false
          seen.add(a.link)
          return true
        })
        setAnalyses(unique)
        setLoading(false)
      })
  }, [])

  const selectById = async (id: number) => {
    const res = await fetch(`${API_URL}/analyses/${id}`)
    const data = await res.json()
    setSelected(data)
  }

  const handleTagClick = (tag: string) => {
    setActiveTag(prev => prev === tag ? null : tag)
    setActivePeriod(null)
  }

  const handlePeriodClick = (period: string) => {
    setActivePeriod(prev => prev === period ? null : period)
    setActiveTag(null)
  }

  const resetAll = () => {
    setSelected(null)
    setActiveTag(null)
    setActivePeriod(null)
  }

  return (
    <div style={{ backgroundColor: "#0f0f1a", minHeight: "100vh", fontFamily: "system-ui, sans-serif" }}>
      <header style={headerStyle}>
        <div style={headerInner} onClick={resetAll}>
          <span style={logoStyle}>Analysport</span>
          <span style={subtitleStyle}>Analisi sportive con memoria storica</span>
        </div>
      </header>

      {selected ? (
        <div style={{ maxWidth: "860px", margin: "0 auto", padding: "32px 20px" }}>
          <AnalysisDetail
            analysis={selected}
            onBack={() => setSelected(null)}
            onSelectById={selectById}
          />
        </div>
      ) : (
        <div className="app-layout">
          <aside className="sidebar-left">
            <LeftSidebar
              analyses={analyses}
              activeTag={activeTag}
              activePeriod={activePeriod}
              onTagClick={handleTagClick}
              onPeriodClick={handlePeriodClick}
            />
          </aside>

          <main>
            <AnalysisList
              analyses={analyses}
              loading={loading}
              activeTag={activeTag}
              activePeriod={activePeriod}
              onSelect={setSelected}
            />
          </main>

          <aside className="sidebar-right">
            <RightSidebar analyses={analyses} onSelect={setSelected} />
          </aside>
        </div>
      )}
    </div>
  )
}

const headerStyle: React.CSSProperties = {
  backgroundColor: "#0a0a14",
  borderBottom: "1px solid #1a1a3e",
  padding: "14px 32px",
  position: "sticky",
  top: 0,
  zIndex: 10,
}

const headerInner: React.CSSProperties = {
  display: "flex",
  alignItems: "baseline",
  gap: "16px",
  cursor: "pointer",
  maxWidth: "1400px",
  margin: "0 auto",
}

const logoStyle: React.CSSProperties = {
  fontSize: "20px",
  fontWeight: 700,
  color: "#4fc3f7",
  letterSpacing: "0.02em",
}

const subtitleStyle: React.CSSProperties = {
  fontSize: "13px",
  color: "#444",
}
