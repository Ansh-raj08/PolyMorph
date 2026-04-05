import path from 'node:path'
import {
  convertFileWithLibreOffice,
  validateUploadedFileForConversion,
} from '../services/libreOfficeConverter.js'

const uploadSingleFile = (req, res) => {
  if (!req.file) {
    return res
      .status(400)
      .json({ message: 'No file uploaded. Use form-data key "file".' })
  }

  const absoluteFilePath = path.resolve(req.file.path)
  const filePath = path.join('uploads', req.file.filename).replace(/\\/g, '/')

  console.info('[Upload] File stored successfully.', {
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
  if (!req.file) {
    return res
      .status(400)
      .json({ message: 'No file uploaded. Use form-data key "file".' })
  }

  const absoluteSourcePath = path.resolve(req.file.path)

  console.info('[Upload] Conversion request received.', {
    originalName: req.file.originalname,
    storedFileName: req.file.filename,
    mimeType: req.file.mimetype,
    uploadedSize: req.file.size,
    absoluteSourcePath,
  })

  try {
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

    console.info('[Upload] Conversion completed.', {
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
    return next(error)
  }
}

export { convertUploadedFile, uploadSingleFile }
