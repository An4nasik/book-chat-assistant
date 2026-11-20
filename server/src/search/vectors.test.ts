import { saveVectors, searchVectors } from './vectors'

const qdrant = {
  collectionExists: jest.fn(),
  createCollection: jest.fn(),
  createPayloadIndex: jest.fn(),
  upsert: jest.fn(),
  query: jest.fn(),
}

jest.mock('@qdrant/js-client-rest', () => ({ QdrantClient: jest.fn(() => qdrant) }))

const fragments = [{ id: 'f0', index: 0, chapter: 'I', text: 'a' }, { id: 'f1', index: 1, chapter: 'I', text: 'b' }]

beforeEach(() => jest.clearAllMocks())

test('создаёт коллекцию при первом сохранении и пишет точки с bookId', async () => {
  qdrant.collectionExists.mockResolvedValue({ exists: false })
  await saveVectors('book-1', fragments, [[1, 0], [0, 1]])
  expect(qdrant.createCollection).toHaveBeenCalledWith('fragments', { vectors: { size: 2, distance: 'Cosine' } })
  expect(qdrant.createPayloadIndex).toHaveBeenCalled()
  const points = qdrant.upsert.mock.calls[0][1].points

  expect(points).toHaveLength(2)
  expect(points[1]).toMatchObject({ vector: [0, 1], payload: { bookId: 'book-1', fragmentId: 'f1' } })
})

test('существующую коллекцию не пересоздаёт', async () => {
  qdrant.collectionExists.mockResolvedValue({ exists: true })
  await saveVectors('book-1', fragments, [[1, 0], [0, 1]])
  expect(qdrant.createCollection).not.toHaveBeenCalled()
})

test('ищет только внутри книги и возвращает id фрагментов', async () => {
  qdrant.query.mockResolvedValue({ points: [{ payload: { fragmentId: 'f1' } }, { payload: { fragmentId: 'f0' } }] })
  expect(await searchVectors('book-1', [1, 0], 5)).toEqual(['f1', 'f0'])
  expect(qdrant.query.mock.calls[0][1]).toMatchObject({ query: [1, 0], limit: 5, filter: { must: [{ key: 'bookId', match: { value: 'book-1' } }] } })
})
