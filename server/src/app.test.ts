import request from 'supertest'

import { createApp } from './app'

const app = createApp()

test('GET /api/health отвечает ok', async () => {
  const response = await request(app).get('/api/health')

  expect(response.status).toBe(200)
  expect(response.body).toEqual({ status: 'ok' })
})

test('маршруты каркаса отвечают', async () => {
  expect((await request(app).get('/api/books')).body).toEqual([])
  expect((await request(app).post('/api/books')).status).toBe(501)
  expect((await request(app).get('/api/books/x')).status).toBe(404)
  expect((await request(app).get('/api/books/x/fragments/y')).status).toBe(404)
  expect((await request(app).get('/api/books/x/messages')).body).toEqual([])
  expect((await request(app).post('/api/books/x/messages')).status).toBe(501)
})
