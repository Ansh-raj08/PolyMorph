import fs from 'node:fs'
import path from 'node:path'
import multer from 'multer'

const MAX_FILE_SIZE = 50 * 1024 * 1024
const uploadsDirectory = path.resolve(process.cwd(), 'uploads')

const allowedMimeTypesByExtension = {
  '.pdf': ['application/pdf'],
  '.docx': [
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    'application/octet-stream',
    'application/zip',
  ],
}

const storage = multer.diskStorage({
  destination: (_req, _file, callback) => {
    fs.mkdir(uploadsDirectory, { recursive: true }, (mkdirError) => {
      if (mkdirError) {
        callback(mkdirError)
        return
      }

      callback(null, uploadsDirectory)
    })
  },
  filename: (_req, file, callback) => {
    const extension = path.extname(file.originalname).toLowerCase()
    const safeBaseName = path
      .basename(file.originalname, extension)
      .replace(/[^a-zA-Z0-9_-]/g, '_')
      .slice(0, 60)

    const fileBaseName = safeBaseName || 'upload'
    const uniqueSuffix = `${Date.now()}-${Math.round(Math.random() * 1e9)}`

    callback(null, `${fileBaseName}-${uniqueSuffix}${extension}`)
  },
})

const fileFilter = (_req, file, callback) => {
  const extension = path.extname(file.originalname).toLowerCase()
  const mimeType = file.mimetype.toLowerCase()
  const allowedMimeTypes = allowedMimeTypesByExtension[extension]

  if (!allowedMimeTypes) {
    const error = new Error(
      'Invalid file extension. Allowed: pdf, docx.',
    )
    error.statusCode = 400
    callback(error)
    return
  }

  if (!allowedMimeTypes.includes(mimeType)) {
    const error = new Error(
      'Invalid MIME type for this extension. Allowed: application/pdf and DOCX MIME types.',
    )
    error.statusCode = 400
    callback(error)
    return
  }

  callback(null, true)
}

const upload = multer({
  storage,
  limits: { fileSize: MAX_FILE_SIZE, files: 1 },
  fileFilter,
})

export { MAX_FILE_SIZE, upload }
