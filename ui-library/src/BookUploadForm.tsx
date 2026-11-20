import { useState } from 'react'
import type { FormEvent, ReactElement } from 'react'

export interface BookUploadFormProps {
  onUpload: (file: File) => void
  isUploading?: boolean
  error?: string
}

export function BookUploadForm({ onUpload, isUploading = false, error }: BookUploadFormProps): ReactElement {
  const [file, setFile] = useState<File | null>(null)

  function handleSubmit(event: FormEvent<HTMLFormElement>): void {
    event.preventDefault()

    if (file) {
      onUpload(file)
    }
  }

  return (
    <form className="upload-form" onSubmit={handleSubmit} aria-label="Загрузка книги">
      <label className="upload-label">
        <span>Файл книги (TXT или FB2, до 10 МБ)</span>
        <input
          className="upload-input"
          type="file"
          accept=".txt,.fb2"
          disabled={isUploading}
          onChange={(event): void => setFile(event.target.files?.[0] ?? null)}
        />
      </label>
      <button className="upload-button" type="submit" disabled={!file || isUploading}>
        {isUploading ? 'Загрузка…' : 'Загрузить'}
      </button>
      {error && <p className="upload-error" role="alert">{error}</p>}
    </form>
  )
}
