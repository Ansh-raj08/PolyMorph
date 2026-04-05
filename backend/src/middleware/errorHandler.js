import multer from 'multer'

const notFoundHandler = (req, res) => {
  res
    .status(404)
    .json({ message: `Route ${req.method} ${req.originalUrl} not found.` })
}

const errorHandler = (error, _req, res, next) => {
  // Keep Express error middleware signature while satisfying lint rules.
  void next

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
