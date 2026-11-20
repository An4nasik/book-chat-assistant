import type { ReactElement } from 'react'

export function AboutPage(): ReactElement {
  return (
    <section className="page">
      <h1>О проекте</h1>
      <p>
        Чат-ассистент отвечает на вопросы по загруженной книге. Сервер на Node.js делит текст на фрагменты,
        ищет подходящие фрагменты гибридным поиском (векторный поиск в Qdrant и BM25) и передаёт их локальной
        языковой модели в Ollama. В ответе есть ссылки на фрагменты, по ним открывается текст книги.
      </p>
    </section>
  )
}
