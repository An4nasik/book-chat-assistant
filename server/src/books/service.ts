import { randomUUID } from 'node:crypto'

import { chunkParagraphs } from './chunk.js'
import { decodeText, parseFb2, parseTxt } from './parse.js'
import { saveBook } from './store.js'
import { buildMessages, extractCitations, NOT_FOUND, renumberCitations } from '../llm/answer.js'
import { chat, embedQuery, embedTexts } from '../llm/ollama.js'
import { buildIndex, searchBm25 } from '../search/bm25.js'
import { fuseRanks } from '../search/hybrid.js'
import { saveVectors, searchVectors } from '../search/vectors.js'

import type { Book, Fragment, Source } from '../types.js'

export class BadFileError extends Error {}

export function createBook(fileName: string, content: Buffer): Book {
  const extension = fileName.toLowerCase().split('.').pop()

  if (extension !== 'txt' && extension !== 'fb2') {
    throw new BadFileError('Поддерживаются только файлы TXT и FB2')
  }

  const text = decodeText(content)
  const parsed = extension === 'fb2' ? parseFb2(text) : parseTxt(text, fileName)
  const fragments = chunkParagraphs(parsed.paragraphs)

  if (fragments.length === 0) {
    throw new BadFileError('В файле не найден текст')
  }

  return {
    id: randomUUID(),
    title: parsed.title,
    format: extension,
    status: 'indexing',
    createdAt: new Date().toISOString(),
    chapters: [...new Set(fragments.map((fragment: Fragment) => fragment.chapter))],
    fragments,
  }
}

export async function indexBook(book: Book): Promise<Book> {
  try {
    const vectors = await embedTexts(book.fragments.map((fragment: Fragment) => fragment.text))

    await saveVectors(book.id, book.fragments, vectors)
    buildIndex(book.id, book.fragments)
    book.status = 'ready'
  } catch (error) {
    book.status = 'error'
    book.error = error instanceof Error ? error.message : String(error)
  }

  await saveBook(book)

  return book
}

export interface Answer {
  text: string
  sources: Source[]
}

export async function answerQuestion(book: Book, question: string): Promise<Answer> {
  const vector = await embedQuery(question)
  const vectorIds = await searchVectors(book.id, vector)
  const bm25Ids = searchBm25(book.id, book.fragments, question)
  const candidates = fuseRanks(vectorIds, bm25Ids).flatMap((item) => {
    const fragment = book.fragments.find((each: Fragment) => each.id === item.id)

    return fragment ? [{ fragment, relevance: item.relevance }] : []
  })

  if (candidates.length === 0) {
    return { text: NOT_FOUND, sources: [] }
  }

  const answer = await chat(buildMessages(question, candidates.map((candidate) => candidate.fragment)))
  const cited = extractCitations(answer, candidates.length)
  const sources = cited.map((number: number) => {
    const { fragment, relevance } = candidates[number - 1]

    return { fragmentId: fragment.id, chapter: fragment.chapter, text: fragment.text, relevance }
  })

  return { text: renumberCitations(answer, cited), sources }
}
