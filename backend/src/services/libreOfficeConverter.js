import { exec } from 'node:child_process'
import fs from 'node:fs/promises'
import path from 'node:path'
import { promisify } from 'node:util'

const execAsync = promisify(exec)
const outputsDirectory = path.resolve(process.cwd(), 'outputs')
const MIN_CONVERSION_FILE_SIZE_BYTES = 64

// LibreOffice binary paths to search (especially important on macOS)
const LIBREOFFICE_PATHS = [
  'soffice', // PATH lookup first
  '/Applications/LibreOffice.app/Contents/MacOS/soffice', // macOS
  '/usr/bin/soffice', // Linux
  '/usr/local/bin/soffice', // Linux (local)
  '/opt/libreoffice/program/soffice', // Linux (manual install)
  'C:\\Program Files\\LibreOffice\\program\\soffice.exe', // Windows
  'C:\\Program Files (x86)\\LibreOffice\\program\\soffice.exe', // Windows 32-bit
]

let cachedLibreOfficePath = null

const conversionByExtension = {
  '.pdf': {
    from: 'PDF',
    to: 'Word',
    outputExtension: '.docx',
    convertToArgs: ['docx:"MS Word 2007 XML"', 'docx'],
    availability: 'limited',
    allowedMimeTypes: ['application/pdf'],
  },
  '.docx': {
    from: 'Word',
    to: 'PDF',
    outputExtension: '.pdf',
    convertToArgs: ['pdf'],
    availability: 'supported',
    allowedMimeTypes: [
      'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
      'application/octet-stream',
      'application/zip',
    ],
  },
  '.xlsx': {
    from: 'Excel',
    to: 'PDF',
    outputExtension: '.pdf',
    convertToArgs: ['pdf'],
    availability: 'supported',
    allowedMimeTypes: [
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      'application/octet-stream',
      'application/zip',
    ],
  },
  '.pptx': {
    from: 'PowerPoint',
    to: 'PDF',
    outputExtension: '.pdf',
    convertToArgs: ['pdf'],
    availability: 'supported',
    allowedMimeTypes: [
      'application/vnd.openxmlformats-officedocument.presentationml.presentation',
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

/**
 * Find and verify LibreOffice installation
 */
const findLibreOfficePath = async () => {
  if (cachedLibreOfficePath) {
    return cachedLibreOfficePath
  }

  console.info('[LibreOffice] Searching for LibreOffice installation...')

  for (const binaryPath of LIBREOFFICE_PATHS) {
    try {
      // For PATH-based lookup, use 'which' or 'where'
      if (binaryPath === 'soffice') {
        const { stdout } = await execAsync(
          process.platform === 'win32' ? 'where soffice' : 'which soffice',
          { timeout: 5000 },
        )
        const foundPath = stdout.trim().split('\n')[0]
        if (foundPath) {
          console.info(`[LibreOffice] Found in PATH: ${foundPath}`)
          cachedLibreOfficePath = foundPath
          return foundPath
        }
      } else {
        // Check if binary exists at specific path
        await fs.access(binaryPath, fs.constants.X_OK)
        console.info(`[LibreOffice] Found at: ${binaryPath}`)
        cachedLibreOfficePath = binaryPath
        return binaryPath
      }
    } catch {
      // Continue to next path
    }
  }

  console.error('[LibreOffice] NOT FOUND! Searched paths:', LIBREOFFICE_PATHS)
  return null
}

/**
 * Verify LibreOffice is working
 */
const verifyLibreOfficeInstallation = async () => {
  const soffice = await findLibreOfficePath()

  if (!soffice) {
    return {
      installed: false,
      path: null,
      version: null,
      error: 'LibreOffice not found. Please install LibreOffice and ensure soffice is in PATH.',
    }
  }

  try {
    const { stdout } = await execAsync(`${shellEscape(soffice)} --version`, {
      timeout: 10000,
    })
    const version = stdout.trim()
    console.info(`[LibreOffice] Version: ${version}`)

    return {
      installed: true,
      path: soffice,
      version,
      error: null,
    }
  } catch (err) {
    return {
      installed: true,
      path: soffice,
      version: 'unknown',
      error: `LibreOffice found but version check failed: ${err.message}`,
    }
  }
}

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

  if (extension === '.docx' || extension === '.xlsx' || extension === '.pptx') {
    return hasZipSignature(headerBuffer)
  }

  return false
}

const getSupportedConversionPlan = ({ fileName, mimeType }) => {
  const inputExtension = path.extname(fileName).toLowerCase()
  const conversionPlan = conversionByExtension[inputExtension]

  if (!conversionPlan) {
    throw createHttpError(400, 'This conversion type is not supported yet')
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
  debugInfo,
}) => {
  const startTime = Date.now()
  debugInfo.conversionAttempts = debugInfo.conversionAttempts || []

  const attemptInfo = {
    command,
    expectedOutput: outputCandidatePath,
    startTime: new Date().toISOString(),
  }

  try {
    console.info(`[LibreOffice] Executing: ${command}`)

    const { stdout, stderr } = await execAsync(command, {
      windowsHide: true,
      maxBuffer: 10 * 1024 * 1024,
      timeout: 120000, // 2 minute timeout for large files
    })

    attemptInfo.durationMs = Date.now() - startTime
    attemptInfo.stdout = stdout?.trim() || null
    attemptInfo.stderr = stderr?.trim() || null

    if (stdout?.trim()) {
      console.info(`[LibreOffice] ${conversionLabel} stdout:`, stdout.trim())
    }

    if (stderr?.trim()) {
      console.warn(`[LibreOffice] ${conversionLabel} stderr:`, stderr.trim())
    }

    // Check if output file was created
    const outputExists = await fileExists(outputCandidatePath)
    attemptInfo.outputCreated = outputExists

    if (outputExists) {
      const outputStats = await fs.stat(outputCandidatePath)
      attemptInfo.outputSize = outputStats.size
      attemptInfo.success = outputStats.size > 0

      if (outputStats.size === 0) {
        console.error(`[LibreOffice] Output file created but is EMPTY: ${outputCandidatePath}`)
        attemptInfo.error = 'Output file is empty (0 bytes)'
        debugInfo.conversionAttempts.push(attemptInfo)
        return false
      }

      console.info(`[LibreOffice] Output created: ${outputCandidatePath} (${outputStats.size} bytes)`)
      debugInfo.conversionAttempts.push(attemptInfo)
      return true
    }

    attemptInfo.success = false
    attemptInfo.error = 'Output file not created'
    console.error(
      `[LibreOffice] ${conversionLabel} finished without output file at ${outputCandidatePath}`,
    )
    debugInfo.conversionAttempts.push(attemptInfo)
    return false
  } catch (error) {
    attemptInfo.durationMs = Date.now() - startTime
    attemptInfo.success = false
    attemptInfo.error = error.message
    attemptInfo.stdout = error.stdout?.trim() || null
    attemptInfo.stderr = error.stderr?.trim() || null
    attemptInfo.exitCode = error.code

    console.error(`[LibreOffice] ${conversionLabel} command failed:`, {
      message: error.message,
      exitCode: error.code,
      stdout: error.stdout?.trim(),
      stderr: error.stderr?.trim(),
    })

    debugInfo.conversionAttempts.push(attemptInfo)
    return false
  }
}

const convertFileWithLibreOffice = async ({
  sourceFilePath,
  sourceOriginalName,
  sourceFileSize,
  conversionPlan,
}) => {
  const debugInfo = {
    step: 'libreoffice_conversion',
    startTime: new Date().toISOString(),
    sourceFilePath,
    sourceOriginalName,
    sourceFileSize,
    conversionFrom: conversionPlan.from,
    conversionTo: conversionPlan.to,
  }

  await fs.mkdir(outputsDirectory, { recursive: true })

  // CRITICAL: Verify LibreOffice is installed
  const libreOffice = await verifyLibreOfficeInstallation()
  debugInfo.libreOfficeInfo = libreOffice

  if (!libreOffice.installed || !libreOffice.path) {
    console.error('[Conversion] LibreOffice not available', debugInfo)
    throw createHttpError(
      500,
      `LibreOffice is not installed or not in PATH. ${libreOffice.error || 'Please install LibreOffice.'}`,
    )
  }

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

  debugInfo.absoluteSourcePath = absoluteSourcePath
  debugInfo.generatedOutputPath = generatedOutputPath
  debugInfo.finalOutputPath = finalOutputPath

  try {
    // STEP 1: Verify source file exists and is readable
    const sourceExists = await fileExists(absoluteSourcePath)
    if (!sourceExists) {
      debugInfo.error = 'Source file not found'
      console.error('[Conversion] Source file missing', debugInfo)
      throw createHttpError(400, 'Uploaded file was not found at conversion time.')
    }

    // Read and log source file header for debugging
    const sourceHeader = await readFileHeader(absoluteSourcePath, 16)
    debugInfo.sourceHeaderHex = sourceHeader.toString('hex').toUpperCase()
    debugInfo.sourceHeaderAscii = sourceHeader.toString('utf8').replace(/[^\x20-\x7E]/g, '.').slice(0, 16)

    console.info('[Conversion] Starting LibreOffice conversion', {
      source: absoluteSourcePath,
      sourceSize: sourceFileSize,
      sourceHeader: debugInfo.sourceHeaderHex,
      conversion: `${conversionPlan.from} -> ${conversionPlan.to}`,
      libreOffice: libreOffice.path,
    })

    // STEP 2: Remove existing output file if present
    if (await fileExists(generatedOutputPath)) {
      console.info(`[Conversion] Removing existing output: ${generatedOutputPath}`)
      await fs.rm(generatedOutputPath, { force: true })
    }

    // STEP 3: Run conversion with all available format options
    let isSuccessful = false
    for (const convertToArg of conversionPlan.convertToArgs) {
      const conversionLabel = `${conversionPlan.from} -> ${conversionPlan.to}`
      const command = [
        shellEscape(libreOffice.path), // Use full path, not just 'soffice'
        '--headless',
        '--invisible',
        '--nologo',
        '--nofirststartwizard',
        '--convert-to',
        convertToArg,
        '--outdir',
        shellEscape(outputsDirectory),
        shellEscape(absoluteSourcePath),
      ].join(' ')

      console.info('[Conversion] Running command:', command)

      isSuccessful = await runConversionAttempt({
        command,
        outputCandidatePath: generatedOutputPath,
        conversionLabel,
        debugInfo,
      })

      if (isSuccessful) {
        break
      }
    }

    if (!isSuccessful) {
      debugInfo.error = 'All conversion attempts failed'
      console.error('[Conversion] All attempts failed', debugInfo)
      throw createHttpError(
        500,
        'Conversion failed. The file may be corrupted, password-protected, or incompatible with LibreOffice.',
      )
    }

    // STEP 4: Verify output file integrity
    await fs.rename(generatedOutputPath, finalOutputPath)
    const outputStats = await fs.stat(finalOutputPath)

    debugInfo.outputFileSize = outputStats.size
    debugInfo.durationMs = Date.now() - new Date(debugInfo.startTime).getTime()

    // Read output file header for verification
    const outputHeader = await readFileHeader(finalOutputPath, 16)
    debugInfo.outputHeaderHex = outputHeader.toString('hex').toUpperCase()

    // Verify output isn't empty or corrupted
    if (outputStats.size === 0) {
      debugInfo.error = 'Output file is empty'
      console.error('[Conversion] Output file is empty!', debugInfo)
      throw createHttpError(500, 'Conversion produced an empty file. Source file may be corrupted.')
    }

    // Verify output has correct magic bytes
    const expectedMagic = conversionPlan.outputExtension === '.pdf' 
      ? '%PDF-' 
      : 'PK' // ZIP signature for DOCX

    const outputMagic = outputHeader.toString('utf8').slice(0, expectedMagic.length)
    if (!outputMagic.startsWith(expectedMagic.slice(0, 2))) {
      debugInfo.warning = `Output header doesn't match expected format: ${outputMagic}`
      console.warn('[Conversion] Output format warning', debugInfo)
    }

    console.info('[Conversion] SUCCESS', {
      output: finalOutputPath,
      outputSize: outputStats.size,
      durationMs: debugInfo.durationMs,
    })

    return {
      fileName: finalFileName,
      fileSize: outputStats.size,
      filePath: path.join('outputs', finalFileName).replace(/\\/g, '/'),
      from: conversionPlan.from,
      to: conversionPlan.to,
      debugInfo,
    }
  } catch (error) {
    debugInfo.error = error.message
    debugInfo.stack = error.stack
    console.error('[Conversion] FAILED', debugInfo)
    throw error
  }
}

export {
  convertFileWithLibreOffice,
  getSupportedConversionPlan,
  validateUploadedFileForConversion,
  verifyLibreOfficeInstallation,
  findLibreOfficePath,
}