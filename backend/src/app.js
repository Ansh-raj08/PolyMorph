import { randomUUID } from 'node:crypto'
import path from 'node:path'
import cors from 'cors'
import express from 'express'
import uploadRoutes from './routes/uploadRoutes.js'
import { errorHandler, notFoundHandler } from './middleware/errorHandler.js'
import { verifyLibreOfficeInstallation } from './services/libreOfficeConverter.js'

const app = express()
const parseOriginList = (value = '') =>
  value
    .split(',')
    .map((origin) => origin.trim())
    .filter(Boolean)

const configuredFrontendOrigins = parseOriginList(
  [process.env.FRONTEND_ORIGIN, process.env.CORS_ALLOWED_ORIGINS]
    .filter(Boolean)
    .join(','),
)
const REQUEST_TIMEOUT_MS = Number(process.env.REQUEST_TIMEOUT_MS) || 240000

const isProduction = process.env.NODE_ENV === 'production'

const localhostOriginPattern = /^https?:\/\/(localhost|127\.0\.0\.1)(:\d+)?$/i

if (isProduction && configuredFrontendOrigins.length === 0) {
  console.warn(
    '[CORS] No FRONTEND_ORIGIN/CORS_ALLOWED_ORIGINS configured in production. Cross-origin browser requests will be blocked.',
  )
}

const isAllowedOrigin = (origin) => {
  if (!origin) {
    return true
  }

  if (configuredFrontendOrigins.includes(origin)) {
    return true
  }

  if (!isProduction && localhostOriginPattern.test(origin)) {
    return true
  }

  return false
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

app.use((req, res, next) => {
  res.setTimeout(REQUEST_TIMEOUT_MS, () => {
    console.error(`[Request ${req.requestId}] Request timed out.`, {
      path: req.originalUrl,
      timeoutMs: REQUEST_TIMEOUT_MS,
    })

    if (!res.headersSent) {
      res.status(504).json({ message: 'Request timed out. Please try again.' })
    }
  })

  next()
})

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
