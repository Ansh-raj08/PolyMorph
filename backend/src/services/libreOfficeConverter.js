import { exec } from 'node:child_process'
import fs from 'node:fs/promises'
import path from 'node:path'
import { promisify } from 'node:util'

const execAsync = promisify(exec)
const outputsDirectory = path.resolve(process.cwd(), 'outputs')
const MIN_CONVERSION_FILE_SIZE_BYTES = 64

const conversionByExtension = {
  '.pdf': {
    from: 'PDF',
    to: 'Word',
    outputExtension: '.docx',
    convertToArgs: ['docx:"MS Word 2007 XML"', 'docx'],
    allowedMimeTypes: ['application/pdf'],
  },
  '.docx': {
    from: 'Word',
    to: 'PDF',
    outputExtension: '.pdf',
    convertToArgs: ['pdf'],
    allowedMimeTypes: [
      'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
      'application/octet-stream',
      'application/zip',
    ],
  },
}

const createHttpError = (statusCode, message) => {
  const error = new Error(message)
  error.statusCode = statusCode
  error.expose = true
  return error
}

const sanitizeBaseName = (fileName) =>
  path
    .basename(fileName, path.extname(fileName))
    .replace(/[^a-zA-Z0-9_-]/g, '_')
    .slice(0, 60) || 'converted'

