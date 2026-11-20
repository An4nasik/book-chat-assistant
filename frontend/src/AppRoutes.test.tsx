import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter } from 'react-router'

import { AppRoutes } from './AppRoutes'

function renderAt(path: string): void {
  render(
    <MemoryRouter initialEntries={[path]}>
      <AppRoutes />
    </MemoryRouter>,
  )
}

test('главная страница показывает загрузку книги', () => {
  renderAt('/')
  expect(screen.getByRole('heading', { name: 'Книги' })).toBeInTheDocument()
  expect(screen.getByRole('form', { name: 'Загрузка книги' })).toBeInTheDocument()
})

test('страница чата берёт bookId из адреса и показывает компоненты библиотеки', async () => {
  const user = userEvent.setup()

  renderAt('/books/abc')
  expect(screen.getByRole('heading', { name: 'Чат по книге abc' })).toBeInTheDocument()
  expect(screen.getByRole('complementary', { name: 'Панель источников' })).toBeInTheDocument()
  await user.type(screen.getByRole('textbox', { name: 'Сообщение' }), 'Кто герой?{Enter}')
  expect(screen.getByRole('log')).toHaveTextContent('Кто герой?')
})

test('страница фрагмента выделяет фрагмент из адреса', () => {
  renderAt('/books/abc/fragments/f7')
  expect(screen.getByRole('heading', { name: 'Фрагмент f7' })).toBeInTheDocument()
  expect(screen.getByRole('link', { name: '← К чату' })).toHaveAttribute('href', '/books/abc')
})

test('навигация ведёт на страницу о проекте, неизвестный адрес — на 404', async () => {
  const user = userEvent.setup()

  renderAt('/')
  await user.click(screen.getByRole('link', { name: 'О проекте' }))
  expect(screen.getByRole('heading', { name: 'О проекте' })).toBeInTheDocument()
  await user.click(screen.getByRole('link', { name: 'Книги' }))
  expect(screen.getByRole('heading', { name: 'Книги' })).toBeInTheDocument()
})

test('неизвестный адрес показывает 404', () => {
  renderAt('/nope')
  expect(screen.getByRole('heading', { name: 'Страница не найдена' })).toBeInTheDocument()
})
