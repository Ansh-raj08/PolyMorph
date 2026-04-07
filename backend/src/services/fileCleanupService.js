import fs from 'node:fs/promises'
import path from 'node:path'

const DEFAULT_TTL_MS = 15 * 60 * 1000
const DEFAULT_INTERVAL_MS = 5 * 60 * 1000
const DEFAULT_DIRECTORIES = ['uploads', 'outputs']

const isFinitePositiveNumber = (value) =>
  Number.isFinite(value) && value > 0

const removeExpiredFilesInDirectory = async ({ directoryPath, nowMs, ttlMs }) => {
  try {
    const entries = await fs.readdir(directoryPath, { withFileTypes: true })

    let removedCount = 0
    let keptCount = 0

    for (const entry of entries) {
      if (!entry.isFile()) {
        continue
      }

      if (entry.name === '.gitkeep') {
        continue
      }

      const filePath = path.join(directoryPath, entry.name)

      try {
        const stats = await fs.stat(filePath)
        const fileAgeMs = nowMs - stats.mtimeMs

        if (fileAgeMs >= ttlMs) {
          await fs.rm(filePath, { force: true })
          removedCount += 1
        } else {
          keptCount += 1
        }
      } catch (error) {
        console.warn('[Cleanup] Failed to inspect file during cleanup.', {
          filePath,
          message: error.message,
        })
      }
    }

    return { removedCount, keptCount, scannedDirectory: directoryPath }
  } catch (error) {
    if (error.code === 'ENOENT') {
      return { removedCount: 0, keptCount: 0, scannedDirectory: directoryPath }
    }

    throw error
  }
}

const runCleanupPass = async ({ directories, ttlMs }) => {
  const nowMs = Date.now()
  const results = []

  for (const directoryPath of directories) {
    const directoryResult = await removeExpiredFilesInDirectory({
      directoryPath,
      nowMs,
      ttlMs,
    })
    results.push(directoryResult)
  }

  const removedFiles = results.reduce((sum, item) => sum + item.removedCount, 0)

  if (removedFiles > 0) {
    console.info('[Cleanup] Removed expired files.', {
      removedFiles,
      ttlMs,
      results,
    })
  }
}

const startFileCleanupService = ({
  ttlMs = DEFAULT_TTL_MS,
  intervalMs = DEFAULT_INTERVAL_MS,
  directories = DEFAULT_DIRECTORIES,
} = {}) => {
  const normalizedTtlMs = isFinitePositiveNumber(ttlMs)
    ? ttlMs
    : DEFAULT_TTL_MS
  const normalizedIntervalMs = isFinitePositiveNumber(intervalMs)
    ? intervalMs
    : DEFAULT_INTERVAL_MS

  const absoluteDirectories = directories.map((directoryPath) =>
    path.resolve(process.cwd(), directoryPath),
  )

  const run = async () => {
    try {
      await runCleanupPass({
        directories: absoluteDirectories,
        ttlMs: normalizedTtlMs,
      })
    } catch (error) {
      console.error('[Cleanup] Cleanup pass failed.', {
        message: error.message,
        stack: error.stack,
      })
    }
  }

  console.info('[Cleanup] File cleanup service started.', {
    directories: absoluteDirectories,
    ttlMs: normalizedTtlMs,
    intervalMs: normalizedIntervalMs,
  })

  void run()

  const timer = setInterval(() => {
    void run()
  }, normalizedIntervalMs)

  if (typeof timer.unref === 'function') {
    timer.unref()
  }

  return () => {
    clearInterval(timer)
    console.info('[Cleanup] File cleanup service stopped.')
  }
}

export { startFileCleanupService }
