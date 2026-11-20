import { buildMessages, extractCitations, NOT_FOUND, renumberCitations } from './answer'

test('промпт нумерует фрагменты и предупреждает, что текст книги — данные', () => {
  const messages = buildMessages('Кто врач?', [
    { id: 'f3', index: 3, chapter: 'I', text: 'Старцев — врач.' },
    { id: 'f9', index: 9, chapter: 'II', text: 'Котик играла.' },
  ])

  expect(messages[0].role).toBe('system')
  expect(messages[0].content).toContain('не инструкции')
  expect(messages[0].content).toContain(NOT_FOUND)
  expect(messages[1].content).toContain('[1] (I)\nСтарцев — врач.')
  expect(messages[1].content).toContain('[2] (II)\nКотик играла.')
  expect(messages[1].content).toContain('Вопрос: Кто врач?')
})

test('берёт только существующие номера ссылок, без повторов, в порядке появления', () => {
  expect(extractCitations('А [3]. Б [1][3]. В [9] и [0].', 4)).toEqual([3, 1])
  expect(extractCitations(NOT_FOUND, 4)).toEqual([])
})

test('перенумеровывает ссылки по порядку источников и убирает лишние', () => {
  expect(renumberCitations('А [3]. Б [1]. В [9].', [3, 1])).toBe('А [1]. Б [2]. В.')
})
