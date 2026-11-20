export type BookStatus = 'indexing' | 'ready' | 'error'

export interface Paragraph {
  chapter: string
  text: string
}

export interface Fragment {
  id: string
  index: number
  chapter: string
  text: string
}

export interface Book {
  id: string
  title: string
  format: 'txt' | 'fb2'
  status: BookStatus
  error?: string
  createdAt: string
  chapters: string[]
  fragments: Fragment[]
}

export interface Source {
  fragmentId: string
  chapter: string
  text: string
  relevance: number
}

export interface ChatMessage {
  id: string
  role: 'user' | 'assistant'
  text: string
  sources: Source[]
  createdAt: string
}
