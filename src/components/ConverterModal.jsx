import { useEffect, useMemo, useRef, useState } from 'react'

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

function ConverterModal({ conversion, onClose }) {
  const [selectedFile, setSelectedFile] = useState(null)
  const [dragActive, setDragActive] = useState(false)
  const [progress, setProgress] = useState(0)
  const [isConverting, setIsConverting] = useState(false)
  const [isConverted, setIsConverted] = useState(false)

  const timerRef = useRef(null)
  const inputRef = useRef(null)

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
    if (!selectedFile || !conversion) {
      return ''
    }

    return toOutputFileName(selectedFile.name, conversion.outputExtension)
  }, [selectedFile, conversion])

  const applyFile = (file) => {
    if (!file) {
      return
    }

    if (timerRef.current) {
      clearInterval(timerRef.current)
      timerRef.current = null
    }

    setSelectedFile(file)
    setProgress(0)
    setIsConverting(false)
    setIsConverted(false)
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

  const startConversion = () => {
    if (!selectedFile || isConverting || isConverted) {
      return
    }

    setIsConverting(true)
    setProgress(6)

    timerRef.current = setInterval(() => {
      setProgress((currentProgress) => {
        const nextValue = Math.min(
          currentProgress + Math.floor(Math.random() * 14 + 8),
          100,
        )

        if (nextValue >= 100) {
          if (timerRef.current) {
            clearInterval(timerRef.current)
            timerRef.current = null
          }

          setIsConverting(false)
          setIsConverted(true)
        }

        return nextValue
      })
    }, 320)
  }

  const downloadConvertedFile = () => {
    if (!selectedFile || !isConverted || !conversion) {
      return
    }

    const url = URL.createObjectURL(selectedFile)
    const link = document.createElement('a')

    link.href = url
    link.download = outputFileName
    document.body.append(link)
    link.click()
    link.remove()

    setTimeout(() => URL.revokeObjectURL(url), 1000)
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
                  isConverted
                    ? 'border border-emerald-300/35 bg-emerald-400/15 text-emerald-100'
                    : isConverting
                      ? 'border border-cyan-300/35 bg-cyan-400/15 text-cyan-100'
                      : 'border border-slate-300/25 bg-slate-400/10 text-slate-300'
                }`}
              >
                {isConverted ? 'Ready' : isConverting ? 'Converting' : 'Queued'}
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
            {isConverted
              ? `Conversion complete. Output ready as ${outputFileName}.`
              : isConverting
                ? 'Converting your file now.'
                : 'Upload a file and press Convert to start.'}
          </p>
        </div>

        <div className="mt-6 flex flex-col gap-3 sm:flex-row sm:justify-end">
          <button
            type="button"
            onClick={startConversion}
            disabled={!selectedFile || isConverting || isConverted}
            className={`rounded-xl px-4 py-2.5 text-sm font-semibold transition ${
              !selectedFile || isConverting || isConverted
                ? 'cursor-not-allowed bg-slate-700/70 text-slate-300'
                : 'bg-gradient-to-r from-cyan-300 to-blue-500 text-slate-950 hover:brightness-110'
            }`}
          >
            {isConverting ? 'Converting...' : isConverted ? 'Converted' : 'Convert'}
          </button>

          <button
            type="button"
            onClick={downloadConvertedFile}
            disabled={!isConverted}
            className={`rounded-xl border px-4 py-2.5 text-sm font-semibold transition ${
              isConverted
                ? 'border-emerald-300/35 bg-emerald-400/15 text-emerald-100 hover:bg-emerald-400/25'
                : 'cursor-not-allowed border-slate-300/20 bg-slate-800/60 text-slate-400'
            }`}
          >
            Download
          </button>
        </div>
      </section>
    </div>
  )
}

export default ConverterModal
