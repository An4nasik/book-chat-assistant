import { fuseRanks } from './hybrid'

test('фрагмент из обоих списков выше, вектор важнее BM25', () => {
  const ranked = fuseRanks(['a', 'b', 'c'], ['c', 'd'])

  expect(ranked.map((item) => item.id)).toEqual(['c', 'a', 'b', 'd'])
  expect(ranked[0].relevance).toBeCloseTo((1 / 63 + 0.7 / 61) / (1.7 / 61))
})

test('первое место в обоих списках даёт релевантность 1, лимит соблюдается', () => {
  const ranked = fuseRanks(['x', 'y', 'z'], ['x'], 2)

  expect(ranked).toHaveLength(2)
  expect(ranked[0]).toEqual({ id: 'x', score: 1.7 / 61, relevance: 1 })
})
