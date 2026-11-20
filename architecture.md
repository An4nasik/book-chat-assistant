# Архитектура: Book Chat Assistant

Чат-ассистент отвечает на вопросы по загруженной книге и даёт ссылки на фрагменты текста, на которых основан ответ.

## 1. Проекты

Репозиторий содержит три проекта.

| Проект | Назначение |
| --- | --- |
| `ui-library` | Библиотека общих React-компонентов `@book-chat/ui-library`: чат, панель источников, загрузка книги, просмотр фрагмента |
| `frontend` | Веб-приложение на React: страницы, роутинг, обращения к API сервера |
| `server` | Сервер на Node.js и Express: импорт книг, разбиение на фрагменты, индексы, гибридный поиск, ответы языковой модели |

Внешние сервисы запускаются локально:

- **Ollama** — embeddings (`qwen3-embedding:0.6b`) и генерация ответов (`qwen3:4b-instruct`);
- **Qdrant** — векторная база, поднимается через `docker compose`.

```
Браузер ──► frontend (Vite, :5173) ──/api──► server (Express, :3001)
                                               ├──► Ollama (:11434): /api/embed, /api/chat
                                               ├──► Qdrant (:6333): векторы фрагментов
                                               └──► data/: книги, фрагменты, история чатов (JSON)
```

## 2. Структура папок

```
book-chat-assistant/
├── architecture.md, mvp.md, README.md
├── docker-compose.yml            # Qdrant
├── docs/screenshots/             # скриншоты для README
├── ui-library/
│   ├── src/
│   │   ├── ChatWindow.tsx        # лента сообщений и поле ввода
│   │   ├── SourcesPanel.tsx      # список фрагментов-источников
│   │   ├── BookUploadForm.tsx    # выбор и отправка файла книги
│   │   ├── FragmentViewer.tsx    # текст главы с выделенным фрагментом
│   │   ├── *.test.tsx            # юнит-тесты компонентов
│   │   ├── style.css             # стили компонентов
│   │   └── index.ts              # публичный экспорт
│   ├── vite.config.ts            # сборка библиотеки (ES-модуль + .d.ts)
│   └── jest.config.js, eslint.config.js, tsconfig*.json, package.json
├── frontend/
│   ├── src/
│   │   ├── main.tsx              # точка входа, BrowserRouter
│   │   ├── AppRoutes.tsx         # таблица маршрутов
│   │   ├── components/Layout.tsx # шапка, навигация, <Outlet />
│   │   ├── pages/                # страницы (см. раздел 5)
│   │   ├── api.ts                # функции запросов к серверу (MVP)
│   │   └── index.css
│   ├── vite.config.ts            # прокси /api → :3001
│   └── jest.config.js, eslint.config.js, tsconfig*.json, package.json
└── server/
    ├── src/
    │   ├── index.ts              # запуск HTTP-сервера
    │   ├── app.ts                # создание Express-приложения
    │   ├── config.ts             # настройки из .env
    │   ├── routes/books.ts       # маршруты API
    │   ├── books/                # импорт TXT/FB2, разбиение, хранение (MVP)
    │   ├── search/               # BM25, Qdrant, объединение RRF (MVP)
    │   └── llm/                  # Ollama: embeddings и ответ (MVP)
    ├── data/                     # создаётся при работе, в git не попадает
    ├── .env.example
    └── jest.config.js, eslint.config.js, tsconfig*.json, package.json
```

## 3. Библиотеки

Все проекты: TypeScript 5.9.3, ESLint 9.39.5 (`@eslint/js`, `typescript-eslint` 8.73.0, `eslint-plugin-import` 2.32.0, `globals` 17.14.0), Jest 30.5.2 и ts-jest 29.4.15, `@types/node` 24.19.2, `@types/jest` 30.0.0.

### ui-library и frontend

