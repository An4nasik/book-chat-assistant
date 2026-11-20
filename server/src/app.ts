import express from 'express'
import multer from 'multer'

import { booksRouter } from './routes/books.js'

import type { Express, NextFunction, Request, Response } from 'express'

export function createApp(): Express {
  const app = express()

  app.use(express.json())
  app.get('/api/health', (_req, res) => {
    res.json({ status: 'ok' })
  })
  app.use('/api/books', booksRouter)
  app.use((error: Error, _req: Request, res: Response, next: NextFunction) => {
    if (error instanceof multer.MulterError) {
      res.status(400).json({ error: error.code === 'LIMIT_FILE_SIZE' ? 'Файл больше 10 МБ' : error.message })

      return
    }

    next(error)
  })

  return app
}
