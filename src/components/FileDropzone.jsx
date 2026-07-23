import { useState, useRef, useCallback } from 'react'
import { Upload, FileText, Image, Archive, Film, X, CloudUpload } from 'lucide-react'
import axios from 'axios'

const FILE_ICONS = {
  'application/pdf': FileText,
  'application/zip': Archive,
  'application/x-zip-compressed': Archive,
  'image/': Image,
  'video/': Film,
}

function getFileIcon(mimeType) {
  for (const [key, Icon] of Object.entries(FILE_ICONS)) {
    if (mimeType.startsWith(key)) return Icon
  }
  return FileText
}

function formatSize(bytes) {
  if (bytes < 1024) return `${bytes} B`
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`
}

function fileToBase64(file, onProgress) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader()
    reader.readAsDataURL(file)
    reader.onprogress = (data) => {
      if (data.lengthComputable && onProgress) {
        onProgress(Math.round((data.loaded / data.total) * 40)) // Reading takes up to 40%
      }
    }
    reader.onload = () => {
      // Remove data url prefix (e.g. data:image/png;base64,)
      const base64 = reader.result.split(',')[1]
      resolve(base64)
    }
    reader.onerror = (error) => reject(error)
  })
}

export default function FileDropzone({ masterKey, onUploadSuccess }) {
  const [files, setFiles] = useState([])
  const [dragOver, setDragOver] = useState(false)
  const [uploading, setUploading] = useState(false)
  const [progress, setProgress] = useState(0)
  const [currentFileIndex, setCurrentFileIndex] = useState(0)
  const inputRef = useRef(null)

  const handleDragOver = useCallback((e) => {
    e.preventDefault()
    setDragOver(true)
  }, [])

  const handleDragLeave = useCallback((e) => {
    e.preventDefault()
    setDragOver(false)
  }, [])

  const handleDrop = useCallback((e) => {
    e.preventDefault()
    setDragOver(false)
    const dropped = Array.from(e.dataTransfer.files)
    if (dropped.length > 0) {
      setFiles(prev => [...prev, ...dropped])
    }
  }, [])

  const handleFileSelect = (e) => {
    const selected = Array.from(e.target.files)
    if (selected.length > 0) {
      setFiles(prev => [...prev, ...selected])
    }
    e.target.value = ''
  }

  const removeFile = (index) => {
    setFiles(prev => prev.filter((_, i) => i !== index))
  }

  const uploadFiles = async () => {
    if (files.length === 0 || uploading) return

    setUploading(true)
    const results = []

    for (let i = 0; i < files.length; i++) {
      setCurrentFileIndex(i)
      setProgress(10)

      const file = files[i]

      try {
        // Read file to base64
        const base64Data = await fileToBase64(file, (p) => setProgress(p))
        setProgress(50)

        // Upload to Google Drive via /api/upload-file (same mechanism as snippets)
        const { data } = await axios.post('/api/upload-file', {
          fileName: file.name,
          mimeType: file.type || 'application/octet-stream',
          fileData: base64Data,
        }, {
          headers: { 'x-master-key': masterKey },
          onUploadProgress: (progressEvent) => {
            if (progressEvent.total) {
              const percent = 50 + Math.round((progressEvent.loaded * 50) / progressEvent.total)
              setProgress(percent)
            }
          },
        })

        results.push({
          fileName: file.name,
          webViewLink: data.webViewLink,
          fileId: data.fileId,
        })
      } catch (err) {
        console.error(`Failed to upload ${file.name}:`, err)
        results.push({
          fileName: file.name,
          error: err.response?.data?.error || 'Upload failed',
        })
      }
    }

    setUploading(false)
    setFiles([])
    setProgress(0)
    setCurrentFileIndex(0)

    const successResults = results.filter(r => !r.error)
    if (successResults.length > 0) {
      onUploadSuccess(successResults)
    } else {
      alert('Upload failed. Please try again.')
    }
  }

  return (
    <div className="fade-enter">
      {/* Dropzone */}
      <div
        className={`dropzone-area ${dragOver ? 'drag-over' : ''}`}
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onDrop={handleDrop}
        onClick={() => inputRef.current?.click()}
      >
        <input
          ref={inputRef}
          type="file"
          multiple
          onChange={handleFileSelect}
          style={{ display: 'none' }}
        />
        <div className="dropzone-icon">
          <Upload size={40} strokeWidth={1.5} />
        </div>
        <p className="dropzone-title">
          {dragOver ? 'Drop files here' : 'Drag & drop files here'}
        </p>
        <p className="dropzone-subtitle">or click to browse • any file type</p>
      </div>

      {/* File List */}
      {files.length > 0 && (
        <div className="file-list mt-16">
          {files.map((file, i) => {
            const Icon = getFileIcon(file.type)
            return (
              <div key={`${file.name}-${i}`} className="file-item">
                <Icon size={20} className="file-item-icon" />
                <div className="file-item-info">
                  <div className="file-item-name">{file.name}</div>
                  <div className="file-item-size">{formatSize(file.size)}</div>
                </div>
                {!uploading && (
                  <button
                    className="file-item-remove"
                    onClick={(e) => {
                      e.stopPropagation()
                      removeFile(i)
                    }}
                  >
                    <X size={16} />
                  </button>
                )}
              </div>
            )
          })}
        </div>
      )}

      {/* Progress Bar */}
      {uploading && (
        <div className="progress-container">
          <div className="progress-bar-track">
            <div
              className="progress-bar-fill"
              style={{ width: `${progress}%` }}
            />
          </div>
          <div className="progress-text">
            <span>Uploading {files[currentFileIndex]?.name}</span>
            <span>{progress}%</span>
          </div>
        </div>
      )}

      {/* Upload Button */}
      {files.length > 0 && (
        <button
          className="btn-primary mt-16"
          onClick={uploadFiles}
          disabled={uploading}
        >
          {uploading ? (
            <div className="spinner" />
          ) : (
            <>
              <CloudUpload size={18} />
              Upload {files.length} {files.length === 1 ? 'file' : 'files'} to Google Drive
            </>
          )}
        </button>
      )}
    </div>
  )
}
