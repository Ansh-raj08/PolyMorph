import multer from 'multer'

const notFoundHandler = (req, res) => {
  res
    .status(404)
    .json({ message: `Route ${req.method} ${req.originalUrl} not found.` })
}

const errorHandler = (error, req, res, next) => {
  if (res.headersSent) {
    return next(error)
  }

  console.error(`[Request ${req.requestId || 'n/a'}] Error handler caught error`, {
    method: req.method,
    path: req.originalUrl,
    name: error.name,
    message: error.message,
    statusCode: error.statusCode || 500,
    stack: error.stack,
  })

  if (error instanceof multer.MulterError) {
    if (error.code === 'LIMIT_FILE_SIZE') {
      return res
        .status(400)
        .json({ message: 'File too large. Max file size is 50MB.' })
    }

    return res.status(400).json({ message: error.message })
  }

  const statusCode = error.statusCode || 500
  const shouldExposeMessage =
    typeof error.expose === 'boolean' ? error.expose : statusCode < 500
  const message = shouldExposeMessage
    ? error.message
    : 'Unexpected server error.'

  return res.status(statusCode).json({ message })
}

export { errorHandler, notFoundHandler }
