import { randomUUID } from 'node:crypto'

import { Router } from 'express'
import multer from 'multer'

import { answerQuestion, BadFileError, createBook, indexBook } from '../books/service.js'
import { appendChat, listBooks, loadBook, loadChat, saveBook } from '../books/store.js'

import type { Book, ChatMessage } from '../types.js'

export const booksRouter = Router()

const upload = multer({ storage: multer.memoryStorage(), limits: { fileSize: 10 * 1024 * 1024 } })

function summary(book: Book): object {
  return {
    id: book.id,
    title: book.title,
    format: book.format,
    status: book.status,
    error: book.error,
    createdAt: book.createdAt,
    chapters: book.chapters,
    fragmentsCount: book.fragments.length,
  }
}

booksRouter.get('/', async (_req, res) => {
  const books = await listBooks()

  res.json(books.map(summary))
})

booksRouter.post('/', upload.single('file'), async (req, res) => {
  if (!req.file) {
    res.status(400).json({ error: 'Файл не передан' })

    return
  }

  try {
    // multer отдаёт имя файла в latin1, переводим в UTF-8, чтобы не ломалась кириллица.
    const fileName = Buffer.from(req.file.originalname, 'latin1').toString('utf8')
    const book = createBook(fileName, req.file.buffer)

    await saveBook(book)
    res.status(201).json(summary(book))
    void indexBook(book)
  } catch (error) {
    const message = error instanceof BadFileError ? error.message : 'Не удалось прочитать файл'

    res.status(400).json({ error: message })
  }
})

booksRouter.get('/:bookId', async (req, res) => {
  const book = await loadBook(req.params.bookId)

  if (!book) {
    res.status(404).json({ error: 'Книга не найдена' })

    return
  }

  res.json(summary(book))
})

booksRouter.get('/:bookId/fragments/:fragmentId', async (req, res) => {
  const book = await loadBook(req.params.bookId)
  const fragment = book?.fragments.find((each) => each.id === req.params.fragmentId)

  if (!book || !fragment) {
    res.status(404).json({ error: 'Фрагмент не найден' })

    return
  }

  res.json({
    bookTitle: book.title,
    fragment,
    before: book.fragments.slice(Math.max(0, fragment.index - 2), fragment.index),
    after: book.fragments.slice(fragment.index + 1, fragment.index + 3),
  })
})

booksRouter.get('/:bookId/messages', async (req, res) => {
  res.json(await loadChat(req.params.bookId))
})

booksRouter.post('/:bookId/messages', async (req, res) => {
  const question = String(req.body?.question ?? '').trim()
  const book = await loadBook(req.params.bookId)

  if (!book) {
    res.status(404).json({ error: 'Книга не найдена' })

    return
  }

  if (!question) {
    res.status(400).json({ error: 'Пустой вопрос' })

    return
  }

  if (book.status !== 'ready') {
    res.status(409).json({ error: 'Книга ещё не готова к вопросам' })

    return
  }

  try {
    const answer = await answerQuestion(book, question)
    const now = new Date().toISOString()
    const userMessage: ChatMessage = { id: randomUUID(), role: 'user', text: question, sources: [], createdAt: now }
    const assistantMessage: ChatMessage = { id: randomUUID(), role: 'assistant', text: answer.text, sources: answer.sources, createdAt: now }

    await appendChat(book.id, [userMessage, assistantMessage])
    res.json({ question: userMessage, message: assistantMessage })
  } catch (error) {
    const reason = error instanceof Error ? error.message : String(error)

    res.status(502).json({ error: `Не удалось получить ответ: ${reason}` })
  }
})
