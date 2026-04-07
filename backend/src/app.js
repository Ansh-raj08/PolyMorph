import { randomUUID } from 'node:crypto'
import path from 'node:path'
import cors from 'cors'
import express from 'express'
import uploadRoutes from './routes/uploadRoutes.js'
import { errorHandler, notFoundHandler } from './middleware/errorHandler.js'
import { verifyLibreOfficeInstallation } from './services/libreOfficeConverter.js'

const app = express()
const configuredFrontendOrigins = (
  process.env.FRONTEND_ORIGIN || 'http://localhost:5173'
)
  .split(',')
  .map((origin) => origin.trim())
  .filter(Boolean)

const localhostOriginPattern = /^https?:\/\/(localhost|127\.0\.0\.1)(:\d+)?$/i

const isAllowedOrigin = (origin) => {
  if (!origin) {
    return true
  }

  if (configuredFrontendOrigins.includes(origin)) {
    return true
  }

  return localhostOriginPattern.test(origin)
}

app.use((req, res, next) => {
  req.requestId = randomUUID()
  res.setHeader('X-Request-Id', req.requestId)
  next()
})

app.use((req, res, next) => {
  const startedAt = Date.now()

  console.info(`[Request ${req.requestId}] Incoming request`, {
    method: req.method,
    path: req.originalUrl,
    origin: req.headers.origin || null,
    contentType: req.headers['content-type'] || null,
  })

  res.on('finish', () => {
    console.info(`[Request ${req.requestId}] Request finished`, {
      method: req.method,
      path: req.originalUrl,
      statusCode: res.statusCode,
      durationMs: Date.now() - startedAt,
    })
  })

  next()
})

app.use(
  cors({
    origin: (origin, callback) => {
      if (isAllowedOrigin(origin)) {
        callback(null, true)
        return
      }

      const error = new Error(`Origin ${origin} is not allowed by CORS.`)
      error.statusCode = 403
      error.expose = true
      callback(error)
    },
    optionsSuccessStatus: 204,
  }),
)

app.use(express.json())

// Serve converted files for download.
app.use('/outputs', express.static(path.resolve(process.cwd(), 'outputs')))

// Basic health check
app.get('/health', (_req, res) => {
  res.status(200).json({ status: 'ok' })
})

// Diagnostic endpoint - checks LibreOffice installation and system status
app.get('/debug/status', async (_req, res) => {
  const libreOffice = await verifyLibreOfficeInstallation()

  res.status(200).json({
    status: libreOffice.installed ? 'ready' : 'degraded',
    timestamp: new Date().toISOString(),
    libreOffice: {
      installed: libreOffice.installed,
      path: libreOffice.path,
      version: libreOffice.version,
      error: libreOffice.error,
    },
    directories: {
      uploads: 'uploads/',
      outputs: 'outputs/',
    },
    supportedConversions: [
      { from: 'Word (DOCX)', to: 'PDF' },
      { from: 'Excel (XLSX)', to: 'PDF' },
      { from: 'PowerPoint (PPTX)', to: 'PDF' },
    ],
    limitedConversions: [
      {
        from: 'PDF',
        to: 'Word (DOCX)',
        note: 'Best effort for text-based PDFs; scanned/complex PDFs may fail.',
      },
    ],
    upcomingConversions: [
      'Image, audio, and video conversions shown in UI as Coming Soon',
    ],
  })
})

app.use('/upload', uploadRoutes)

app.use(notFoundHandler)
app.use(errorHandler)

export default app
