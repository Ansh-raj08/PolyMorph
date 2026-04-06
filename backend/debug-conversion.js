#!/usr/bin/env node
/**
 * File Conversion Pipeline Debugger
 * 
 * This script helps debug "file is damaged" errors by testing each stage
 * of the conversion pipeline independently.
 * 
 * Usage:
 *   node backend/debug-conversion.js <path-to-file>
 *   node backend/debug-conversion.js --check-libreoffice
 */

import fs from 'node:fs/promises'
import path from 'node:path'
import { exec } from 'node:child_process'
import { promisify } from 'node:util'

const execAsync = promisify(exec)

const COLORS = {
  reset: '\x1b[0m',
  red: '\x1b[31m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  cyan: '\x1b[36m',
}

const log = {
  info: (msg) => console.log(`${COLORS.blue}[INFO]${COLORS.reset} ${msg}`),
  success: (msg) => console.log(`${COLORS.green}[OK]${COLORS.reset} ${msg}`),
  warn: (msg) => console.log(`${COLORS.yellow}[WARN]${COLORS.reset} ${msg}`),
  error: (msg) => console.log(`${COLORS.red}[ERROR]${COLORS.reset} ${msg}`),
  debug: (msg) => console.log(`${COLORS.cyan}[DEBUG]${COLORS.reset} ${msg}`),
}

const FILE_SIGNATURES = {
  '.pdf': { magic: Buffer.from([0x25, 0x50, 0x44, 0x46, 0x2d]), name: '%PDF-' },
  '.docx': { magic: Buffer.from([0x50, 0x4b, 0x03, 0x04]), name: 'PK..' },
}

const LIBREOFFICE_PATHS = [
  'soffice',
  '/Applications/LibreOffice.app/Contents/MacOS/soffice',
  '/usr/bin/soffice',
  '/usr/local/bin/soffice',
]

async function findLibreOffice() {
  for (const binaryPath of LIBREOFFICE_PATHS) {
    try {
      if (binaryPath === 'soffice') {
        const { stdout } = await execAsync('which soffice', { timeout: 5000 })
        if (stdout.trim()) return stdout.trim()
      } else {
        await fs.access(binaryPath)
        return binaryPath
      }
    } catch {
      // Continue
    }
  }
  return null
}

async function checkLibreOffice() {
  console.log('\n=== LibreOffice Installation Check ===\n')

  const soffice = await findLibreOffice()

  if (!soffice) {
    log.error('LibreOffice NOT FOUND!')
    log.info('Searched paths:')
    LIBREOFFICE_PATHS.forEach(p => console.log(`  - ${p}`))
    console.log('\nTo install on macOS:')
    console.log('  brew install --cask libreoffice')
    console.log('  OR download from: https://www.libreoffice.org/download/')
    return false
  }

  log.success(`Found LibreOffice at: ${soffice}`)

  try {
    const { stdout } = await execAsync(`"${soffice}" --version`, { timeout: 10000 })
    log.success(`Version: ${stdout.trim()}`)
  } catch (err) {
    log.warn(`Could not get version: ${err.message}`)
  }

  // Test headless mode
  try {
    await execAsync(`"${soffice}" --headless --help`, { timeout: 10000 })
    log.success('Headless mode works')
  } catch (err) {
    log.error(`Headless mode failed: ${err.message}`)
  }

  return true
}

async function debugFile(filePath) {
  const absolutePath = path.resolve(filePath)
  console.log('\n=== File Integrity Debug ===\n')
  log.info(`Analyzing: ${absolutePath}`)

  // Step 1: Check file exists
  try {
    await fs.access(absolutePath)
    log.success('File exists')
  } catch {
    log.error(`File not found: ${absolutePath}`)
    return
  }

  // Step 2: Get file stats
  const stats = await fs.stat(absolutePath)
  log.info(`File size: ${stats.size} bytes`)

  if (stats.size === 0) {
    log.error('FILE IS EMPTY! This will cause "file is damaged" error.')
    return
  }

  if (stats.size < 100) {
    log.warn(`File is very small (${stats.size} bytes). May not be valid.`)
  }

  // Step 3: Read file header
  const handle = await fs.open(absolutePath, 'r')
  const headerBuffer = Buffer.alloc(32)
  const { bytesRead } = await handle.read(headerBuffer, 0, 32, 0)
  await handle.close()

  const hexHeader = headerBuffer.subarray(0, bytesRead).toString('hex').toUpperCase()
  const asciiHeader = headerBuffer.subarray(0, bytesRead).toString('utf8').replace(/[^\x20-\x7E]/g, '.')

  console.log('\n--- File Header Analysis ---')
  log.debug(`Hex: ${hexHeader}`)
  log.debug(`ASCII: ${asciiHeader}`)

  // Step 4: Identify file type
  const ext = path.extname(filePath).toLowerCase()
  const expectedSig = FILE_SIGNATURES[ext]

  if (!expectedSig) {
    log.warn(`Unknown extension: ${ext}`)
  } else {
    const fileMagic = headerBuffer.subarray(0, expectedSig.magic.length)
    const matches = expectedSig.magic.every((b, i) => fileMagic[i] === b)

    if (matches) {
      log.success(`File header matches ${ext} format (${expectedSig.name})`)
    } else {
      log.error(`FILE HEADER MISMATCH!`)
      log.error(`Expected: ${expectedSig.magic.toString('hex').toUpperCase()} (${expectedSig.name})`)
      log.error(`Actual:   ${fileMagic.toString('hex').toUpperCase()}`)
      console.log('\n>>> This file is NOT a valid ' + ext.slice(1).toUpperCase() + '!')
      console.log('>>> The "file is damaged" error occurs because:')
      console.log('>>> 1. File was uploaded with wrong extension')
      console.log('>>> 2. File is corrupted')
      console.log('>>> 3. File is plain text pretending to be a document')
    }
  }

  // Step 5: Attempt test conversion (if LibreOffice available)
  const soffice = await findLibreOffice()
  if (soffice) {
    console.log('\n--- Test Conversion ---')

    const outputDir = path.dirname(absolutePath)
    const inputBasename = path.basename(absolutePath, ext)
    const outputExt = ext === '.pdf' ? '.docx' : '.pdf'
    const outputPath = path.join(outputDir, `${inputBasename}${outputExt}`)

    const convertToArg = ext === '.pdf' ? 'docx' : 'pdf'
    const cmd = `"${soffice}" --headless --convert-to ${convertToArg} --outdir "${outputDir}" "${absolutePath}"`

    log.info(`Running: ${cmd}`)

    try {
      const { stdout, stderr } = await execAsync(cmd, { timeout: 60000 })
      if (stdout) log.debug(`stdout: ${stdout.trim()}`)
      if (stderr) log.warn(`stderr: ${stderr.trim()}`)

      try {
        await fs.access(outputPath)
        const outStats = await fs.stat(outputPath)
        log.success(`Output created: ${outputPath} (${outStats.size} bytes)`)
        
        // Clean up test output
        await fs.unlink(outputPath)
        log.info('Test output cleaned up')
      } catch {
        log.error(`Output file NOT created at: ${outputPath}`)
        log.error('Conversion failed!')
      }
    } catch (err) {
      log.error(`Conversion command failed: ${err.message}`)
      if (err.stderr) log.error(`stderr: ${err.stderr}`)
    }
  } else {
    log.warn('LibreOffice not found - skipping conversion test')
  }
}

// Main
const args = process.argv.slice(2)

if (args.length === 0 || args.includes('--help')) {
  console.log(`
File Conversion Pipeline Debugger

Usage:
  node debug-conversion.js <file>              Debug a specific file
  node debug-conversion.js --check-libreoffice Check LibreOffice installation

Examples:
  node debug-conversion.js uploads/document.pdf
  node debug-conversion.js --check-libreoffice
`)
  process.exit(0)
}

if (args.includes('--check-libreoffice')) {
  await checkLibreOffice()
} else {
  await checkLibreOffice()
  await debugFile(args[0])
}

console.log('\n=== Debug Complete ===\n')
