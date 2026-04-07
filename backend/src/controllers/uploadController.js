import path from 'node:path'
import {
  convertFileWithLibreOffice,
  validateUploadedFileForConversion,
} from '../services/libreOfficeConverter.js'

const uploadSingleFile = (req, res, next) => {
  const requestId = req.requestId || 'n/a'

  try {
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
  } catch (error) {
    console.error(`[Request ${requestId}] Upload failed`, {
      message: error.message,
      stack: error.stack,
    })
    return next(error)
  }
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

    const warnings = []

    if (validatedFile.conversionPlan.availability === 'limited') {
      warnings.push(
        validatedFile.conversionPlan.limitedWarning ||
          'This conversion works best for simple text-based PDFs. Complex or scanned files may fail.',
      )
    }

    if (req.fileValidation?.pdfLikelyScanned) {
      warnings.push(
        'The uploaded PDF appears image-based or scanned. Text extraction quality may be limited.',
      )
    }

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
      warnings,
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
