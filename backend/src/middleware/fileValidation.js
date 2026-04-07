import fs from 'node:fs/promises'
import path from 'node:path'

/**
 * File Validation Middleware
 * Performs comprehensive file integrity checks AFTER multer saves the file to disk.
 * This catches corrupted uploads, spoofed MIME types, and incomplete transfers.
 */

const FILE_SIGNATURES = {
  '.pdf': {
    magic: Buffer.from([0x25, 0x50, 0x44, 0x46, 0x2d]), // %PDF-
    description: 'PDF header (%PDF-)',
    minSize: 67, // Minimum valid PDF is ~67 bytes
  },
  '.docx': {
    magic: Buffer.from([0x50, 0x4b, 0x03, 0x04]), // PK.. (ZIP signature)
    description: 'ZIP/DOCX header (PK\\x03\\x04)',
    minSize: 2048, // Minimum realistic DOCX
  },
  '.xlsx': {
    magic: Buffer.from([0x50, 0x4b, 0x03, 0x04]),
    description: 'ZIP/XLSX header (PK\\x03\\x04)',
    minSize: 1024,
  },
  '.pptx': {
    magic: Buffer.from([0x50, 0x4b, 0x03, 0x04]),
    description: 'ZIP/PPTX header (PK\\x03\\x04)',
    minSize: 1024,
  },
}

const OPEN_XML_STRUCTURE_MARKERS = {
  '.docx': ['[Content_Types]', 'word/'],
  '.xlsx': ['[Content_Types]', 'xl/'],
  '.pptx': ['[Content_Types]', 'ppt/'],
}

const readFileHeader = async (filePath, bytesToRead = 16) => {
  const handle = await fs.open(filePath, 'r')
  try {
    const buffer = Buffer.alloc(bytesToRead)
    const { bytesRead } = await handle.read(buffer, 0, bytesToRead, 0)
    return buffer.subarray(0, bytesRead)
  } finally {
    await handle.close()
  }
}

const detectLikelyScannedPdf = async (filePath) => {
  const handle = await fs.open(filePath, 'r')

  try {
    const maxBytesToRead = 256 * 1024
    const buffer = Buffer.alloc(maxBytesToRead)
    const { bytesRead } = await handle.read(buffer, 0, maxBytesToRead, 0)
    const content = buffer.subarray(0, bytesRead).toString('latin1')

    const hasTextMarkers = /\/Font|BT|Tj|TJ|ToUnicode/.test(content)
    const hasImageMarkers = /\/Image|\/XObject/.test(content)

    return {
      likelyScanned: hasImageMarkers && !hasTextMarkers,
      hasTextMarkers,
      hasImageMarkers,
    }
  } finally {
    await handle.close()
  }
}

const verifyFileSignature = (headerBuffer, extension) => {
  const sig = FILE_SIGNATURES[extension]
  if (!sig) return { valid: false, reason: `Unknown extension: ${extension}` }

  if (headerBuffer.length < sig.magic.length) {
    return { valid: false, reason: `File too small to contain ${sig.description}` }
  }

  const filePrefix = headerBuffer.subarray(0, sig.magic.length)
  const matches = sig.magic.every((byte, i) => filePrefix[i] === byte)

  if (!matches) {
    const actualHex = filePrefix.toString('hex').toUpperCase()
    const expectedHex = sig.magic.toString('hex').toUpperCase()
    return {
      valid: false,
      reason: `Invalid file header. Expected ${sig.description} (${expectedHex}), got: ${actualHex}`,
    }
  }

  return { valid: true }
}

const createValidationError = (message, debugInfo) => {
  const error = new Error(message)
  error.statusCode = 400
  error.expose = true
  error.debugInfo = debugInfo
  return error
}

/**
 * Middleware: Validates file integrity after multer upload
 * Must be used AFTER multer middleware
 */
