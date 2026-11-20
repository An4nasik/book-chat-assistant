import { XMLParser } from 'fast-xml-parser'

import type { Paragraph } from '../types.js'

export interface ParsedBook {
  title: string
  paragraphs: Paragraph[]
}

const CHAPTER_LINE = /^(глава|часть|chapter)\s+\S+|^[IVXLC]+\.?$/i

// Сначала пробуем UTF-8, если байты в нём невозможны — значит файл в windows-1251.
export function decodeText(buffer: Buffer): string {
  try {
    return new TextDecoder('utf-8', { fatal: true }).decode(buffer)
  } catch {
    return new TextDecoder('windows-1251').decode(buffer)
  }
}

export function parseTxt(text: string, fileName: string): ParsedBook {
  const paragraphs: Paragraph[] = []
  let chapter = 'Начало'

  for (const rawLine of text.split(/\r?\n/)) {
    const line = rawLine.trim()

    if (!line) {
      continue
    }

    if (CHAPTER_LINE.test(line) && line.length < 80) {
      chapter = line
      continue
    }

    paragraphs.push({ chapter, text: line })
  }

  return { title: fileName.replace(/\.[^.]+$/, ''), paragraphs }
}

type XmlNode = string | number | { [key: string]: unknown }

function textOf(node: unknown): string {
  if (typeof node === 'string' || typeof node === 'number') {
    return String(node).trim()
  }

  if (node && typeof node === 'object' && '#text' in node) {
    return String((node as { '#text': unknown })['#text']).trim()
  }

  return ''
}

function asArray(value: unknown): XmlNode[] {
  if (value === undefined || value === null) {
    return []
  }

  return (Array.isArray(value) ? value : [value]) as XmlNode[]
}

function walkSection(section: XmlNode, parentChapter: string, paragraphs: Paragraph[]): void {
  if (typeof section !== 'object') {
    return
  }

  const titleNode = section.title as { p?: unknown } | undefined
  const title = asArray(titleNode?.p).map(textOf).join(' ').trim()
  const chapter = title || parentChapter

  for (const p of asArray(section.p)) {
    const text = textOf(p)

    if (text) {
      paragraphs.push({ chapter, text })
    }
  }

  for (const child of asArray(section.section)) {
    walkSection(child, chapter, paragraphs)
  }
}

export function parseFb2(xml: string): ParsedBook {
  // Встроенные теги оформления убираем заранее, иначе парсер разорвёт текст абзаца на части.
  const cleaned = xml
    .replace(/<binary[\s\S]*?<\/binary>/g, '')
    .replace(/<\/?(emphasis|strong|strikethrough|sub|sup|code|style|a)(\s[^>]*)?>/g, '')
  const parser = new XMLParser({ ignoreAttributes: false, attributeNamePrefix: '@_' })
  const doc = parser.parse(cleaned) as { FictionBook?: { [key: string]: XmlNode } }
  const book = doc.FictionBook

  if (!book) {
    throw new Error('Файл не похож на FB2: нет элемента FictionBook')
  }

  const description = book.description as { 'title-info'?: { 'book-title'?: unknown } } | undefined
  const title = textOf(description?.['title-info']?.['book-title']) || 'Без названия'
  const paragraphs: Paragraph[] = []

  for (const body of asArray(book.body)) {
    if (typeof body === 'object' && body['@_name'] !== 'notes') {
      walkSection(body, title, paragraphs)
    }
  }

  return { title, paragraphs }
}
