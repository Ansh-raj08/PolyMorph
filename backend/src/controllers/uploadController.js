import path from 'node:path'
import {
  convertFileWithLibreOffice,
  validateUploadedFileForConversion,
} from '../services/libreOfficeConverter.js'

const uploadSingleFile = (req, res) => {
  const requestId = req.requestId || 'n/a'

  console.info(`[Request ${requestId}] Upload controller started`, {
    hasFile: Boolean(req.file),
  })

  if (!req.file) {
    console.warn(`[Request ${requestId}] Upload failed - no file in request`)
    return res
      .status(400)
      .json({ message: 'No file uploaded. Use form-data key "file".' })
  }

  const absoluteFilePath = path.resolve(req.file.path)
  const filePath = path.join('uploads', req.file.filename).replace(/\\/g, '/')

  console.info(`[Request ${requestId}] File received`, {
    originalName: req.file.originalname,
    storedFileName: req.file.filename,
    mimeType: req.file.mimetype,
    size: req.file.size,
    absoluteFilePath,
  })

  return res.status(201).json({
    message: 'File uploaded successfully',
    fileName: req.file.originalname,
    fileSize: req.file.size,
    filePath,
  })
}

const convertUploadedFile = async (req, res, next) => {
  const requestId = req.requestId || 'n/a'

  console.info(`[Request ${requestId}] Conversion controller started`, {
    hasFile: Boolean(req.file),
  })

  if (!req.file) {
    console.warn(`[Request ${requestId}] Conversion failed - no file in request`)
    return res
      .status(400)
      .json({ message: 'No file uploaded. Use form-data key "file".' })
  }

  const absoluteSourcePath = path.resolve(req.file.path)

  console.info(`[Request ${requestId}] File received for conversion`, {
    originalName: req.file.originalname,
    storedFileName: req.file.filename,
    mimeType: req.file.mimetype,
    uploadedSize: req.file.size,
    absoluteSourcePath,
  })

  try {
    console.info(`[Request ${requestId}] Conversion started`, {
      sourceOriginalName: req.file.originalname,
      absoluteSourcePath,
    })

    const validatedFile = await validateUploadedFileForConversion({
      sourceFilePath: absoluteSourcePath,
      sourceOriginalName: req.file.originalname,
      mimeType: req.file.mimetype,
      reportedFileSize: req.file.size,
    })

    const convertedFile = await convertFileWithLibreOffice({
      sourceFilePath: validatedFile.absoluteSourcePath,
      sourceOriginalName: req.file.originalname,
      sourceFileSize: validatedFile.actualFileSize,
      conversionPlan: validatedFile.conversionPlan,
    })

    const sourceFilePath = path
      .join('uploads', req.file.filename)
      .replace(/\\/g, '/')

    console.info(`[Request ${requestId}] Conversion finished`, {
      sourceFilePath,
      convertedFilePath: convertedFile.filePath,
      sourceSize: validatedFile.actualFileSize,
      convertedSize: convertedFile.fileSize,
    })

    return res.status(201).json({
      message: 'File converted successfully',
      sourceFile: {
        fileName: req.file.originalname,
        fileSize: validatedFile.actualFileSize,
        filePath: sourceFilePath,
      },
      convertedFile,
    })
  } catch (error) {
    console.error(`[Request ${requestId}] Conversion failed`, {
      message: error.message,
      stack: error.stack,
      originalName: req.file?.originalname,
      storedFileName: req.file?.filename,
    })

    return next(error)
  }
}

export { convertUploadedFile, uploadSingleFile }
