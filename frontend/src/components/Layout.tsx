import type { ReactElement } from 'react'

import { NavLink, Outlet } from 'react-router'

export function Layout(): ReactElement {
  return (
    <div className="app">
      <header className="app-header">
        <span className="app-logo">Book Chat</span>
        <nav className="app-nav" aria-label="Основная навигация">
          <NavLink to="/" end>Книги</NavLink>
          <NavLink to="/about">О проекте</NavLink>
        </nav>
      </header>
      <main className="app-main">
        <Outlet />
      </main>
    </div>
  )
}
