export interface Analysis {
  id: number
  title: string
  source: string
  link: string
  published: string
  analysis_text: string
  analyzed_at: string
  image?: string
  views?: number
  sources_count?: number
}

export interface Source {
  title: string
  source: string
  link: string
  published: string
  internal_analysis_id: number | null
}
