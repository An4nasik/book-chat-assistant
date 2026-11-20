import { randomUUID } from 'node:crypto'

import { Router } from 'express'
import multer from 'multer'

import { answerQuestion, BadFileError, createBook, indexBook } from '../books/service.js'
import { appendChat, listBooks, loadBook, loadChat, saveBook } from '../books/store.js'

import type { Book, BookSummary, ChatMessage, Fragment } from '../types.js'

export const booksRouter = Router()

const upload = multer({ storage: multer.memoryStorage(), limits: { fileSize: 10 * 1024 * 1024 } })

function summary(book: Book): BookSummary {
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
    // Индексация идёт в фоне; ошибку записи пишем в лог, чтобы сервер не упал.
    indexBook(book).catch((error: Error) => console.error('Не удалось сохранить книгу:', error.message))
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

  // Соседей показываем только из той же главы, иначе текст попадёт под чужой заголовок.
  const sameChapter = (each: Fragment): boolean => each.chapter === fragment.chapter

  res.json({
    bookTitle: book.title,
    fragment,
    before: book.fragments.slice(Math.max(0, fragment.index - 2), fragment.index).filter(sameChapter),
    after: book.fragments.slice(fragment.index + 1, fragment.index + 3).filter(sameChapter),
  })
})

booksRouter.get('/:bookId/messages', async (req, res) => {
  const book = await loadBook(req.params.bookId)

  if (!book) {
    res.status(404).json({ error: 'Книга не найдена' })

    return
  }

  res.json(await loadChat(book.id))
})

booksRouter.post('/:bookId/messages', async (req, res) => {
  const body = req.body as { question?: string } | undefined
  const question = String(body?.question ?? '').trim()
  const book = await loadBook(req.params.bookId)

  if (!book) {
    res.status(404).json({ error: 'Книга не найдена' })

    return
  }

  if (!question) {
    res.status(400).json({ error: 'Пустой вопрос' })

    return
  }

  if (book.status === 'error') {
    res.status(409).json({ error: `Книгу не удалось проиндексировать: ${book.error}` })

    return
  }

  if (book.status === 'indexing') {
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
