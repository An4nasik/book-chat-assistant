import express from 'express'

import { booksRouter } from './routes/books.js'

import type { Express } from 'express'

export function createApp(): Express {
  const app = express()

  app.use(express.json())
  app.get('/api/health', (_req, res) => {
    res.json({ status: 'ok' })
  })
  app.use('/api/books', booksRouter)

  return app
}
