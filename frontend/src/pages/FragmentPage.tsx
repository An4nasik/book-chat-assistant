import { useEffect, useState } from 'react'
import type { ReactElement } from 'react'

import { FragmentViewer } from '@book-chat/ui-library'
import { Link, useParams } from 'react-router'

import { chapterTitle, getFragment } from '../api'

import type { FragmentContext } from '../api'

export function FragmentPage(): ReactElement {
  const { bookId = '', fragmentId = '' } = useParams()
  const [context, setContext] = useState<FragmentContext | null>(null)
  const [error, setError] = useState<string>('')

  useEffect(() => {
    getFragment(bookId, fragmentId)
      .then(setContext)
      .catch((reason: Error) => setError(reason.message))
  }, [bookId, fragmentId])

  return (
    <section className="page">
      <Link to={`/books/${bookId}`}>← К чату</Link>
      {error && <p className="error" role="alert">{error}</p>}
      {context && (
        <>
          <h1>{context.bookTitle}</h1>
          <FragmentViewer
            chapter={chapterTitle(context.fragment.chapter)}
            activeId={context.fragment.id}
            fragments={[...context.before, context.fragment, ...context.after]}
          />
        </>
      )}
    </section>
  )
}
