import type { ReactElement } from 'react'

import { Link } from 'react-router'

export function NotFoundPage(): ReactElement {
  return (
    <section className="page">
      <h1>Страница не найдена</h1>
      <Link to="/">Вернуться к списку книг</Link>
    </section>
  )
}
