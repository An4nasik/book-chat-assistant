import { mkdtemp, rm, writeFile } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import path from 'node:path'

import request from 'supertest'

import { createApp } from './app'
import { config } from './config'
import { chat, embedQuery, embedTexts } from './llm/ollama'
import { saveVectors, searchVectors } from './search/vectors'

jest.mock('./llm/ollama')
jest.mock('./search/vectors')

const app = createApp()
const BOOK = 'I\nДоктор Старцев получил место земского врача в Дялиже.\nII\nКотик отказала Старцеву, потому что хотела учиться в консерватории.\n'

let dataDir = ''

beforeEach(async () => {
  dataDir = await mkdtemp(path.join(tmpdir(), 'book-chat-'))
  config.dataDir = dataDir
  jest.clearAllMocks()
  jest.mocked(embedTexts).mockImplementation(async (texts: string[]) => texts.map(() => [1, 0]))
  jest.mocked(saveVectors).mockResolvedValue()
  jest.mocked(embedQuery).mockResolvedValue([1, 0])
  jest.mocked(searchVectors).mockResolvedValue(['f1', 'f0'])
  jest.mocked(chat).mockResolvedValue('Она хотела учиться в консерватории [1]. Лишняя ссылка [7].')
})

afterEach(async () => {
  await rm(dataDir, { recursive: true, force: true })
})

async function uploadReadyBook(): Promise<string> {
  const response = await request(app).post('/api/books').attach('file', Buffer.from(BOOK), 'Ионыч.txt')

  expect(response.status).toBe(201)
  expect(response.body).toMatchObject({ title: 'Ионыч', format: 'txt', status: 'indexing', fragmentsCount: 2 })

  for (let attempt = 0; attempt < 50; attempt++) {
    const book = await request(app).get(`/api/books/${response.body.id}`)

    if (book.body.status === 'ready') {
      return response.body.id
    }

    await new Promise((resolve) => setTimeout(resolve, 20))
  }

  throw new Error('Книга не проиндексировалась')
}

test('GET /api/health отвечает ok', async () => {
  const response = await request(app).get('/api/health')

  expect(response.body).toEqual({ status: 'ok' })
})

test('основной сценарий: загрузка, индексация, вопрос с источниками, фрагмент, история', async () => {
  const bookId = await uploadReadyBook()
  const list = await request(app).get('/api/books')

  expect(list.body).toHaveLength(1)
  expect(list.body[0]).toMatchObject({ id: bookId, status: 'ready', chapters: ['I', 'II'] })

  const answer = await request(app).post(`/api/books/${bookId}/messages`).send({ question: ' Почему Котик отказала? ' })

  expect(answer.status).toBe(200)
  expect(answer.body.question.text).toBe('Почему Котик отказала?')
  expect(answer.body.message.text).toBe('Она хотела учиться в консерватории [1]. Лишняя ссылка.')
  expect(answer.body.message.sources).toEqual([
    { fragmentId: 'f1', chapter: 'II', text: 'Котик отказала Старцеву, потому что хотела учиться в консерватории.', relevance: 1 },
  ])
  expect(jest.mocked(chat).mock.calls[0][0][1].content).toContain('[1] (II)')

  const fragment = await request(app).get(`/api/books/${bookId}/fragments/f1`)

  expect(fragment.body.fragment.chapter).toBe('II')
  expect(fragment.body.bookTitle).toBe('Ионыч')

  const history = await request(app).get(`/api/books/${bookId}/messages`)

  expect(history.body.map((message: { role: string }) => message.role)).toEqual(['user', 'assistant'])
})

test('соседние фрагменты берутся только из той же главы', async () => {
  const paragraph = 'а'.repeat(400)
  const text = `I\n${paragraph}\n${paragraph}\n${paragraph}\nII\n${paragraph}\n`
  const upload = await request(app).post('/api/books').attach('file', Buffer.from(text), 'book.txt')
  const response = await request(app).get(`/api/books/${upload.body.id}/fragments/f2`)
  const ids = (list: { id: string }[]): string[] => list.map((each) => each.id)

  expect(response.body.fragment.chapter).toBe('I')
  expect(ids(response.body.before)).toEqual(['f0', 'f1'])
  expect(ids(response.body.after)).toEqual([])
  const firstOfChapterTwo = await request(app).get(`/api/books/${upload.body.id}/fragments/f3`)

  expect(ids(firstOfChapterTwo.body.before)).toEqual([])
})

