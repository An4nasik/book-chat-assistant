import { createApp } from './app.js'
import { config } from './config.js'

createApp().listen(config.port, () => {
  console.log(`Сервер запущен: http://localhost:${config.port}`)
})
