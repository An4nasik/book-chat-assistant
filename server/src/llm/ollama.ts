import { config } from '../config.js'

const QUERY_INSTRUCTION = 'Instruct: Given a question about a book, retrieve passages that answer it\nQuery: '

export interface LlmMessage {
  role: 'system' | 'user'
  content: string
}

async function post<T>(url: string, body: object): Promise<T> {
  const response = await fetch(`${config.ollamaUrl}${url}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  })

  if (!response.ok) {
    throw new Error(`Ollama ответила ${response.status}: ${await response.text()}`)
  }

  return (await response.json()) as T
}

export async function embedTexts(texts: string[]): Promise<number[][]> {
  const vectors: number[][] = []

  // Отправляем пачками, чтобы не держать в одном запросе всю книгу.
  for (let start = 0; start < texts.length; start += 32) {
    const batch = texts.slice(start, start + 32)
    const result = await post<{ embeddings: number[][] }>('/api/embed', { model: config.embedModel, input: batch })

    vectors.push(...result.embeddings)
  }

  return vectors
}

export async function embedQuery(question: string): Promise<number[]> {
  const [vector] = await embedTexts([QUERY_INSTRUCTION + question])

  return vector
}

export async function chat(messages: LlmMessage[]): Promise<string> {
  const result = await post<{ message: { content: string } }>('/api/chat', {
    model: config.chatModel,
    messages,
    stream: false,
    think: false,
    options: { temperature: 0.2 },
  })

  // Если модель всё же вывела рассуждения, оставляем только текст после </think>.
  return result.message.content.replace(/^[\s\S]*<\/think>/, '').trim()
}
