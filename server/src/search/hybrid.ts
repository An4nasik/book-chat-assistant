export interface RankedFragment {
  id: string
  score: number
  /** Доля от максимально возможного счёта: 1 — первое место в обоих списках. */
  relevance: number
}

const K = 60
const VECTOR_WEIGHT = 1
const BM25_WEIGHT = 0.7

// Reciprocal Rank Fusion: чем выше место фрагмента в списке, тем больше он получает очков.
export function fuseRanks(vectorIds: string[], bm25Ids: string[], limit = 10): RankedFragment[] {
  const scores = new Map<string, number>()

  vectorIds.forEach((id: string, rank: number) => {
    scores.set(id, (scores.get(id) ?? 0) + VECTOR_WEIGHT / (K + rank + 1))
  })
  bm25Ids.forEach((id: string, rank: number) => {
    scores.set(id, (scores.get(id) ?? 0) + BM25_WEIGHT / (K + rank + 1))
  })

  const best = (VECTOR_WEIGHT + BM25_WEIGHT) / (K + 1)

  return [...scores.entries()]
    .map(([id, score]) => ({ id, score, relevance: score / best }))
    .sort((a: RankedFragment, b: RankedFragment) => b.score - a.score)
    .slice(0, limit)
}
