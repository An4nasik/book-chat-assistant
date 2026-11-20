import { chat, embedQuery, embedTexts } from './ollama'

interface FakeResponse {
  ok: boolean
  status?: number
  json?: () => Promise<object>
  text?: () => Promise<string>
}

interface SentBody {
  model: string
  input: string[]
  stream: boolean
  think: boolean
}

const fetchMock = jest.fn<Promise<FakeResponse>, [string, { body: string }]>()

beforeEach(() => {
  fetchMock.mockReset()
  global.fetch = fetchMock as unknown as typeof fetch
})

function ok(body: object): FakeResponse {
  return { ok: true, json: async () => body }
}

function sentBody(call: number): SentBody {
  return JSON.parse(fetchMock.mock.calls[call][1].body) as SentBody
}

test('embedTexts отправляет пачки по 32 текста и склеивает векторы', async () => {
  fetchMock.mockImplementation(async (_url: string, init: { body: string }) => {
    const { input } = JSON.parse(init.body) as { input: string[] }

    return ok({ embeddings: input.map(() => [1, 2]) })
  })

  const vectors = await embedTexts(Array.from({ length: 40 }, (_, i) => `текст ${i}`))

  expect(vectors).toHaveLength(40)
  expect(fetchMock).toHaveBeenCalledTimes(2)
  expect(fetchMock.mock.calls[0][0]).toBe('http://127.0.0.1:11434/api/embed')
})

test('embedQuery добавляет инструкцию к вопросу', async () => {
  fetchMock.mockResolvedValue(ok({ embeddings: [[0.5]] }))

  expect(await embedQuery('Кто врач?')).toEqual([0.5])
  expect(sentBody(0).input[0]).toMatch(/^Instruct: .*\nQuery: Кто врач\?$/)
})

test('chat выключает режим размышлений и возвращает текст ответа', async () => {
  fetchMock.mockResolvedValue(ok({ message: { content: '  Ответ [1]  ' } }))

  expect(await chat([{ role: 'user', content: 'Вопрос' }])).toBe('Ответ [1]')
  expect(sentBody(0)).toMatchObject({ model: 'qwen3:4b-instruct', stream: false, think: false })
})

test('рассуждения модели до </think> отрезаются', async () => {
  fetchMock.mockResolvedValue(ok({ message: { content: 'Думаю [3] [4]...\n</think>\n\nОтвет [1]' } }))

  expect(await chat([])).toBe('Ответ [1]')
})

test('ошибка Ollama превращается в исключение с кодом ответа', async () => {
  fetchMock.mockResolvedValue({ ok: false, status: 404, text: async () => 'model not found' })

  await expect(chat([])).rejects.toThrow('Ollama ответила 404: model not found')
})
