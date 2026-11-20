import { Router } from 'express'

export const booksRouter = Router()

// Каркас lab5: маршруты из architecture.md есть, реализация появится в MVP (lab6).

booksRouter.get('/', (_req, res) => {
  res.json([])
})

booksRouter.post('/', (_req, res) => {
  res.status(501).json({ error: 'Импорт книг появится в MVP' })
})

booksRouter.get('/:bookId', (_req, res) => {
  res.status(404).json({ error: 'Книга не найдена' })
})

booksRouter.get('/:bookId/fragments/:fragmentId', (_req, res) => {
  res.status(404).json({ error: 'Фрагмент не найден' })
})

booksRouter.get('/:bookId/messages', (_req, res) => {
  res.json([])
})

booksRouter.post('/:bookId/messages', (_req, res) => {
  res.status(501).json({ error: 'Ответы появятся в MVP' })
})
