import { useEffect, useMemo, useRef, useState } from 'react'
import {
  isInteractiveConversion,
  isLimitedConversion,
} from '../data/conversions'
import { saveToHistory } from '../utils/conversionHistory'

const API_BASE_URL =
  (import.meta.env.VITE_API_URL || '').replace(/\/$/, '')
const CONVERSION_TIMEOUT_MS = 180000
const DOWNLOAD_TIMEOUT_MS = 60000

const createTimeoutController = (timeoutMs) => {
  const controller = new AbortController()
  const timeoutId = setTimeout(() => controller.abort(), timeoutMs)
  return { controller, timeoutId }
}

const clearRequestTimeout = (timeoutId) => {
  if (timeoutId) {
    clearTimeout(timeoutId)
  }
}

const toReadableFetchError = (error, actionLabel) => {
  if (error && typeof error === 'object' && error.name === 'AbortError') {
    return `${actionLabel} timed out. Please try again with a smaller file.`
  }

  if (error instanceof TypeError) {
    return 'Load Failed: unable to reach configured backend URL. Check VITE_API_URL and backend FRONTEND_ORIGIN/CORS settings.'
  }

  if (error instanceof Error) {
    return error.message
  }

  return `${actionLabel} failed unexpectedly.`
}

const formatBytes = (bytes) => {
  if (!bytes) {
    return '0 Bytes'
  }

  const units = ['Bytes', 'KB', 'MB', 'GB']
  const index = Math.min(Math.floor(Math.log(bytes) / Math.log(1024)), units.length - 1)
  const value = bytes / 1024 ** index

  return `${value.toFixed(value >= 10 || index === 0 ? 0 : 1)} ${units[index]}`
}

const toOutputFileName = (fileName, extension) => {
  const nameWithoutExtension = fileName.replace(/\.[^/.]+$/, '')
  return `${nameWithoutExtension}.${extension}`
}

const toAbsoluteApiUrl = (relativePath) => {
  const cleanPath = String(relativePath || '').replace(/^\/+/, '')
  if (!API_BASE_URL) {
    return `/${cleanPath}`
  }

  return `${API_BASE_URL}/${cleanPath}`
}

const toConversionType = (conversion) => {
  const from = String(conversion?.from || '')
    .trim()
    .toLowerCase()
    .replace(/\s+/g, '')
  const to = String(conversion?.to || '')
    .trim()
    .toLowerCase()
    .replace(/\s+/g, '')

  if (!from || !to) {
    return 'unknown_to_unknown'
  }

  return `${from}_to_${to}`
}

