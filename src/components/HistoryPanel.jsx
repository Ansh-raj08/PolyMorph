import { useEffect, useMemo, useState } from 'react'
import {
  HISTORY_UPDATED_EVENT,
  checkFileExists,
  clearHistory,
  getHistory,
  markHistoryItemExpired,
} from '../utils/conversionHistory'

const DOWNLOAD_TIMEOUT_MS = 45000

const relativeTimeFormatter = new Intl.RelativeTimeFormat('en', {
  numeric: 'auto',
})

const toConversionLabel = (conversionType) => {
  const normalized = String(conversionType || '').trim()
  if (!normalized) {
    return 'Unknown conversion'
  }

  const parts = normalized.split('_to_')
  if (parts.length !== 2) {
    return normalized.replaceAll('_', ' ').toUpperCase()
  }

  return `${parts[0].toUpperCase()} -> ${parts[1].toUpperCase()}`
}

const formatTimeAgo = (createdAt, nowMs) => {
  const timestamp = Date.parse(createdAt)
  if (Number.isNaN(timestamp)) {
    return 'just now'
  }

  const diffSeconds = Math.round((timestamp - nowMs) / 1000)
  const absSeconds = Math.abs(diffSeconds)

  if (absSeconds < 60) {
    return relativeTimeFormatter.format(diffSeconds, 'second')
  }

  const diffMinutes = Math.round(diffSeconds / 60)
  if (Math.abs(diffMinutes) < 60) {
    return relativeTimeFormatter.format(diffMinutes, 'minute')
  }

  const diffHours = Math.round(diffMinutes / 60)
  if (Math.abs(diffHours) < 24) {
    return relativeTimeFormatter.format(diffHours, 'hour')
  }

  const diffDays = Math.round(diffHours / 24)
  return relativeTimeFormatter.format(diffDays, 'day')
}

const getFileBadge = (fileName) => {
  const extension = String(fileName || '').split('.').pop()
  if (!extension || extension === fileName) {
    return 'FILE'
  }

  return extension.toUpperCase().slice(0, 5)
}

const createTimeoutController = (timeoutMs) => {
  const controller = new AbortController()
  const timeoutId = setTimeout(() => controller.abort(), timeoutMs)
  return { controller, timeoutId }
}

const downloadBlob = (blob, fileName) => {
  const url = URL.createObjectURL(blob)
  const anchor = document.createElement('a')

  anchor.href = url
  anchor.download = fileName || 'converted-file'
  document.body.append(anchor)
  anchor.click()
  anchor.remove()

  setTimeout(() => URL.revokeObjectURL(url), 1000)
}

