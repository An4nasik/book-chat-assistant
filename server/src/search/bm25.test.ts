import { normalizeTerm, searchBm25 } from './bm25'

const fragments = [
  { id: 'f0', index: 0, chapter: 'I', text: 'Доктор Старцев получил место земского врача.' },
  { id: 'f1', index: 1, chapter: 'I', text: 'Котик играла на рояле.' },
  { id: 'f2', index: 2, chapter: 'II', text: 'Свидание на кладбище не состоялось.' },
]

test('normalizeTerm обрезает окончания и убирает короткие слова', () => {
  expect(normalizeTerm('Старцеву')).toBe('старц')
  expect(normalizeTerm('Ёлка')).toBe('елка')
  expect(normalizeTerm('на')).toBeNull()
})

test('находит фрагмент по слову в другой форме', () => {
  expect(searchBm25('book-1', fragments, 'Что случилось на кладбищах?')[0]).toBe('f2')
  expect(searchBm25('book-1', fragments, 'кто такой Старцеву')[0]).toBe('f0')
  expect(searchBm25('book-1', fragments, 'самолёт')).toEqual([])
})
