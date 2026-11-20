import { useEffect, useRef } from 'react'
import type { ReactElement } from 'react'

export interface ViewerFragment {
  id: string
  text: string
}

export interface FragmentViewerProps {
  chapter: string
  fragments: readonly ViewerFragment[]
  activeId: string
}

export function FragmentViewer({ chapter, fragments, activeId }: FragmentViewerProps): ReactElement {
  const activeRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    activeRef.current?.scrollIntoView?.({ block: 'center' })
  }, [activeId])

  return (
    <article className="viewer" aria-label="Текст книги">
      <h2 className="viewer-chapter">{chapter}</h2>
      {fragments.map((fragment: ViewerFragment) => {
        const isActive = fragment.id === activeId

        return (
          <div
            className={isActive ? 'viewer-fragment viewer-fragment--active' : 'viewer-fragment'}
            key={fragment.id}
            ref={isActive ? activeRef : undefined}
            aria-current={isActive ? 'true' : undefined}
          >
            {fragment.text.split('\n').map((paragraph: string, index: number) => (
              <p className="viewer-paragraph" key={index}>{paragraph}</p>
            ))}
          </div>
        )
      })}
    </article>
  )
}
