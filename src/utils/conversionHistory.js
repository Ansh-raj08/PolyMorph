const HISTORY_STORAGE_KEY = 'conversion_history'
const HISTORY_UPDATED_EVENT = 'conversion-history-updated'
const HISTORY_LIMIT = 10
const FILE_CHECK_TIMEOUT_MS = 12000

const toSafeString = (value) =>
  typeof value === 'string' ? value.trim() : ''

const getAvailableStorage = () => {
  if (typeof window === 'undefined') {
    return null
  }

  try {
    const storage = window.localStorage
    const probeKey = '__polymorph_history_probe__'
    storage.setItem(probeKey, '1')
    storage.removeItem(probeKey)
    return storage
  } catch {
    return null
  }
}

const emitHistoryUpdated = () => {
  if (typeof window === 'undefined') {
    return
  }

  window.dispatchEvent(new Event(HISTORY_UPDATED_EVENT))
}

const toValidIsoString = (value) => {
  const candidate = typeof value === 'string' ? value : ''

  if (!candidate) {
    return new Date().toISOString()
  }

  const timeValue = Date.parse(candidate)
  if (Number.isNaN(timeValue)) {
    return new Date().toISOString()
  }

  return new Date(timeValue).toISOString()
}

const normalizeHistoryEntry = (entry) => {
  if (!entry || typeof entry !== 'object') {
    return null
  }

  const id = toSafeString(entry.id)
  const originalName = toSafeString(entry.originalName)
  const convertedName = toSafeString(entry.convertedName)
  const conversionType = toSafeString(entry.conversionType)

  if (!id || !originalName || !convertedName || !conversionType) {
    return null
  }

  const fileUrl = toSafeString(entry.fileUrl)
  const status = entry.status === 'expired' || !fileUrl ? 'expired' : 'success'

  return {
    id,
    originalName,
    convertedName,
    conversionType,
    createdAt: toValidIsoString(entry.createdAt),
    fileUrl,
    status,
  }
}

const saveHistoryEntries = (entries) => {
  const storage = getAvailableStorage()
  if (!storage) {
    return false
  }

  try {
    storage.setItem(HISTORY_STORAGE_KEY, JSON.stringify(entries))
    return true
  } catch {
    return false
  }
}

const generateHistoryId = () => {
  if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') {
    return crypto.randomUUID()
  }

  return `${Date.now()}-${Math.random().toString(16).slice(2)}`
}

export const getHistory = () => {
  const storage = getAvailableStorage()
  if (!storage) {
    return []
  }

  try {
    const raw = storage.getItem(HISTORY_STORAGE_KEY)
    if (!raw) {
      return []
    }

    const parsed = JSON.parse(raw)
    if (!Array.isArray(parsed)) {
      return []
    }

    return parsed
      .map((entry) => normalizeHistoryEntry(entry))
      .filter(Boolean)
      .sort((a, b) => Date.parse(b.createdAt) - Date.parse(a.createdAt))
      .slice(0, HISTORY_LIMIT)
  } catch {
    try {
      storage.removeItem(HISTORY_STORAGE_KEY)
    } catch {
      // Ignore cleanup errors and return empty history.
    }

    return []
  }
}

export const saveToHistory = (entryInput) => {
  if (!entryInput || typeof entryInput !== 'object') {
    return null
  }

  const originalName = toSafeString(entryInput.originalName)
  const convertedName = toSafeString(entryInput.convertedName)
  const conversionType = toSafeString(entryInput.conversionType)
  const fileUrl = toSafeString(entryInput.fileUrl)

  if (!originalName || !convertedName || !conversionType || !fileUrl) {
    return null
  }

  const nextEntry = {
    id: toSafeString(entryInput.id) || generateHistoryId(),
    originalName,
    convertedName,
    conversionType,
    createdAt: toValidIsoString(entryInput.createdAt),
    fileUrl,
    status: 'success',
  }

  const existing = getHistory()
  const deduped = existing.filter((item) => {
    const sameUrl = item.fileUrl === nextEntry.fileUrl
    const sameSignature =
      item.originalName === nextEntry.originalName &&
      item.convertedName === nextEntry.convertedName &&
      item.conversionType === nextEntry.conversionType

    return !sameUrl && !sameSignature
  })

  const nextHistory = [nextEntry, ...deduped].slice(0, HISTORY_LIMIT)
  const saved = saveHistoryEntries(nextHistory)

  if (saved) {
    emitHistoryUpdated()
  }

  return saved ? nextEntry : null
}

export const clearHistory = () => {
  const storage = getAvailableStorage()
  if (!storage) {
    return false
  }

  try {
    storage.removeItem(HISTORY_STORAGE_KEY)
    emitHistoryUpdated()
    return true
  } catch {
    return false
  }
}

export const markHistoryItemExpired = (entryId) => {
  const normalizedId = toSafeString(entryId)
  if (!normalizedId) {
    return false
  }

  const current = getHistory()
  let updated = false

  const nextHistory = current.map((entry) => {
    if (entry.id !== normalizedId) {
      return entry
    }

    if (entry.status === 'expired') {
      return entry
    }

    updated = true
    return {
      ...entry,
      status: 'expired',
    }
  })

  if (!updated) {
    return false
  }

  const saved = saveHistoryEntries(nextHistory)
  if (saved) {
    emitHistoryUpdated()
  }

  return saved
}

export const checkFileExists = async (fileUrl) => {
  const normalizedUrl = toSafeString(fileUrl)
  if (!normalizedUrl) {
    return {
      exists: false,
      expired: true,
      status: 0,
      errorType: 'missing-url',
    }
  }

  const controller = new AbortController()
  const timeoutId = setTimeout(() => controller.abort(), FILE_CHECK_TIMEOUT_MS)

  try {
    const response = await fetch(normalizedUrl, {
      method: 'HEAD',
      signal: controller.signal,
      cache: 'no-store',
    })

    return {
      exists: response.ok,
      expired: !response.ok,
      status: response.status,
      errorType: null,
    }
  } catch (error) {
    if (error && typeof error === 'object' && error.name === 'AbortError') {
      return {
        exists: false,
        expired: false,
        status: 0,
        errorType: 'timeout',
      }
    }

    return {
      exists: false,
      expired: false,
      status: 0,
      errorType: 'network',
    }
  } finally {
    clearTimeout(timeoutId)
  }
}

export { HISTORY_UPDATED_EVENT }
