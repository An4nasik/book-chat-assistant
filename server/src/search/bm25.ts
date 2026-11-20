import MiniSearch from 'minisearch'

import type { Fragment } from '../types.js'

const indexes = new Map<string, MiniSearch<Fragment>>()

// Простейшая замена стемминга: слова длиннее 5 букв обрезаем,
// чтобы «Старцев» и «Старцеву» давали одинаковый термин.
export function normalizeTerm(term: string): string | null {
  const word = term.toLowerCase().replace(/ё/g, 'е')

  if (word.length < 3) {
    return null
  }

  return word.slice(0, 5)
}

export function buildIndex(bookId: string, fragments: Fragment[]): void {
  const index = new MiniSearch<Fragment>({ fields: ['text'], idField: 'id', processTerm: normalizeTerm })

  index.addAll(fragments)
  indexes.set(bookId, index)
}

export function searchBm25(bookId: string, fragments: Fragment[], question: string, limit = 20): string[] {
  if (!indexes.has(bookId)) {
    buildIndex(bookId, fragments)
  }

  const index = indexes.get(bookId) as MiniSearch<Fragment>

  return index.search(question).slice(0, limit).map((result) => String(result.id))
}
