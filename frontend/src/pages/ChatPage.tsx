import { useState } from 'react'
import type { ReactElement } from 'react'

import { ChatWindow, SourcesPanel } from '@book-chat/ui-library'
import { useParams } from 'react-router'

import type { ChatMessage } from '@book-chat/ui-library'

export function ChatPage(): ReactElement {
  const { bookId = '' } = useParams()
  const [messages, setMessages] = useState<ChatMessage[]>([])

  function handleSend(text: string): void {
    setMessages([
      ...messages,
      { id: `${messages.length}-q`, role: 'user', text },
      { id: `${messages.length}-a`, role: 'assistant', text: 'Ответ по книге появится после подключения сервера.' },
    ])
  }

  return (
    <section className="page">
      <h1>Чат по книге {bookId}</h1>
      <div className="chat-layout">
        <ChatWindow messages={messages} onSend={handleSend} />
        <SourcesPanel sources={[]} />
      </div>
    </section>
  )
}