const validateFileIntegrity = async (req, res, next) => {
  if (!req.file) {
    return next() // Let controller handle missing file
  }

  const startTime = Date.now()
  const absolutePath = path.resolve(req.file.path)
  const extension = path.extname(req.file.originalname).toLowerCase()

  const debugInfo = {
    step: 'file_integrity_validation',
    originalName: req.file.originalname,
    storedPath: absolutePath,
    reportedSize: req.file.size,
    reportedMimeType: req.file.mimetype,
    extension,
    timestamp: new Date().toISOString(),
  }

  console.info('[FileValidation] Starting integrity check...', debugInfo)

  try {
    // Step 1: Verify file exists on disk
    let stats
    try {
      stats = await fs.stat(absolutePath)
    } catch (err) {
      debugInfo.error = `File not found on disk: ${err.message}`
      console.error('[FileValidation] FAILED: File missing from disk', debugInfo)
      return next(createValidationError(
        'Uploaded file was not saved correctly. Please try again.',
        debugInfo,
      ))
    }

    // Step 2: Verify it's actually a file
    if (!stats.isFile()) {
      debugInfo.error = 'Path exists but is not a file'
      debugInfo.isDirectory = stats.isDirectory()
      console.error('[FileValidation] FAILED: Not a file', debugInfo)
      return next(createValidationError('Invalid upload: not a file.', debugInfo))
    }

    // Step 3: Verify file size is non-zero
    debugInfo.actualDiskSize = stats.size
    if (stats.size === 0) {
      console.error('[FileValidation] FAILED: Zero-byte file', debugInfo)
      return next(createValidationError(
        'Upload failed: file is empty (0 bytes). This usually indicates an incomplete upload.',
        debugInfo,
      ))
    }

    // Step 4: Compare reported size vs actual disk size
    if (req.file.size > 0 && stats.size !== req.file.size) {
      debugInfo.sizeMismatch = {
        reported: req.file.size,
        actual: stats.size,
        difference: Math.abs(stats.size - req.file.size),
      }
      console.warn('[FileValidation] WARNING: Size mismatch detected', debugInfo)
      // Continue but log warning - could indicate incomplete upload
    }

    // Step 5: Check minimum file size for type
    const sig = FILE_SIGNATURES[extension]
    if (sig && stats.size < sig.minSize) {
      debugInfo.error = `File too small for ${extension}: ${stats.size} bytes < ${sig.minSize} bytes minimum`
      console.error('[FileValidation] FAILED: File too small', debugInfo)
      return next(createValidationError(
        `File is too small to be a valid ${extension.slice(1).toUpperCase()} file (${stats.size} bytes). Minimum: ${sig.minSize} bytes.`,
        debugInfo,
      ))
    }

    // Step 6: Read file header and verify magic bytes
    const headerBuffer = await readFileHeader(absolutePath, 16)
    debugInfo.headerHex = headerBuffer.toString('hex').toUpperCase()
    debugInfo.headerAscii = headerBuffer
      .toString('utf8')
      .replace(/[^\x20-\x7E]/g, '.')
      .slice(0, 16)

    const signatureCheck = verifyFileSignature(headerBuffer, extension)
    debugInfo.signatureValid = signatureCheck.valid

    if (!signatureCheck.valid) {
      debugInfo.error = signatureCheck.reason
      console.error('[FileValidation] FAILED: Invalid file signature', debugInfo)

      // Attempt to identify actual file type
      const actualType = identifyFileType(headerBuffer)
      debugInfo.detectedType = actualType

      return next(createValidationError(
        `File content does not match ${extension} format. ${signatureCheck.reason}. ${actualType ? `Detected type: ${actualType}` : 'Unknown file type.'}`,
        debugInfo,
      ))
    }

    // Step 6.5: Best-effort scanned PDF detection (warning only, no hard reject)
    if (extension === '.pdf') {
      const pdfScanCheck = await detectLikelyScannedPdf(absolutePath)
      debugInfo.pdfLikelyScanned = pdfScanCheck.likelyScanned
      debugInfo.pdfHasTextMarkers = pdfScanCheck.hasTextMarkers
      debugInfo.pdfHasImageMarkers = pdfScanCheck.hasImageMarkers

      if (pdfScanCheck.likelyScanned) {
        console.warn('[FileValidation] PDF appears scanned/image-based', debugInfo)
      }
    }

    // Step 7: For OpenXML files, verify basic package structure
    if (OPEN_XML_STRUCTURE_MARKERS[extension]) {
      const packageCheck = await verifyOpenXmlStructure(absolutePath, extension)
      debugInfo.openXmlStructureValid = packageCheck.valid

      if (!packageCheck.valid) {
        debugInfo.error = packageCheck.reason
        console.error('[FileValidation] FAILED: Invalid OpenXML structure', debugInfo)
        return next(createValidationError(
          `Invalid ${extension.slice(1).toUpperCase()} file: ${packageCheck.reason}`,
          debugInfo,
        ))
      }
    }

    // Validation passed!
    debugInfo.validationTimeMs = Date.now() - startTime
    debugInfo.status = 'PASSED'
    console.info('[FileValidation] All checks passed', debugInfo)

    // Attach debug info to request for downstream use
    req.fileValidation = debugInfo

    return next()
  } catch (err) {
    debugInfo.unexpectedError = err.message
    debugInfo.stack = err.stack
    console.error('[FileValidation] Unexpected error during validation', debugInfo)
    return next(err)
  }
}