| Библиотека | Версия | Назначение |
| --- | --- | --- |
| react, react-dom | 19.3.1 | UI |
| react-router | 7.18.6 | роутинг (только frontend) |
| vite | 7.3.8 | dev-сервер и сборка |
| @vitejs/plugin-react | 5.2.0 | JSX и Fast Refresh в Vite |
| vite-plugin-dts | 5.1.2 | типы `.d.ts` для библиотеки |
| eslint-plugin-react, -react-hooks, -react-refresh | 7.37.5, 7.1.1, 0.5.8 | правила для React |
| @testing-library/react, user-event, jest-dom | 16.3.3, 14.6.13, 6.9.1 | тесты компонентов |
| jest-environment-jsdom | 30.5.2 | DOM в тестах |
| identity-obj-proxy | 3.0.0 | заглушка CSS в тестах |
| @types/react, @types/react-dom | 19.3.0 | типы |

UI-библиотеки (Material UI и т. п.) не используются, компоненты написаны с нуля.

### server

| Библиотека | Версия | Назначение |
| --- | --- | --- |
| express | 5.3.0 | HTTP-сервер и маршруты |
| multer | 2.5.0 | приём файла книги (multipart/form-data) |
| fast-xml-parser | 5.12.1 | разбор FB2 (XML) |
| minisearch | 7.2.0 | полнотекстовый поиск BM25 |
| @qdrant/js-client-rest | 1.20.0 | клиент Qdrant |
| tsx | 4.23.15 | запуск TypeScript в режиме разработки |
| supertest | 7.3.2 | тесты HTTP-маршрутов |
| @types/express, @types/multer, @types/supertest | 5.0.6, 2.3.0, 7.2.1 | типы |

К Ollama сервер обращается встроенным `fetch` (Node.js 24), отдельный SDK не нужен.

### Внешние сервисы

| Сервис | Версия | Назначение |
| --- | --- | --- |
| Ollama | 0.13+ | локальные модели |
| qwen3-embedding:0.6b | — | embeddings, 1024 измерения; для запроса добавляется инструкция |
| qwen3:4b-instruct | — | ответ по найденным фрагментам; instruct-версия без режима рассуждений, отвечает быстрее |
| Qdrant | 1.20.2 (Docker) | хранение векторов, косинусная близость, фильтр по книге |

Выбор embedding-модели проверен на русских абзацах: qwen3-embedding:0.6b с инструкцией нашла верный абзац в 7 из 8 вопросов, bge-m3 и embeddinggemma — в 6 из 8.

## 4. Компоненты

### ui-library

| Компонент | Props | Назначение |
| --- | --- | --- |
| `ChatWindow` | `messages`, `onSend`, `isTyping?`, `title?`, `placeholder?` | Лента сообщений пользователя и ассистента, индикатор ожидания, поле ввода. Хранит только черновик |
| `SourcesPanel` | `sources`, `onOpen?` | Список фрагментов к последнему ответу: номер `[n]`, глава, текст, релевантность, ссылка «Открыть в книге» |
| `BookUploadForm` | `onUpload`, `isUploading?`, `error?` | Выбор файла `.txt`/`.fb2` и отправка |
| `FragmentViewer` | `chapter`, `fragments`, `activeId` | Текст главы, выделение и прокрутка к нужному фрагменту |

### frontend

| Компонент | Назначение |
| --- | --- |
| `Layout` | Шапка с навигацией и место для страницы |
| `BooksPage` | Загрузка книги, список книг со статусом индексации |
| `ChatPage` | Чат по книге: `ChatWindow` + `SourcesPanel` |
| `FragmentPage` | Просмотр фрагмента: `FragmentViewer` и соседние фрагменты |
| `AboutPage` | Описание проекта |
| `NotFoundPage` | Страница 404 |

### server

| Модуль | Назначение |
| --- | --- |
| `routes/books.ts` | Маршруты API |
| `books/parse.ts` | Извлечение текста и глав из TXT и FB2 |
| `books/chunk.ts` | Разбиение абзацев на фрагменты до ~600 символов |
| `books/store.ts` | Чтение и запись книг и истории чатов в `data/` |
| `search/bm25.ts` | Индекс MiniSearch по фрагментам книги |
| `search/vectors.ts` | Запись и поиск векторов в Qdrant |
| `search/hybrid.ts` | Объединение двух списков методом RRF |
| `llm/ollama.ts` | Embeddings и генерация ответа |
| `llm/answer.ts` | Промпт, разбор ссылок `[n]` в ответе |

