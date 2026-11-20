import { chunkParagraphs } from './chunk'

test('склеивает абзацы одной главы до лимита и начинает новый фрагмент на новой главе', () => {
  const fragments = chunkParagraphs([
    { chapter: 'I', text: 'aaaa' },
    { chapter: 'I', text: 'bbbb' },
    { chapter: 'I', text: 'cccc' },
    { chapter: 'II', text: 'dddd' },
  ], 10)

  expect(fragments).toEqual([
    { id: 'f0', index: 0, chapter: 'I', text: 'aaaa\nbbbb' },
    { id: 'f1', index: 1, chapter: 'I', text: 'cccc' },
    { id: 'f2', index: 2, chapter: 'II', text: 'dddd' },
  ])
})

test('пустой список абзацев — нет фрагментов', () => {
  expect(chunkParagraphs([])).toEqual([])
})
