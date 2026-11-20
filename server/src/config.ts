export const config = {
  port: Number(process.env.PORT ?? 3001),
  ollamaUrl: process.env.OLLAMA_URL ?? 'http://127.0.0.1:11434',
  chatModel: process.env.CHAT_MODEL ?? 'qwen3:4b-instruct',
  embedModel: process.env.EMBED_MODEL ?? 'qwen3-embedding:0.6b',
  qdrantUrl: process.env.QDRANT_URL ?? 'http://127.0.0.1:6333',
  dataDir: process.env.DATA_DIR ?? 'data',
}
