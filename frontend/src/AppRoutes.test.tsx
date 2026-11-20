import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter } from 'react-router'

import { AppRoutes } from './AppRoutes'

type Handler = (url: string, init?: RequestInit) => { status?: number, body: unknown }

interface FakeResponse {
  ok: boolean
  status: number
  json: () => Promise<unknown>
}

const fetchMock = jest.fn<Promise<FakeResponse>, [string, RequestInit?]>()

function postBody(): BodyInit | null | undefined {
  return fetchMock.mock.calls.find((call) => call[1]?.method === 'POST')?.[1]?.body
}

function mockApi(handler: Handler): void {
  fetchMock.mockImplementation(async (url: string, init?: RequestInit) => {
    const { status = 200, body } = handler(url, init)

    return { ok: status < 400, status, json: async () => body }
  })
}

function renderAt(path: string): void {
  render(
    <MemoryRouter initialEntries={[path]}>
      <AppRoutes />
    </MemoryRouter>,
  )
}

const readyBook = { id: 'b1', title: 'Ионыч', format: 'txt', status: 'ready', createdAt: '', chapters: ['I'], fragmentsCount: 42 }
const source = { fragmentId: 'f15', chapter: 'II', text: 'Котик отказала.', relevance: 0.95 }

beforeEach(() => {
  fetchMock.mockReset()
  global.fetch = fetchMock as unknown as typeof fetch
})

test('главная: список книг со статусами, ссылка только у готовой', async () => {
  mockApi(() => ({ body: [readyBook, { ...readyBook, id: 'b2', title: 'Вторая', status: 'error', error: 'Qdrant недоступен' }] }))
  renderAt('/')
  expect(await screen.findByRole('link', { name: 'Ионыч' })).toHaveAttribute('href', '/books/b1')
  expect(screen.getByText('Готова')).toBeInTheDocument()
  expect(screen.getByText('Qdrant недоступен')).toBeInTheDocument()
  expect(screen.queryByRole('link', { name: 'Вторая' })).not.toBeInTheDocument()
  expect(screen.getAllByText('TXT, фрагментов: 42')).toHaveLength(2)
})

test('главная: загрузка файла отправляет форму и обновляет список, пока книга индексируется', async () => {
  jest.useFakeTimers()
  const user = userEvent.setup({ advanceTimers: jest.advanceTimersByTime })
  let books: object[] = []

  mockApi((url, init) => {
    if (init?.method === 'POST') {
      books = [{ ...readyBook, status: 'indexing' }]

      return { status: 201, body: books[0] }
    }

    return { body: books }
  })
  renderAt('/')
  expect(await screen.findByText('Пока нет загруженных книг.')).toBeInTheDocument()
  await user.upload(screen.getByLabelText('Файл книги (TXT или FB2, до 10 МБ)'), new File(['I'], 'ionych.txt'))
  await user.click(screen.getByRole('button', { name: 'Загрузить' }))
  expect(await screen.findByText('Индексируется…')).toBeInTheDocument()
  expect(postBody()).toBeInstanceOf(FormData)
  books = [readyBook]
  jest.advanceTimersByTime(2100)
  expect(await screen.findByText('Готова')).toBeInTheDocument()
  jest.useRealTimers()
})

test('главная: ошибка загрузки показывается в форме', async () => {
  // В диалоге можно выбрать «Все файлы», поэтому проверку формата делает сервер.
  const user = userEvent.setup({ applyAccept: false })

  mockApi((_url, init) => init?.method === 'POST'
    ? { status: 400, body: { error: 'Поддерживаются только файлы TXT и FB2' } }
    : { body: [] })
  renderAt('/')
  await user.upload(screen.getByLabelText('Файл книги (TXT или FB2, до 10 МБ)'), new File(['x'], 'book.pdf'))
  await user.click(screen.getByRole('button', { name: 'Загрузить' }))
  expect(await screen.findByRole('alert')).toHaveTextContent('Поддерживаются только файлы TXT и FB2')
})

