import type { MouseEvent, ReactElement } from 'react'

export interface SourceFragment {
  id: string
  title: string
  excerpt: string
  /** Относительная релевантность от 0 до 1. */
  relevance: number
  url: string
}

export interface SourcesPanelProps {
  sources: readonly SourceFragment[]
  onOpen?: (source: SourceFragment) => void
}

export function SourcesPanel({ sources, onOpen }: SourcesPanelProps): ReactElement {
  function handleClick(event: MouseEvent<HTMLAnchorElement>, source: SourceFragment): void {
    if (onOpen) {
      event.preventDefault()
      onOpen(source)
    }
  }

  return (
    <aside className="sources-panel" aria-label="Панель источников">
      <div className="sources-header">
        <h2 className="sources-heading">Источники</h2>
        <span className="sources-count" aria-label={`Найдено источников: ${sources.length}`}>{sources.length}</span>
      </div>
      <p className="sources-description">Фрагменты книги, на которые ссылается последний ответ.</p>
      {sources.length === 0 ? (
        <p className="sources-empty">Пока нет фрагментов. Задайте вопрос по книге.</p>
      ) : (
        <ol className="sources-list">
          {sources.map((source: SourceFragment, index: number) => (
            <li className="source-card" key={source.id}>
              <div className="source-meta">
                <span>Источник [{index + 1}]</span>
                <span className="source-score" aria-label={`Релевантность: ${Math.round(source.relevance * 100)}%`}>
                  {Math.round(source.relevance * 100)}%
                </span>
              </div>
              <h3 className="source-title">{source.title}</h3>
              <p className="source-excerpt">{source.excerpt}</p>
              <a
                className="source-link"
                href={source.url}
                aria-label={`Открыть фрагмент: ${source.title}`}
                onClick={(event): void => handleClick(event, source)}
              >
                Открыть в книге <span aria-hidden="true">↗</span>
              </a>
            </li>
          ))}
        </ol>
      )}
    </aside>
  )
}
