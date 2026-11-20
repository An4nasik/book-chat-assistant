import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'

import { BookUploadForm } from './BookUploadForm'

test('кнопка активна только после выбора файла и передаёт файл', async () => {
  const onUpload = jest.fn()
  const user = userEvent.setup()
  const file = new File(['Глава 1'], 'book.txt', { type: 'text/plain' })

  render(<BookUploadForm onUpload={onUpload} />)
  expect(screen.getByRole('button', { name: 'Загрузить' })).toBeDisabled()
  await user.upload(screen.getByLabelText('Файл книги (TXT или FB2, до 10 МБ)'), file)
  await user.click(screen.getByRole('button', { name: 'Загрузить' }))
  expect(onUpload).toHaveBeenCalledWith(file)
  expect(screen.getByRole('button', { name: 'Загрузить' })).toBeDisabled()
})

test('во время загрузки форма заблокирована, ошибка видна', () => {
  render(<BookUploadForm onUpload={jest.fn()} isUploading error="Поддерживаются только TXT и FB2" />)
  expect(screen.getByRole('button', { name: 'Загрузка…' })).toBeDisabled()
  expect(screen.getByRole('alert')).toHaveTextContent('Поддерживаются только TXT и FB2')
})
