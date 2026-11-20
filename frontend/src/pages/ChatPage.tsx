import { useEffect, useState } from 'react'
import type { ReactElement } from 'react'

import { ChatWindow, SourcesPanel } from '@book-chat/ui-library'
import { useNavigate, useParams } from 'react-router'

import { askQuestion, chapterTitle, getBook, getMessages } from '../api'

import type { BookSummary, Message, Source } from '../api'
import type { SourceFragment } from '@book-chat/ui-library'

function toPanelSources(bookId: string, sources: Source[]): SourceFragment[] {
  return sources.map((source: Source) => ({
    id: source.fragmentId,
    title: chapterTitle(source.chapter),
    excerpt: source.text.length > 300 ? `${source.text.slice(0, 300)}…` : source.text,
    relevance: source.relevance,
    url: `/books/${bookId}/fragments/${source.fragmentId}`,
  }))
}

export function ChatPage(): ReactElement {
  const { bookId = '' } = useParams()
  const navigate = useNavigate()
  const [book, setBook] = useState<BookSummary | null>(null)
  const [messages, setMessages] = useState<Message[]>([])
  const [isTyping, setIsTyping] = useState<boolean>(false)
  const [error, setError] = useState<string>('')
  const lastAnswer = [...messages].reverse().find((message: Message) => message.role === 'assistant')

  useEffect(() => {
    Promise.all([getBook(bookId), getMessages(bookId)])
      .then(([loadedBook, history]) => {
        setBook(loadedBook)
        setMessages(history)
      })
      .catch((reason: Error) => setError(reason.message))
  }, [bookId])

  async function handleSend(text: string): Promise<void> {
    const pending: Message = { id: `pending-${Date.now()}`, role: 'user', text, sources: [] }

    setMessages((current: Message[]) => [...current, pending])
    setIsTyping(true)
    setError('')

    try {
      const result = await askQuestion(bookId, text)

      setMessages((current: Message[]) => [...current.filter((message: Message) => message.id !== pending.id), result.question, result.message])
    } catch (reason) {
      setError((reason as Error).message)
    } finally {
      setIsTyping(false)
    }
  }

  return (
    <section className="page">
      <h1>{book ? book.title : 'Книга'}</h1>
      {book?.status === 'indexing' && <p className="error">Книга ещё индексируется. Обновите страницу через несколько секунд.</p>}
      {book?.status === 'error' && <p className="error">Книгу не удалось проиндексировать: {book.error}</p>}
      {error && <p className="error" role="alert">{error}</p>}
      <div className="chat-layout">
        <ChatWindow messages={messages} onSend={(text: string): void => void handleSend(text)} isTyping={isTyping} />
        <SourcesPanel
          sources={toPanelSources(bookId, lastAnswer?.sources ?? [])}
          onOpen={(source: SourceFragment): void => {
            void navigate(source.url)
          }}
        />
      </div>
    </section>
  )
}