function ConverterModal({ conversion, onClose }) {
  const [selectedFile, setSelectedFile] = useState(null)
  const [convertedFile, setConvertedFile] = useState(null)
  const [dragActive, setDragActive] = useState(false)
  const [progress, setProgress] = useState(0)
  const [isConverting, setIsConverting] = useState(false)
  const [isDownloading, setIsDownloading] = useState(false)
  const [isConverted, setIsConverted] = useState(false)
  const [conversionError, setConversionError] = useState('')
  const [conversionWarnings, setConversionWarnings] = useState([])

  const timerRef = useRef(null)
  const inputRef = useRef(null)

  const isInteractive = conversion
    ? isInteractiveConversion(conversion)
    : false

  const isLimited = conversion
    ? isLimitedConversion(conversion)
    : false

  useEffect(() => {
    return () => {
      if (timerRef.current) {
        clearInterval(timerRef.current)
      }
    }
  }, [])

  useEffect(() => {
    if (!conversion) {
      return undefined
    }

    const onEscape = (event) => {
      if (event.key === 'Escape') {
        onClose()
      }
    }

    window.addEventListener('keydown', onEscape)

    return () => {
      window.removeEventListener('keydown', onEscape)
    }
  }, [conversion, onClose])

  const outputFileName = useMemo(() => {
    if (convertedFile?.fileName) {
      return convertedFile.fileName
    }

    if (!selectedFile || !conversion) {
      return ''
    }

    return toOutputFileName(selectedFile.name, conversion.outputExtension)
  }, [selectedFile, conversion, convertedFile])

  const applyFile = (file) => {
    if (!file) {
      return
    }

    if (timerRef.current) {
      clearInterval(timerRef.current)
      timerRef.current = null
    }

    setSelectedFile(file)
    setConvertedFile(null)
    setProgress(0)
    setIsConverting(false)
    setIsConverted(false)
    setConversionError('')
    setConversionWarnings([])
  }

  const handleInputChange = (event) => {
    const nextFile = event.target.files?.[0]

    if (nextFile) {
      applyFile(nextFile)
    }
  }

  const handleDragOver = (event) => {
    event.preventDefault()
    setDragActive(true)
  }

  const handleDragLeave = (event) => {
    event.preventDefault()
    setDragActive(false)
  }

  const handleDrop = (event) => {
    event.preventDefault()
    setDragActive(false)

    const droppedFile = event.dataTransfer.files?.[0]

    if (droppedFile) {
      applyFile(droppedFile)
    }
  }

  const startConversion = async () => {
    if (!selectedFile || isConverting || isConverted) {
      return
    }

    if (!isInteractive) {
      setConversionError('This conversion type is not supported yet.')
      return
    }

    if (!API_BASE_URL) {
      setConversionError('VITE_API_URL is not configured. Set it before using conversions.')
      return
    }

    setIsConverting(true)
    setIsConverted(false)
    setConvertedFile(null)
    setConversionError('')
    setConversionWarnings([])
    setProgress(6)

    timerRef.current = setInterval(() => {
      setProgress((currentProgress) => {
        return Math.min(currentProgress + Math.floor(Math.random() * 8 + 4), 92)
      })
    }, 320)

    try {
      const conversionUrl = `${API_BASE_URL}/upload/convert`
      const formData = new FormData()
      formData.append('file', selectedFile)

      console.info('[Frontend] Conversion request received from UI', {
        conversionId: conversion.id,
        url: conversionUrl,
        fileName: selectedFile.name,
        fileSize: selectedFile.size,
        fileType: selectedFile.type,
      })

      const { controller, timeoutId } = createTimeoutController(CONVERSION_TIMEOUT_MS)
      let response

      try {
        // Do not set Content-Type manually for FormData.
        response = await fetch(conversionUrl, {
          method: 'POST',
          body: formData,
          signal: controller.signal,
        })
      } finally {
        clearRequestTimeout(timeoutId)
      }

      console.info('[Frontend] Conversion response received', {
        status: response.status,
        ok: response.ok,
      })

      const responseContentType = response.headers.get('content-type') || ''
      let responseData = null

      if (responseContentType.includes('application/json')) {
        try {
          responseData = await response.json()
        } catch {
          responseData = null
        }
      }

      if (!response.ok) {
        throw new Error(responseData?.message || 'Conversion failed on the server.')
      }

      const convertedFilePayload = responseData?.convertedFile
      if (!convertedFilePayload?.filePath || !convertedFilePayload?.fileName) {
        throw new Error('Conversion succeeded but response is missing output file details.')
      }

      const warnings = Array.isArray(responseData?.warnings)
        ? responseData.warnings.filter(Boolean)
        : []

      setConversionWarnings(warnings)

      const downloadUrl = toAbsoluteApiUrl(convertedFilePayload.filePath)

      setConvertedFile({
        ...convertedFilePayload,
        downloadUrl,
      })

      saveToHistory({
        originalName: selectedFile.name,
        convertedName: convertedFilePayload.fileName,
        conversionType: toConversionType(conversion),
        createdAt: new Date().toISOString(),
        fileUrl: downloadUrl,
      })

      console.info('[Frontend] Conversion finished', {
        convertedFileName: convertedFilePayload.fileName,
        convertedFilePath: convertedFilePayload.filePath,
      })

      setProgress(100)
      setIsConverted(true)
    } catch (error) {
      console.error('[Frontend] Conversion request failed', error)
      setProgress(0)
      setIsConverted(false)
      setConversionError(toReadableFetchError(error, 'Conversion request'))
    } finally {
      if (timerRef.current) {
        clearInterval(timerRef.current)
        timerRef.current = null
      }

      setIsConverting(false)
    }
  }

  const downloadConvertedFile = async () => {
    if (!isConverted || !convertedFile?.downloadUrl) {
      return
    }

    setIsDownloading(true)

    try {
      console.info('[Frontend] Download request started', {
        url: convertedFile.downloadUrl,
        expectedFileName: outputFileName,
      })

      const { controller, timeoutId } = createTimeoutController(DOWNLOAD_TIMEOUT_MS)
      let response

      try {
        response = await fetch(convertedFile.downloadUrl, {
          signal: controller.signal,
        })
      } finally {
        clearRequestTimeout(timeoutId)
      }

      if (!response.ok) {
        throw new Error('Unable to download converted file from server.')
      }

      const blob = await response.blob()
      const url = URL.createObjectURL(blob)
      const link = document.createElement('a')

      link.href = url
      link.download = outputFileName || 'converted-file'
      document.body.append(link)
      link.click()
      link.remove()

      setTimeout(() => URL.revokeObjectURL(url), 1000)
      console.info('[Frontend] Download finished', {
        fileName: outputFileName,
      })
    } catch (error) {
      console.error('[Frontend] Download failed', error)
      setConversionError(toReadableFetchError(error, 'Download request'))
    } finally {
      setIsDownloading(false)
    }
  }

  if (!conversion) {
    return null
  }

  return (
    <div
      className="fixed inset-0 z-40 flex items-center justify-center bg-slate-950/70 px-4 py-6 backdrop-blur-sm"
      role="dialog"
      aria-modal="true"
      aria-label={`${conversion.from} to ${conversion.to} converter`}
    >
      <button
        type="button"
        className="absolute inset-0 cursor-default"
        aria-label="Close converter dialog"
        onClick={onClose}
      />

      <section className="glass-panel animate-rise relative z-10 w-full max-w-2xl rounded-3xl border border-slate-200/10 bg-slate-900/95 p-5 sm:p-6">
        <header className="flex items-start justify-between gap-3">
          <div>
            <p className="text-xs uppercase tracking-[0.24em] text-cyan-300/90">
              Active Converter
            </p>
            <h3 className="mt-2 font-display text-2xl text-slate-100">
              {conversion.from} -&gt; {conversion.to}
            </h3>
            <p className="mt-1 text-sm text-slate-300/80">
              Accepted file types: {conversion.accepts}
            </p>
            {!isInteractive && (
              <p className="mt-2 text-sm text-amber-200/90">
                This conversion type is not supported yet.
              </p>
            )}
          </div>

          <button
            type="button"
            onClick={onClose}
            className="rounded-lg border border-slate-200/20 px-3 py-1.5 text-sm text-slate-200 transition hover:border-slate-200/35 hover:bg-slate-800/70"
          >
            Close
          </button>
        </header>

        <div
          className={`mt-5 rounded-2xl border-2 border-dashed p-6 text-center transition ${
            dragActive
              ? 'border-cyan-300/70 bg-cyan-400/10'
              : 'border-slate-300/20 bg-slate-900/50'
          }`}
          onDragOver={handleDragOver}
          onDragLeave={handleDragLeave}
          onDrop={handleDrop}
        >
          <p className="font-display text-lg text-slate-100">
            Drag and drop your file here
          </p>
          <p className="mt-1 text-sm text-slate-400">
            or pick a file manually from your device
          </p>

          <input
            ref={inputRef}
            type="file"
            accept={conversion.accepts}
            className="hidden"
            onChange={handleInputChange}
          />

          <button
            type="button"
            onClick={() => inputRef.current?.click()}
            className="mt-4 rounded-xl border border-cyan-300/35 bg-cyan-400/10 px-4 py-2 text-sm font-semibold text-cyan-100 transition hover:bg-cyan-400/20"
          >
            {selectedFile ? 'Choose another file' : 'Browse file'}
          </button>
        </div>

        {selectedFile && (
          <div className="mt-5 rounded-2xl border border-slate-200/15 bg-slate-950/55 p-4">
            <p className="text-xs uppercase tracking-[0.2em] text-slate-400">
              File Preview
            </p>
            <div className="mt-2 flex flex-wrap items-center justify-between gap-3">
              <div>
                <p className="max-w-[280px] truncate font-medium text-slate-100 sm:max-w-none">
                  {selectedFile.name}
                </p>
                <p className="text-sm text-slate-400">
                  Size: {formatBytes(selectedFile.size)}
                </p>
              </div>

              <span
                className={`rounded-full px-2.5 py-1 text-xs font-semibold uppercase tracking-[0.14em] ${
                  conversionError
                    ? 'border border-rose-300/35 bg-rose-400/15 text-rose-100'
                    : isConverted
                    ? 'border border-emerald-300/35 bg-emerald-400/15 text-emerald-100'
                    : isConverting
                      ? 'border border-cyan-300/35 bg-cyan-400/15 text-cyan-100'
                      : 'border border-slate-300/25 bg-slate-400/10 text-slate-300'
                }`}
              >
                {conversionError
                  ? 'Failed'
                  : isConverted
                    ? 'Ready'
                    : isConverting
                      ? 'Converting'
                      : 'Queued'}
              </span>
            </div>
          </div>
        )}

        <div className="mt-5">
          <div className="mb-2 flex items-center justify-between text-sm text-slate-300">
            <span>Progress</span>
            <span>{progress}%</span>
          </div>

          <div className="h-2 w-full overflow-hidden rounded-full bg-slate-800">
            <div
              className="h-full rounded-full bg-gradient-to-r from-cyan-300 to-blue-500 transition-all duration-300"
              style={{ width: `${progress}%` }}
            />
          </div>

          <p className="mt-2 text-xs text-slate-400">
            {conversionError
              ? `Conversion failed: ${conversionError}`
              : isConverted
                ? `Conversion complete. Output ready as ${outputFileName}.`
                : isConverting
                  ? 'Converting your file now.'
                  : 'Upload a file and press Convert to start.'}
          </p>
        </div>

        {isLimited && (
          <div className="mt-4 rounded-xl border border-amber-300/35 bg-amber-500/12 p-3 text-sm text-amber-100">
            {conversion.limitedWarning ||
              'This conversion works best for simple text-based PDFs. Complex or scanned files may fail.'}
          </div>
        )}

        {conversionWarnings.length > 0 && (
          <div className="mt-4 rounded-xl border border-amber-300/35 bg-amber-500/10 p-3 text-sm text-amber-100">
            <p className="font-semibold">Warnings</p>
            <ul className="mt-1 list-disc pl-5">
              {conversionWarnings.map((warning) => (
                <li key={warning}>{warning}</li>
              ))}
            </ul>
          </div>
        )}

        {conversionError && (
          <div className="mt-4 rounded-xl border border-rose-300/35 bg-rose-500/10 p-3 text-sm text-rose-100">
            {conversionError}
          </div>
        )}

        <div className="mt-6 flex flex-col gap-3 sm:flex-row sm:justify-end">
          <button
            type="button"
            onClick={startConversion}
            disabled={!selectedFile || isConverting || isConverted || !isInteractive}
            className={`rounded-xl px-4 py-2.5 text-sm font-semibold transition ${
              !selectedFile || isConverting || isConverted || !isInteractive
                ? 'cursor-not-allowed bg-slate-700/70 text-slate-300'
                : 'bg-gradient-to-r from-cyan-300 to-blue-500 text-slate-950 hover:brightness-110'
            }`}
          >
            {isConverting ? 'Converting...' : isConverted ? 'Converted' : 'Convert'}
          </button>

          <button
            type="button"
            onClick={downloadConvertedFile}
            disabled={!isConverted || isDownloading}
            className={`rounded-xl border px-4 py-2.5 text-sm font-semibold transition ${
              isConverted && !isDownloading
                ? 'border-emerald-300/35 bg-emerald-400/15 text-emerald-100 hover:bg-emerald-400/25'
                : 'cursor-not-allowed border-slate-300/20 bg-slate-800/60 text-slate-400'
            }`}
          >
            {isDownloading ? 'Downloading...' : 'Download'}
          </button>
        </div>
      </section>
    </div>
  )
}

export default ConverterModal
