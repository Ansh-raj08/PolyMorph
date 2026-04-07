import app from './app.js'
import { startFileCleanupService } from './services/fileCleanupService.js'

const PORT = Number(process.env.PORT) || 4000
const FILE_TTL_MS = Number(process.env.FILE_TTL_MS) || 15 * 60 * 1000
const FILE_CLEANUP_INTERVAL_MS =
  Number(process.env.FILE_CLEANUP_INTERVAL_MS) || 5 * 60 * 1000

let stopCleanupService = null

process.on('unhandledRejection', (reason) => {
  console.error('[Process] Unhandled promise rejection', { reason })
})

process.on('uncaughtException', (error) => {
  console.error('[Process] Uncaught exception', {
    name: error.name,
    message: error.message,
    stack: error.stack,
  })
})

const server = app.listen(PORT, () => {
  console.log(`File upload API listening on http://localhost:${PORT}`)

  stopCleanupService = startFileCleanupService({
    ttlMs: FILE_TTL_MS,
    intervalMs: FILE_CLEANUP_INTERVAL_MS,
  })
})

const shutdown = (signal) => {
  console.info(`[Process] ${signal} received, shutting down server...`)

  if (typeof stopCleanupService === 'function') {
    stopCleanupService()
    stopCleanupService = null
  }

  server.close((error) => {
    if (error) {
      console.error('[Process] Error while closing HTTP server.', {
        message: error.message,
      })
      process.exit(1)
      return
    }

    process.exit(0)
  })

  setTimeout(() => {
    console.error('[Process] Forced shutdown after timeout.')
    process.exit(1)
  }, 10000).unref()
}

process.on('SIGINT', () => shutdown('SIGINT'))
process.on('SIGTERM', () => shutdown('SIGTERM'))