test('чат: история, вопрос, ответ с источниками и переход к фрагменту', async () => {
  const user = userEvent.setup()

  mockApi((url, init) => {
    if (url.endsWith('/messages') && init?.method === 'POST') {
      return {
        body: {
          question: { id: 'q2', role: 'user', text: 'Почему?', sources: [] },
          message: { id: 'a2', role: 'assistant', text: 'Хотела учиться [1].', sources: [source] },
        },
      }
    }

    if (url.endsWith('/messages')) {
      return { body: [{ id: 'q1', role: 'user', text: 'Кто врач?', sources: [] }] }
    }

    if (url.includes('/fragments/')) {
      return { body: { bookTitle: 'Ионыч', fragment: { id: 'f15', index: 15, chapter: 'II', text: 'Котик отказала.' }, before: [], after: [] } }
    }

    return { body: readyBook }
  })
  renderAt('/books/b1')
  expect(await screen.findByRole('heading', { name: 'Ионыч' })).toBeInTheDocument()
  expect(screen.getByRole('log')).toHaveTextContent('Кто врач?')
  await user.type(screen.getByRole('textbox', { name: 'Сообщение' }), 'Почему?{Enter}')
  expect(await screen.findByText('Хотела учиться [1].')).toBeInTheDocument()
  expect(screen.getByText('Глава II')).toBeInTheDocument()
  expect(JSON.parse(String(postBody()))).toEqual({ question: 'Почему?' })
  await user.click(screen.getByRole('link', { name: 'Открыть фрагмент: Глава II' }))
  expect(await screen.findByText('Котик отказала.')).toBeInTheDocument()
  expect(screen.getByRole('link', { name: '← К чату' })).toHaveAttribute('href', '/books/b1')
})

test('чат: книга не готова и ошибка ответа видны пользователю', async () => {
  const user = userEvent.setup()

  mockApi((url, init) => {
    if (url.endsWith('/messages') && init?.method === 'POST') {
      return { status: 409, body: { error: 'Книга ещё не готова к вопросам' } }
    }

    return url.endsWith('/messages') ? { body: [] } : { body: { ...readyBook, status: 'indexing' } }
  })
  renderAt('/books/b1')
  expect(await screen.findByText('Книга ещё индексируется. Обновите страницу через несколько секунд.')).toBeInTheDocument()
  await user.type(screen.getByRole('textbox', { name: 'Сообщение' }), 'Кто?{Enter}')
  expect(await screen.findByRole('alert')).toHaveTextContent('Книга ещё не готова к вопросам')
  await waitFor(() => expect(screen.getByRole('textbox')).toBeEnabled())
})

test('чат: ошибка индексации книги видна сразу', async () => {
  mockApi((url) => url.endsWith('/messages')
    ? { body: [] }
    : { body: { ...readyBook, status: 'error', error: 'Qdrant недоступен' } })
  renderAt('/books/b1')
  expect(await screen.findByText('Книгу не удалось проиндексировать: Qdrant недоступен')).toBeInTheDocument()
})

test('сервер выключен: вместо технической ошибки понятный текст', async () => {
  fetchMock.mockResolvedValue({ ok: false, status: 500, json: async () => JSON.parse('') })
  renderAt('/')
  expect(await screen.findByRole('alert')).toHaveTextContent('Сервер недоступен, попробуйте позже')
})

test('фрагмент: соседние фрагменты и выделение нужного; ошибка 404', async () => {
  mockApi((url) => url.includes('f99')
    ? { status: 404, body: { error: 'Фрагмент не найден' } }
    : {
      body: {
        bookTitle: 'Ионыч',
        fragment: { id: 'f1', index: 1, chapter: 'Эпилог', text: 'Нужный.' },
        before: [{ id: 'f0', index: 0, chapter: 'Эпилог', text: 'До.' }],
        after: [{ id: 'f2', index: 2, chapter: 'Эпилог', text: 'После.' }],
      },
    })
  renderAt('/books/b1/fragments/f1')
  expect(await screen.findByRole('heading', { name: 'Эпилог' })).toBeInTheDocument()
  expect(screen.getByText('Нужный.').parentElement).toHaveAttribute('aria-current', 'true')
  expect(screen.getByText('До.')).toBeInTheDocument()
  expect(screen.getByText('После.')).toBeInTheDocument()
})

test('фрагмент: несуществующий показывает ошибку', async () => {
  mockApi(() => ({ status: 404, body: { error: 'Фрагмент не найден' } }))
  renderAt('/books/b1/fragments/f99')
  expect(await screen.findByRole('alert')).toHaveTextContent('Фрагмент не найден')
})

test('навигация и 404', async () => {
  const user = userEvent.setup()

  mockApi(() => ({ body: [] }))
  renderAt('/')
  await user.click(screen.getByRole('link', { name: 'О проекте' }))
  expect(screen.getByRole('heading', { name: 'О проекте' })).toBeInTheDocument()
  await user.click(screen.getByRole('link', { name: 'Книги' }))
  expect(await screen.findByRole('heading', { name: 'Книги' })).toBeInTheDocument()
})

test('неизвестный адрес показывает 404', () => {
  renderAt('/nope')
  expect(screen.getByRole('heading', { name: 'Страница не найдена' })).toBeInTheDocument()
})