test('ошибка индексации переводит книгу в статус error', async () => {
  jest.mocked(saveVectors).mockRejectedValue(new Error('Qdrant недоступен'))
  const response = await request(app).post('/api/books').attach('file', Buffer.from(BOOK), 'book.txt')

  await new Promise((resolve) => setTimeout(resolve, 50))
  const book = await request(app).get(`/api/books/${response.body.id}`)

  expect(book.body).toMatchObject({ status: 'error', error: 'Qdrant недоступен' })
  const question = await request(app).post(`/api/books/${response.body.id}/messages`).send({ question: 'Кто?' })

  expect(question.status).toBe(409)
  expect(question.body.error).toBe('Книгу не удалось проиндексировать: Qdrant недоступен')
})

test('пока книга индексируется, вопрос получает 409', async () => {
  jest.mocked(saveVectors).mockReturnValue(new Promise(() => undefined))
  const upload = await request(app).post('/api/books').attach('file', Buffer.from(BOOK), 'book.txt')
  const question = await request(app).post(`/api/books/${upload.body.id}/messages`).send({ question: 'Кто?' })

  expect(question.status).toBe(409)
  expect(question.body.error).toBe('Книга ещё не готова к вопросам')
})

test('неверные файлы отклоняются с понятной ошибкой', async () => {
  expect((await request(app).post('/api/books')).body).toEqual({ error: 'Файл не передан' })
  const pdf = await request(app).post('/api/books').attach('file', Buffer.from('%PDF'), 'book.pdf')

  expect(pdf.status).toBe(400)
  expect(pdf.body.error).toBe('Поддерживаются только файлы TXT и FB2')
  const empty = await request(app).post('/api/books').attach('file', Buffer.from('\n\n'), 'empty.txt')

  expect(empty.body.error).toBe('В файле не найден текст')
  const brokenFb2 = await request(app).post('/api/books').attach('file', Buffer.from('<html/>'), 'bad.fb2')

  expect(brokenFb2.body.error).toBe('Не удалось прочитать файл')
  const big = await request(app).post('/api/books').attach('file', Buffer.alloc(10 * 1024 * 1024 + 1, 'a'), 'big.txt')

  expect(big.status).toBe(400)
  expect(big.body.error).toBe('Файл больше 10 МБ')
})

test('id с выходом из папки data не читает чужие файлы', async () => {
  // Файл лежит в data/, а не в data/books/ — до него можно дойти только через «..».
  await writeFile(path.join(dataDir, 'secret.json'), '[{"leak":true}]')
  const response = await request(app).get('/api/books/..%2Fsecret/messages')

  expect(response.status).toBe(404)
  expect(response.body).toEqual({ error: 'Книга не найдена' })
})

test('несуществующая книга и фрагмент — 404, пустой вопрос — 400', async () => {
  expect((await request(app).get('/api/books/nope')).status).toBe(404)
  expect((await request(app).get('/api/books/nope/messages')).status).toBe(404)
  expect((await request(app).get('/api/books/../x')).status).toBe(404)
  expect((await request(app).get('/api/books/nope/fragments/f0')).status).toBe(404)
  expect((await request(app).post('/api/books/nope/messages').send({ question: 'Кто?' })).status).toBe(404)
  const bookId = await uploadReadyBook()

  expect((await request(app).get(`/api/books/${bookId}/fragments/f99`)).status).toBe(404)
  expect((await request(app).post(`/api/books/${bookId}/messages`).send({ question: '  ' })).status).toBe(400)
})

test('сбой модели во время ответа — 502, сервер продолжает работать', async () => {
  const bookId = await uploadReadyBook()

  jest.mocked(chat).mockRejectedValue(new Error('Ollama ответила 500: out of memory'))
  const response = await request(app).post(`/api/books/${bookId}/messages`).send({ question: 'Кто врач?' })

  expect(response.status).toBe(502)
  expect(response.body.error).toBe('Не удалось получить ответ: Ollama ответила 500: out of memory')
  expect((await request(app).get('/api/health')).status).toBe(200)
})

test('если поиск ничего не нашёл, модель не вызывается', async () => {
  const bookId = await uploadReadyBook()

  jest.mocked(searchVectors).mockResolvedValue([])
  const response = await request(app).post(`/api/books/${bookId}/messages`).send({ question: 'самолёт' })

  expect(response.body.message).toMatchObject({ text: 'В книге не нашлось ответа.', sources: [] })
  expect(chat).not.toHaveBeenCalled()
})