/**
 * Try to identify what type of file this actually is based on magic bytes
 */
const identifyFileType = (headerBuffer) => {
  const signatures = [
    { magic: [0x25, 0x50, 0x44, 0x46], type: 'PDF' },
    { magic: [0x50, 0x4b, 0x03, 0x04], type: 'ZIP/DOCX/XLSX' },
    { magic: [0x50, 0x4b, 0x05, 0x06], type: 'ZIP (empty)' },
    { magic: [0xff, 0xd8, 0xff], type: 'JPEG image' },
    { magic: [0x89, 0x50, 0x4e, 0x47], type: 'PNG image' },
    { magic: [0x47, 0x49, 0x46, 0x38], type: 'GIF image' },
    { magic: [0x52, 0x61, 0x72, 0x21], type: 'RAR archive' },
    { magic: [0x1f, 0x8b], type: 'GZIP' },
    { magic: [0x42, 0x5a, 0x68], type: 'BZIP2' },
    { magic: [0x7b], type: 'JSON (starts with {)' },
    { magic: [0x3c], type: 'XML/HTML (starts with <)' },
  ]

  for (const sig of signatures) {
    if (sig.magic.every((b, i) => headerBuffer[i] === b)) {
      return sig.type
    }
  }

  // Check if it's plain text
  const isText = headerBuffer.every((b) => (b >= 0x20 && b <= 0x7e) || b === 0x0a || b === 0x0d || b === 0x09)
  if (isText) {
    return 'Plain text (not a binary file)'
  }

  return null
}

/**
 * Verify OpenXML internal structure (DOCX/XLSX/PPTX are ZIP packages)
 */
const verifyOpenXmlStructure = async (filePath, extension) => {
  const markers = OPEN_XML_STRUCTURE_MARKERS[extension]
  if (!markers) {
    return { valid: true }
  }

  try {
    // Read enough data to find package markers.
    const handle = await fs.open(filePath, 'r')
    try {
      const buffer = Buffer.alloc(8192)
      const { bytesRead } = await handle.read(buffer, 0, 8192, 0)
      const content = buffer.subarray(0, bytesRead).toString('utf8', 0, bytesRead)

      if (!markers.some((marker) => content.includes(marker))) {
        return {
          valid: false,
          reason: `ZIP file does not contain expected ${extension.slice(1).toUpperCase()} structure markers`,
        }
      }

      return { valid: true }
    } finally {
      await handle.close()
    }
  } catch {
    return { valid: false, reason: 'Could not read file structure' }
  }
}

export { validateFileIntegrity, FILE_SIGNATURES, identifyFileType }
