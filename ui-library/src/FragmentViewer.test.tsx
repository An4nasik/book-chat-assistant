import { render, screen } from '@testing-library/react'

import { FragmentViewer } from './FragmentViewer'

test('показывает главу, абзацы и выделяет текущий фрагмент', () => {
  const fragments = [
    { id: 'f1', text: 'Первый абзац.' },
    { id: 'f2', text: 'Второй абзац.\nТретий абзац.' },
  ]

  render(<FragmentViewer chapter="Глава I" fragments={fragments} activeId="f2" />)
  expect(screen.getByRole('heading', { name: 'Глава I' })).toBeInTheDocument()
  expect(screen.getByText('Третий абзац.')).toBeInTheDocument()
  const active = screen.getByText('Второй абзац.').parentElement

  expect(active).toHaveAttribute('aria-current', 'true')
  expect(active).toHaveClass('viewer-fragment--active')
  expect(screen.getByText('Первый абзац.').parentElement).not.toHaveAttribute('aria-current')
})
