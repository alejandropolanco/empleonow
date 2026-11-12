import { createApp } from './app.js'
import { env } from './lib/env.js'

const app = createApp()

app.listen(env.PORT, () => {
  console.log(`API EmpleoNow en http://localhost:${env.PORT}`)
})