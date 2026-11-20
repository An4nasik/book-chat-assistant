import { fireEvent, render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'

import { SourcesPanel } from './SourcesPanel'

const source = { id: 'f1', title: 'Глава I', excerpt: 'Когда в губернском городе С. приезжие жаловались…', relevance: 0.92, url: '/books/b1/fragments/f1' }

test('показывает номер, главу, фрагмент, процент и ссылку', async () => {
  const user = userEvent.setup()

  render(<SourcesPanel sources={[source]} />)
  expect(screen.getByText('Источник [1]')).toBeInTheDocument()
  expect(screen.getByText('Когда в губернском городе С. приезжие жаловались…')).toBeInTheDocument()
  expect(screen.getByText('92%')).toBeInTheDocument()
  const link = screen.getByRole('link', { name: 'Открыть фрагмент: Глава I' })

  expect(link).toHaveAttribute('href', '/books/b1/fragments/f1')
  await user.tab()
  expect(link).toHaveFocus()
  link.addEventListener('click', (event: Event) => {
    expect(event.defaultPrevented).toBe(false)
    event.preventDefault()
  })
  await user.click(link)
})

test('пустой список показывает подсказку вместо ссылок', () => {
  render(<SourcesPanel sources={[]} />)
  expect(screen.getByText('Пока нет фрагментов. Задайте вопрос по книге.')).toBeInTheDocument()
  expect(screen.getByLabelText('Найдено источников: 0')).toHaveTextContent('0')
  expect(screen.queryByRole('link')).not.toBeInTheDocument()
})

test('новые данные заменяют источники, проценты округляются', () => {
  const { rerender } = render(<SourcesPanel sources={[{ ...source, id: 'a', title: 'Первая', relevance: 0 }]} />)

  expect(screen.getByLabelText('Релевантность: 0%')).toBeInTheDocument()
  rerender(<SourcesPanel sources={[
    { ...source, id: 'b', title: 'Вторая', relevance: 0.666 },
    { ...source, id: 'c', title: 'Третья', relevance: 1 },
  ]} />)
  expect(screen.queryByText('Первая')).not.toBeInTheDocument()
  expect(screen.getByLabelText('Найдено источников: 2')).toHaveTextContent('2')
  expect(screen.getByLabelText('Релевантность: 67%')).toBeInTheDocument()
  expect(screen.getByLabelText('Релевантность: 100%')).toBeInTheDocument()
  expect(screen.getByText('Источник [2]')).toBeInTheDocument()
})

test('с onOpen клик не уходит по ссылке, а передаёт источник', () => {
  const onOpen = jest.fn()

  render(<SourcesPanel sources={[source]} onOpen={onOpen} />)
  // fireEvent.click возвращает false, если обработчик отменил переход по ссылке.
  expect(fireEvent.click(screen.getByRole('link'))).toBe(false)
  expect(onOpen).toHaveBeenCalledWith(source)
})
