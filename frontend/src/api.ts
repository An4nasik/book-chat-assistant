export type BookStatus = 'indexing' | 'ready' | 'error'

export interface BookSummary {
  id: string
  title: string
  format: 'txt' | 'fb2'
  status: BookStatus
  error?: string
  createdAt: string
  chapters: string[]
  fragmentsCount: number
}

export interface Fragment {
  id: string
  index: number
  chapter: string
  text: string
}

export interface FragmentContext {
  bookTitle: string
  fragment: Fragment
  before: Fragment[]
  after: Fragment[]
}

export interface Source {
  fragmentId: string
  chapter: string
  text: string
  relevance: number
}

export interface Message {
  id: string
  role: 'user' | 'assistant'
  text: string
  sources: Source[]
}

export interface AskResult {
  question: Message
  message: Message
}

// Главы с римским или арабским номером («IV», «2.») подписываем словом «Глава».
export function chapterTitle(chapter: string): string {
  return /^[IVXLC\d]+\.?$/.test(chapter) ? `Глава ${chapter}` : chapter
}

async function request<T>(url: string, init?: RequestInit): Promise<T> {
  const response = await fetch(url, init)
  let body: T & { error?: string }

  // Если сервер выключен, прокси Vite отвечает не JSON — показываем понятную ошибку.
  try {
    body = await response.json() as T & { error?: string }
  } catch {
    throw new Error('Сервер недоступен, попробуйте позже')
  }

  if (!response.ok) {
    throw new Error(body.error ?? `Ошибка ${response.status}`)
  }

  return body
}

export function listBooks(): Promise<BookSummary[]> {
  return request('/api/books')
}

export function getBook(bookId: string): Promise<BookSummary> {
  return request(`/api/books/${bookId}`)
}

export function uploadBook(file: File): Promise<BookSummary> {
  const form = new FormData()

  form.append('file', file)

  return request('/api/books', { method: 'POST', body: form })
}

export function getFragment(bookId: string, fragmentId: string): Promise<FragmentContext> {
  return request(`/api/books/${bookId}/fragments/${fragmentId}`)
}

export function getMessages(bookId: string): Promise<Message[]> {
  return request(`/api/books/${bookId}/messages`)
}

export function askQuestion(bookId: string, question: string): Promise<AskResult> {
  return request(`/api/books/${bookId}/messages`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ question }),
  })
}
