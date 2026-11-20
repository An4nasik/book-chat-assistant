import type { ReactElement } from 'react'

import { FragmentViewer } from '@book-chat/ui-library'
import { Link, useParams } from 'react-router'

export function FragmentPage(): ReactElement {
  const { bookId = '', fragmentId = '' } = useParams()

  return (
    <section className="page">
      <Link to={`/books/${bookId}`}>← К чату</Link>
      <h1>Фрагмент {fragmentId}</h1>
      <FragmentViewer
        chapter="Глава книги"
        activeId={fragmentId}
        fragments={[
          { id: 'before', text: 'Здесь будут два фрагмента перед найденным.' },
          { id: fragmentId, text: 'Здесь будет фрагмент, на который ссылается ответ. Он выделен и прокручен в центр экрана.' },
          { id: 'after', text: 'Здесь будут два фрагмента после найденного.' },
        ]}
      />
    </section>
  )
}
