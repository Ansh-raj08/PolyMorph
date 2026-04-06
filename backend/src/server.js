import app from './app.js'

const PORT = Number(process.env.PORT) || 4000

process.on('unhandledRejection', (reason) => {
  console.error('[Process] Unhandled promise rejection', { reason })
})

process.on('uncaughtException', (error) => {
  console.error('[Process] Uncaught exception', {
    name: error.name,
    message: error.message,
    stack: error.stack,
  })
  process.exit(1)
})

app.listen(PORT, () => {
  console.log(`File upload API listening on http://localhost:${PORT}`)
})
