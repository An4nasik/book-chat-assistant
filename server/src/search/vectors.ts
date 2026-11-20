import { randomUUID } from 'node:crypto'

import { QdrantClient } from '@qdrant/js-client-rest'

import { config } from '../config.js'

import type { Fragment } from '../types.js'

const COLLECTION = 'fragments'

function client(): QdrantClient {
  return new QdrantClient({ url: config.qdrantUrl, checkCompatibility: false })
}

export async function saveVectors(bookId: string, fragments: Fragment[], vectors: number[][]): Promise<void> {
  const qdrant = client()
  const { exists } = await qdrant.collectionExists(COLLECTION)

  if (!exists) {
    await qdrant.createCollection(COLLECTION, { vectors: { size: vectors[0].length, distance: 'Cosine' } })
    await qdrant.createPayloadIndex(COLLECTION, { field_name: 'bookId', field_schema: 'keyword' })
  }

  const points = fragments.map((fragment: Fragment, index: number) => ({
    id: randomUUID(),
    vector: vectors[index],
    payload: { bookId, fragmentId: fragment.id },
  }))

  for (let start = 0; start < points.length; start += 100) {
    await qdrant.upsert(COLLECTION, { wait: true, points: points.slice(start, start + 100) })
  }
}

export async function searchVectors(bookId: string, vector: number[], limit = 20): Promise<string[]> {
  const result = await client().query(COLLECTION, {
    query: vector,
    limit,
    with_payload: true,
    filter: { must: [{ key: 'bookId', match: { value: bookId } }] },
  })

  return result.points.map((point) => String(point.payload?.fragmentId))
}