## 5. Роутинг

| Маршрут | Страница | Параметры | Описание |
| --- | --- | --- | --- |
| `/` | `BooksPage` | — | Загрузка и список книг |
| `/books/:bookId` | `ChatPage` | `bookId` | Вопросы по книге |
| `/books/:bookId/fragments/:fragmentId` | `FragmentPage` | `bookId`, `fragmentId` | Фрагмент с соседним текстом |
| `/about` | `AboutPage` | — | О проекте |
| `*` | `NotFoundPage` | — | 404 |

Все страницы вложены в `Layout`. Защищённых маршрутов нет: приложение локальное и без учётных записей.

### API сервера

| Метод и путь | Ответ |
| --- | --- |
| `GET /api/health` | `{ status: 'ok' }` |
| `GET /api/books` | список книг: `{ id, title, format, status, error?, createdAt, chapters, fragmentsCount }[]` |
| `POST /api/books` | загрузка файла (`file`), `201` и книга со статусом `indexing`; неверный файл — `400` |
| `GET /api/books/:bookId` | книга в том же формате; нет книги — `404` |
| `GET /api/books/:bookId/fragments/:fragmentId` | `{ bookTitle, fragment, before, after }`: до двух соседних фрагментов той же главы |
| `GET /api/books/:bookId/messages` | история диалога `{ id, role, text, sources, createdAt }[]` |
| `POST /api/books/:bookId/messages` | `{ question }` → `{ question, message }`, где `message.sources` — процитированные фрагменты `{ fragmentId, chapter, text, relevance }`; книга не готова — `409`, сбой Ollama или Qdrant — `502` |

## 6. Как приложение использует библиотеку

`ui-library` собирается Vite в ES-модуль `dist/index.js`, типы `dist/index.d.ts` и стили `dist/index.css`. `frontend` подключает её локальной зависимостью `"@book-chat/ui-library": "file:../ui-library"`, импортирует компоненты:

```ts
import { ChatWindow, SourcesPanel } from '@book-chat/ui-library'
import '@book-chat/ui-library/style.css'
```

Компоненты используются на страницах `BooksPage` (`BookUploadForm`), `ChatPage` (`ChatWindow`, `SourcesPanel`), `FragmentPage` (`FragmentViewer`). В тестах `frontend` Jest берёт исходники библиотеки напрямую через `moduleNameMapper`.

## 7. Поиск и ответ

1. **Импорт.** Текст делится на абзацы, абзацы склеиваются во фрагменты до ~600 символов (абзац длиннее не режется). У фрагмента есть номер, глава и текст. На «Ионыче» фрагменты по ~1000 символов давали худший поиск: смысл длинного фрагмента размывается.
2. **Индексы.** Для каждого фрагмента считается embedding и записывается в Qdrant с полем `bookId`. BM25-индекс MiniSearch строится из тех же фрагментов.
3. **Поиск.** Вопрос ищется параллельно: векторный top-20 и BM25 top-20. Списки объединяются методом RRF: `score = 1.0 / (60 + rank_vector) + 0.7 / (60 + rank_bm25)`. Вектор важнее, BM25 помогает с именами и точными цитатами. В ответ идут 10 лучших фрагментов.
4. **Ответ.** Модель получает вопрос и пронумерованные фрагменты `[1]…[10]`. Она отвечает только по ним, ставит ссылки `[n]`, а если ответа нет — так и пишет. Текст книги передаётся как данные, а не как инструкции. Сервер оставляет только существующие номера ссылок и возвращает процитированные фрагменты.

### Следующие этапы (вне MVP)

- Повторное ранжирование (reranking) кандидатов перед передачей в модель.
- Формат EPUB.
- Подбор размера фрагментов и весов RRF по результатам экспериментов.
