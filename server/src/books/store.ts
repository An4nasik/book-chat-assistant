import { mkdir, readdir, readFile, writeFile } from 'node:fs/promises'
import path from 'node:path'

import { config } from '../config.js'

import type { Book, ChatMessage } from '../types.js'

function booksDir(): string {
  return path.join(config.dataDir, 'books')
}

function chatsDir(): string {
  return path.join(config.dataDir, 'chats')
}

// id книги — это UUID, поэтому разрешаем только буквы, цифры и дефис:
// иначе id вида «../../package» вывел бы чтение за пределы папки data.
function isSafeId(id: string): boolean {
  return /^[\w-]+$/.test(id)
}

async function readJson<T>(file: string, fallback: T): Promise<T> {
  try {
    return JSON.parse(await readFile(file, 'utf8')) as T
  } catch {
    return fallback
  }
}

export async function saveBook(book: Book): Promise<void> {
  await mkdir(booksDir(), { recursive: true })
  await writeFile(path.join(booksDir(), `${book.id}.json`), JSON.stringify(book))
}

export async function loadBook(id: string): Promise<Book | null> {
  if (!isSafeId(id)) {
    return null
  }

  return readJson<Book | null>(path.join(booksDir(), `${id}.json`), null)
}

export async function listBooks(): Promise<Book[]> {
  await mkdir(booksDir(), { recursive: true })
  const files = await readdir(booksDir())
  const books: Book[] = []

  for (const file of files) {
    const book = await loadBook(file.replace(/\.json$/, ''))

    if (book) {
      books.push(book)
    }
  }

  return books.sort((a: Book, b: Book) => b.createdAt.localeCompare(a.createdAt))
}

export async function loadChat(bookId: string): Promise<ChatMessage[]> {
  if (!isSafeId(bookId)) {
    return []
  }

  return readJson<ChatMessage[]>(path.join(chatsDir(), `${bookId}.json`), [])
}

export async function appendChat(bookId: string, messages: ChatMessage[]): Promise<void> {
  const chat = await loadChat(bookId)

  await mkdir(chatsDir(), { recursive: true })
  await writeFile(path.join(chatsDir(), `${bookId}.json`), JSON.stringify([...chat, ...messages]))
}