const shellEscape = (value) => `'${String(value).replace(/'/g, `'\\''`)}'`

const fileExists = async (filePath) => {
  try {
    await fs.access(filePath)
    return true
  } catch {
    return false
  }
}

const readFileHeader = async (filePath, bytesToRead = 8) => {
  const fileHandle = await fs.open(filePath, 'r')

  try {
    const headerBuffer = Buffer.alloc(bytesToRead)
    const { bytesRead } = await fileHandle.read(headerBuffer, 0, bytesToRead, 0)

    return headerBuffer.subarray(0, bytesRead)
  } finally {
    await fileHandle.close()
  }
}

const hasZipSignature = (headerBuffer) => {
  if (headerBuffer.length < 4) {
    return false
  }

  const zipSignatures = [
    [0x50, 0x4b, 0x03, 0x04],
    [0x50, 0x4b, 0x05, 0x06],
    [0x50, 0x4b, 0x07, 0x08],
  ]

  return zipSignatures.some((signature) =>
    signature.every((byte, index) => headerBuffer[index] === byte),
  )
}

const headerMatchesExtension = ({ headerBuffer, extension }) => {
  if (extension === '.pdf') {
    return headerBuffer.subarray(0, 5).toString('utf8') === '%PDF-'
  }

  if (extension === '.docx') {
    return hasZipSignature(headerBuffer)
  }

  return false
}

const getSupportedConversionPlan = ({ fileName, mimeType }) => {
  const inputExtension = path.extname(fileName).toLowerCase()
  const conversionPlan = conversionByExtension[inputExtension]

  if (!conversionPlan) {
    throw createHttpError(
      400,
      'Unsupported conversion type. Only PDF -> Word and Word -> PDF are allowed.',
    )
  }

  if (
    mimeType &&
    !conversionPlan.allowedMimeTypes.includes(mimeType.toLowerCase())
  ) {
    throw createHttpError(400, 'Unsupported MIME type for the selected conversion.')
  }

  return {
    ...conversionPlan,
    inputExtension,
  }
}

const validateUploadedFileForConversion = async ({
  sourceFilePath,
  sourceOriginalName,
  mimeType,
  reportedFileSize,
}) => {
  const absoluteSourcePath = path.resolve(sourceFilePath)
  const extensionFromOriginalName = path
    .extname(sourceOriginalName)
    .toLowerCase()
  const extensionFromStoredPath = path.extname(absoluteSourcePath).toLowerCase()
  const conversionPlan = getSupportedConversionPlan({
    fileName: sourceOriginalName,
    mimeType,
  })

  console.info('[Validation] Pre-conversion checks started.', {
    sourceOriginalName,
    mimeType,
    reportedFileSize,
    absoluteSourcePath,
    extensionFromOriginalName,
    extensionFromStoredPath,
  })

  if (
    extensionFromStoredPath &&
    extensionFromStoredPath !== extensionFromOriginalName
  ) {
    throw createHttpError(
      400,
      'Uploaded file extension mismatch between original name and stored file.',
    )
  }

  const sourceExists = await fileExists(absoluteSourcePath)
  if (!sourceExists) {
    throw createHttpError(400, 'Uploaded file is missing from disk before conversion.')
  }

  const fileStats = await fs.stat(absoluteSourcePath)
  if (!fileStats.isFile()) {
    throw createHttpError(400, 'Uploaded path is not a valid file.')
  }

  if (fileStats.size < MIN_CONVERSION_FILE_SIZE_BYTES) {
    throw createHttpError(
      400,
      `Uploaded file is too small to be a valid PDF or DOCX (minimum ${MIN_CONVERSION_FILE_SIZE_BYTES} bytes).`,
    )
  }

  if (reportedFileSize > 0 && fileStats.size !== reportedFileSize) {
    console.warn('[Validation] File size mismatch detected between multer and disk.', {
      reportedFileSize,
      diskFileSize: fileStats.size,
      absoluteSourcePath,
    })
  }

  const headerBuffer = await readFileHeader(absoluteSourcePath, 8)

  if (
    !headerMatchesExtension({
      headerBuffer,
      extension: conversionPlan.inputExtension,
    })
  ) {
    throw createHttpError(
      400,
      'Uploaded file content does not match its extension/MIME type.',
    )
  }

  console.info('[Validation] Pre-conversion checks passed.', {
    absoluteSourcePath,
    diskFileSize: fileStats.size,
    conversionFrom: conversionPlan.from,
    conversionTo: conversionPlan.to,
  })

  return {
    absoluteSourcePath,
    actualFileSize: fileStats.size,
    conversionPlan,
  }
}

const runConversionAttempt = async ({
  command,
  outputCandidatePath,
  conversionLabel,
}) => {
  try {
    const { stdout, stderr } = await execAsync(command, {
      windowsHide: true,
      maxBuffer: 10 * 1024 * 1024,
    })

    if (stdout?.trim()) {
      console.info(`[LibreOffice] ${conversionLabel} stdout:`, stdout.trim())
    }

    if (stderr?.trim()) {
      console.error(`[LibreOffice] ${conversionLabel} stderr:`, stderr.trim())
    }

    if (await fileExists(outputCandidatePath)) {
      return true
    }

    console.error(
      `[LibreOffice] ${conversionLabel} finished without output file at ${outputCandidatePath}.`,
    )
    return false
  } catch (error) {
    console.error(`[LibreOffice] ${conversionLabel} command failed.`, {
      message: error.message,
      stdout: error.stdout?.trim(),
      stderr: error.stderr?.trim(),
      command,
    })
    return false
  }
}

const convertFileWithLibreOffice = async ({
  sourceFilePath,
  sourceOriginalName,
  sourceFileSize,
  conversionPlan,
}) => {
  await fs.mkdir(outputsDirectory, { recursive: true })

  const absoluteSourcePath = path.resolve(sourceFilePath)
  const safeBaseName = sanitizeBaseName(sourceOriginalName)
  const conversionId = `${Date.now()}-${Math.round(Math.random() * 1e9)}`
  const sourceBaseName = path.basename(
    absoluteSourcePath,
    conversionPlan.inputExtension,
  )
  const generatedOutputPath = path.join(
    outputsDirectory,
    `${sourceBaseName}${conversionPlan.outputExtension}`,
  )
  const finalFileName = `${safeBaseName}-${conversionId}${conversionPlan.outputExtension}`
  const finalOutputPath = path.join(outputsDirectory, finalFileName)

  try {
    const sourceExists = await fileExists(absoluteSourcePath)
    console.info('[Conversion] Starting LibreOffice conversion.', {
      absoluteSourcePath,
      sourceOriginalName,
      sourceFileSize,
      conversionFrom: conversionPlan.from,
      conversionTo: conversionPlan.to,
      outputsDirectory,
    })

    if (!sourceExists) {
      throw createHttpError(400, 'Uploaded file was not found at conversion time.')
    }

    if (await fileExists(generatedOutputPath)) {
      await fs.rm(generatedOutputPath, { force: true })
    }

    let isSuccessful = false
    for (const convertToArg of conversionPlan.convertToArgs) {
      const conversionLabel = `${conversionPlan.from} -> ${conversionPlan.to}`
      const command = [
        'soffice',
        '--headless',
        '--convert-to',
        convertToArg,
        '--outdir',
        shellEscape(outputsDirectory),
        shellEscape(absoluteSourcePath),
      ].join(' ')

      console.info('[Conversion] Running soffice command.', {
        command,
        expectedOutputPath: generatedOutputPath,
      })

      isSuccessful = await runConversionAttempt({
        command,
        outputCandidatePath: generatedOutputPath,
        conversionLabel,
      })

      if (isSuccessful) {
        break
      }
    }

    if (!isSuccessful) {
      throw createHttpError(
        500,
        'Conversion failed. Make sure LibreOffice (soffice) is installed and accessible from PATH.',
      )
    }

    await fs.rename(generatedOutputPath, finalOutputPath)

    const outputStats = await fs.stat(finalOutputPath)

    console.info('[Conversion] Conversion finished successfully.', {
      finalOutputPath,
      outputFileSize: outputStats.size,
    })

    return {
      fileName: finalFileName,
      fileSize: outputStats.size,
      filePath: path.join('outputs', finalFileName).replace(/\\/g, '/'),
      from: conversionPlan.from,
      to: conversionPlan.to,
    }
  } catch (error) {
    console.error('[Conversion] Failed to convert uploaded file.', {
      sourceFilePath,
      sourceOriginalName,
      reason: error.message,
    })
    throw error
  }
}

export {
  convertFileWithLibreOffice,
  getSupportedConversionPlan,
  validateUploadedFileForConversion,
}