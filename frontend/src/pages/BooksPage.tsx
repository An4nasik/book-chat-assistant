import { useState } from 'react'
import type { ReactElement } from 'react'

import { BookUploadForm } from '@book-chat/ui-library'

export function BooksPage(): ReactElement {
  const [fileName, setFileName] = useState<string>('')

  return (
    <section className="page">
      <h1>Книги</h1>
      <p className="page-note">Загрузите книгу в формате TXT или FB2, чтобы задавать по ней вопросы.</p>
      <BookUploadForm onUpload={(file: File): void => setFileName(file.name)} />
      {fileName && <p className="page-note">Выбран файл: {fileName}. Импорт подключается в MVP.</p>}
      <div className="stub">
        Здесь будет список загруженных книг: название, формат, число фрагментов и статус индексации
        («индексируется», «готова», «ошибка»). Готовая книга открывается ссылкой на страницу чата.
      </div>
    </section>
  )
}