function HistoryPanel() {
  const [history, setHistory] = useState(() => getHistory())
  const [downloadState, setDownloadState] = useState({})
  const [messageById, setMessageById] = useState({})
  const [nowMs, setNowMs] = useState(Date.now())

  useEffect(() => {
    const refreshHistory = () => {
      setHistory(getHistory())
    }

    refreshHistory()

    if (typeof window !== 'undefined') {
      window.addEventListener(HISTORY_UPDATED_EVENT, refreshHistory)
      window.addEventListener('storage', refreshHistory)
    }

    return () => {
      if (typeof window !== 'undefined') {
        window.removeEventListener(HISTORY_UPDATED_EVENT, refreshHistory)
        window.removeEventListener('storage', refreshHistory)
      }
    }
  }, [])

  useEffect(() => {
    const timerId = setInterval(() => {
      setNowMs(Date.now())
    }, 60000)

    return () => clearInterval(timerId)
  }, [])

  const visibleHistory = useMemo(() => history.slice(0, 10), [history])

  const setItemDownloading = (entryId, isDownloading) => {
    setDownloadState((prev) => ({
      ...prev,
      [entryId]: isDownloading,
    }))
  }

  const setItemMessage = (entryId, message) => {
    setMessageById((prev) => ({
      ...prev,
      [entryId]: message,
    }))
  }

  const handleClearHistory = () => {
    clearHistory()
    setDownloadState({})
    setMessageById({})
    setHistory([])
  }

  const handleDownload = async (entry) => {
    const entryId = entry?.id
    if (!entryId) {
      return
    }

    const alreadyExpired = entry.status === 'expired' || !entry.fileUrl
    if (alreadyExpired) {
      markHistoryItemExpired(entryId)
      setItemMessage(entryId, 'File expired')
      return
    }

    setItemDownloading(entryId, true)
    setItemMessage(entryId, '')

    const fileCheck = await checkFileExists(entry.fileUrl)

    if (fileCheck.errorType === 'network' || fileCheck.errorType === 'timeout') {
      setItemDownloading(entryId, false)
      setItemMessage(entryId, 'Backend unreachable. Please try again.')
      return
    }

    if (!fileCheck.exists) {
      markHistoryItemExpired(entryId)
      setItemDownloading(entryId, false)
      setItemMessage(entryId, 'File expired')
      return
    }

    try {
      const { controller, timeoutId } = createTimeoutController(DOWNLOAD_TIMEOUT_MS)
      let response

      try {
        response = await fetch(entry.fileUrl, {
          signal: controller.signal,
          cache: 'no-store',
        })
      } finally {
        clearTimeout(timeoutId)
      }

      if (!response.ok) {
        markHistoryItemExpired(entryId)
        setItemMessage(entryId, 'File expired')
        return
      }

      const blob = await response.blob()
      downloadBlob(blob, entry.convertedName)
      setItemMessage(entryId, 'Downloaded')
    } catch (error) {
      if (error && typeof error === 'object' && error.name === 'AbortError') {
        setItemMessage(entryId, 'Download timed out. Try again.')
      } else if (error instanceof TypeError) {
        setItemMessage(entryId, 'Backend unreachable. Please try again.')
      } else {
        setItemMessage(entryId, 'Download failed. Try again.')
      }
    } finally {
      setItemDownloading(entryId, false)
    }
  }

  return (
    <section className="glass-panel animate-rise rounded-2xl p-5">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h3 className="font-display text-xl text-slate-100">Recent Conversions</h3>
          <p className="mt-1 text-sm text-slate-300/80">
            Local history (last 10), stored as metadata only.
          </p>
        </div>

        <button
          type="button"
          onClick={handleClearHistory}
          disabled={visibleHistory.length === 0}
          className={`rounded-lg border px-3 py-2 text-sm font-semibold transition ${
            visibleHistory.length === 0
              ? 'cursor-not-allowed border-slate-300/15 bg-slate-800/50 text-slate-400'
              : 'border-slate-200/30 bg-slate-900/50 text-slate-100 hover:border-slate-200/50 hover:bg-slate-800/70'
          }`}
        >
          Clear History
        </button>
      </div>

      {visibleHistory.length === 0 ? (
        <div className="mt-4 rounded-xl border border-slate-300/15 bg-slate-900/45 p-4 text-sm text-slate-300/80">
          No successful conversions yet. Completed conversions will appear here.
        </div>
      ) : (
        <ul className="mt-4 space-y-3">
          {visibleHistory.map((entry) => {
            const isExpired = entry.status === 'expired' || !entry.fileUrl
            const isDownloading = Boolean(downloadState[entry.id])
            const itemMessage = messageById[entry.id] || (isExpired ? 'File expired' : '')

            return (
              <li
                key={entry.id}
                className="rounded-xl border border-slate-200/15 bg-slate-950/45 p-4 transition duration-300 hover:border-cyan-300/30 hover:bg-slate-900/60"
              >
                <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                  <div className="min-w-0">
                    <p className="text-xs uppercase tracking-[0.2em] text-slate-400">
                      {toConversionLabel(entry.conversionType)}
                    </p>
                    <p className="mt-1 truncate text-sm font-medium text-slate-100 sm:text-base">
                      {entry.originalName} -&gt; {entry.convertedName}
                    </p>
                    <p className="mt-1 text-xs text-slate-400">
                      {formatTimeAgo(entry.createdAt, nowMs)} - {getFileBadge(entry.convertedName)}
                    </p>
                  </div>

                  <span
                    className={`inline-flex w-fit rounded-full border px-2.5 py-1 text-xs font-semibold uppercase tracking-[0.14em] ${
                      isExpired
                        ? 'border-rose-300/35 bg-rose-400/10 text-rose-100'
                        : 'border-emerald-300/35 bg-emerald-400/10 text-emerald-100'
                    }`}
                  >
                    {isExpired ? 'Expired' : 'Success'}
                  </span>
                </div>

                <div className="mt-3 flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
                  <p className={`text-xs ${isExpired ? 'text-rose-200/90' : 'text-slate-300/80'}`}>
                    {itemMessage || 'Ready to download'}
                  </p>

                  <button
                    type="button"
                    onClick={() => handleDownload(entry)}
                    disabled={isExpired || isDownloading}
                    className={`rounded-lg border px-3 py-2 text-sm font-semibold transition ${
                      isExpired || isDownloading
                        ? 'cursor-not-allowed border-slate-300/20 bg-slate-800/60 text-slate-400'
                        : 'border-emerald-300/40 bg-emerald-400/15 text-emerald-100 hover:bg-emerald-400/25'
                    }`}
                  >
                    {isDownloading ? 'Checking...' : 'Download'}
                  </button>
                </div>
              </li>
            )
          })}
        </ul>
      )}
    </section>
  )
}

export default HistoryPanel
