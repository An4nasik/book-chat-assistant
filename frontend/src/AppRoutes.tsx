import type { ReactElement } from 'react'

import { Route, Routes } from 'react-router'

import { Layout } from './components/Layout'
import { AboutPage } from './pages/AboutPage'
import { BooksPage } from './pages/BooksPage'
import { ChatPage } from './pages/ChatPage'
import { FragmentPage } from './pages/FragmentPage'
import { NotFoundPage } from './pages/NotFoundPage'

export function AppRoutes(): ReactElement {
  return (
    <Routes>
      <Route element={<Layout />}>
        <Route index element={<BooksPage />} />
        <Route path="books/:bookId" element={<ChatPage />} />
        <Route path="books/:bookId/fragments/:fragmentId" element={<FragmentPage />} />
        <Route path="about" element={<AboutPage />} />
        <Route path="*" element={<NotFoundPage />} />
      </Route>
    </Routes>
  )
}
