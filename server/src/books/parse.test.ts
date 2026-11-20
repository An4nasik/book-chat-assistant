import { decodeText, parseFb2, parseTxt } from './parse'

test('TXT: абзацы по строкам, главы по «Глава N» и римским цифрам', () => {
  const book = parseTxt('Вступление.\n\nI\nПервый абзац.\n  Второй абзац.  \nГлава 2\nТретий.', 'ionych.txt')

  expect(book.title).toBe('ionych')
  expect(book.paragraphs).toEqual([
    { chapter: 'Начало', text: 'Вступление.' },
    { chapter: 'I', text: 'Первый абзац.' },
    { chapter: 'I', text: 'Второй абзац.' },
    { chapter: 'Глава 2', text: 'Третий.' },
  ])
})

test('decodeText понимает UTF-8 с BOM и windows-1251', () => {
  expect(decodeText(Buffer.from('﻿Привет', 'utf8'))).toBe('Привет')
  expect(decodeText(Buffer.from([0xcf, 0xf0, 0xe8, 0xe2, 0xe5, 0xf2]))).toBe('Привет')
})

test('FB2: название, главы, абзацы без разрывов из-за тегов, сноски и картинки пропускаются', () => {
  const xml = `<?xml version="1.0" encoding="utf-8"?>
<FictionBook>
  <description><title-info><book-title>Ионыч</book-title></title-info></description>
  <body>
    <section>
      <title><p>I</p></title>
      <p>Когда в <emphasis>губернском</emphasis> городе С.</p>
      <p>Второй абзац.</p>
      <section><title><p>Подглава</p></title><p>Вложенный.</p></section>
    </section>
    <section><p>Без заголовка.</p></section>
  </body>
  <body name="notes"><section><p>Сноска.</p></section></body>
  <binary id="cover.jpg">AAAA</binary>
</FictionBook>`
  const book = parseFb2(xml)

  expect(book.title).toBe('Ионыч')
  expect(book.paragraphs).toEqual([
    { chapter: 'I', text: 'Когда в губернском городе С.' },
    { chapter: 'I', text: 'Второй абзац.' },
    { chapter: 'Подглава', text: 'Вложенный.' },
    { chapter: 'Ионыч', text: 'Без заголовка.' },
  ])
})

test('FB2 без FictionBook — ошибка', () => {
  expect(() => parseFb2('<html></html>')).toThrow('Файл не похож на FB2')
})
