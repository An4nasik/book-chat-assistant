import { useEffect, useState } from 'react'
import type { ReactElement } from 'react'

import { BookUploadForm } from '@book-chat/ui-library'
import { Link } from 'react-router'

import { listBooks, uploadBook } from '../api'

import type { BookStatus, BookSummary } from '../api'

const STATUS_TEXT: Record<BookStatus, string> = {
  indexing: 'Индексируется…',
  ready: 'Готова',
  error: 'Ошибка',
}

export function BooksPage(): ReactElement {
  const [books, setBooks] = useState<BookSummary[]>([])
  const [isUploading, setIsUploading] = useState<boolean>(false)
  const [error, setError] = useState<string>('')
  const hasIndexing = books.some((book: BookSummary) => book.status === 'indexing')

  function refresh(): void {
    listBooks()
      .then(setBooks)
      .catch((reason: Error) => setError(reason.message))
  }

  useEffect(refresh, [])

  // Пока какая-то книга индексируется, обновляем список раз в 2 секунды.
  useEffect(() => {
    if (!hasIndexing) {
      return
    }

    const timer = setInterval(refresh, 2000)

    return (): void => clearInterval(timer)
  }, [hasIndexing])

  async function handleUpload(file: File): Promise<void> {
    setIsUploading(true)
    setError('')

    try {
      await uploadBook(file)
      setBooks(await listBooks())
    } catch (reason) {
      setError((reason as Error).message)
    } finally {
      setIsUploading(false)
    }
  }

  return (
    <section className="page">
      <h1>Книги</h1>
      <p className="page-note">Загрузите книгу в формате TXT или FB2, чтобы задавать по ней вопросы.</p>
      <BookUploadForm onUpload={(file: File): void => void handleUpload(file)} isUploading={isUploading} error={error} />
      {books.length === 0 ? (
        <p className="stub">Пока нет загруженных книг.</p>
      ) : (
        <ul className="book-list" aria-label="Загруженные книги">
          {books.map((book: BookSummary) => (
            <li className="book-card" key={book.id}>
              <div>
                {book.status === 'ready' ? <Link to={`/books/${book.id}`}>{book.title}</Link> : <strong>{book.title}</strong>}
                <div className="page-note">{book.format.toUpperCase()}, фрагментов: {book.fragmentsCount}</div>
                {book.error && <div className="error">{book.error}</div>}
              </div>
              <span className={book.status === 'error' ? 'book-status book-status--error' : 'book-status'}>
                {STATUS_TEXT[book.status]}
              </span>
            </li>
          ))}
        </ul>
      )}
    </section>
  )
}
