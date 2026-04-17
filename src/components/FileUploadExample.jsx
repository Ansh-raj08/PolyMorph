import { useState } from 'react'
import HighlightText from './HighlightText'

const API_BASE_URL =
  import.meta.env.VITE_API_URL || ''

function FileUploadExample() {
  const [selectedFile, setSelectedFile] = useState(null)
  const [isUploading, setIsUploading] = useState(false)
  const [successPayload, setSuccessPayload] = useState(null)
  const [errorMessage, setErrorMessage] = useState('')

  const handleFileChange = (event) => {
    const file = event.target.files?.[0] || null
    setSelectedFile(file)
    setSuccessPayload(null)
    setErrorMessage('')
  }

  const handleSubmit = async (event) => {
    event.preventDefault()

    if (!selectedFile) {
      setErrorMessage('Please select a file first.')
      return
    }

    if (!API_BASE_URL) {
      setErrorMessage('VITE_API_URL is not configured. Set it in your frontend environment.')
      return
    }

    setIsUploading(true)
    setSuccessPayload(null)
    setErrorMessage('')

    try {
      const formData = new FormData()
      formData.append('file', selectedFile)

      const response = await fetch(`${API_BASE_URL}/upload`, {
        method: 'POST',
        body: formData,
      })

      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.message || 'Upload failed.')
      }

      setSuccessPayload(data)
    } catch (error) {
      setErrorMessage(error.message || 'Something went wrong while uploading.')
    } finally {
      setIsUploading(false)
    }
  }

  return (
    <section className="glass-panel rounded-2xl p-5">
      <h3 className="font-display text-xl text-slate-100">
        <HighlightText variant="gradient">Fast</HighlightText> and{' '}
        <HighlightText>Secure</HighlightText> Upload
      </h3>
      <p className="mt-1 text-sm text-slate-300/80">
        Sends a single file to the Express /upload endpoint using FormData.
      </p>

      <form onSubmit={handleSubmit} className="mt-4 flex flex-col gap-3">
        <input
          type="file"
          accept=".pdf,.docx,.xlsx,.pptx"
          onChange={handleFileChange}
          className="rounded-lg border border-slate-300/25 bg-slate-900/70 px-3 py-2 text-sm text-slate-100"
        />

        <button
          type="submit"
          disabled={isUploading}
          className={`rounded-lg px-4 py-2 text-sm font-semibold transition ${
            isUploading
              ? 'cursor-not-allowed bg-slate-700 text-slate-300'
              : 'liquid-button-primary'
          }`}
        >
          {isUploading ? 'Uploading...' : 'Upload File'}
        </button>
      </form>

      {successPayload && (
        <div className="mt-4 rounded-xl border border-emerald-300/30 bg-emerald-500/10 p-3 text-sm text-emerald-100">
          <p className="font-semibold">Upload success</p>
          <p>Name: {successPayload.fileName}</p>
          <p>Size: {successPayload.fileSize} bytes</p>
          <p>Path: {successPayload.filePath}</p>
        </div>
      )}

      {errorMessage && (
        <div className="mt-4 rounded-xl border border-rose-300/30 bg-rose-500/10 p-3 text-sm text-rose-100">
          {errorMessage}
        </div>
      )}
    </section>
  )
}

export default FileUploadExample
