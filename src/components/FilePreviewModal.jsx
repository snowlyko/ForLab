import { useState } from 'react'
import { X, Copy, Check, Download, ExternalLink } from 'lucide-react'

export default function FilePreviewModal({ file, content, truncated, loading, onClose }) {
  const [copied, setCopied] = useState(false)

  const copyContent = async () => {
    try {
      await navigator.clipboard.writeText(content)
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    } catch {
      const textArea = document.createElement('textarea')
      textArea.value = content
      document.body.appendChild(textArea)
      textArea.select()
      document.execCommand('copy')
      document.body.removeChild(textArea)
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    }
  }

  const downloadUrl = `https://drive.google.com/uc?id=${file.id}&export=download`

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div
        className="preview-modal glass-panel-static"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="preview-header">
          <div className="preview-title-row">
            <h3 className="preview-filename">{file.name}</h3>
            <button onClick={onClose} className="preview-close-btn">
              <X size={16} />
            </button>
          </div>
          {truncated && (
            <p className="preview-truncated-notice">
              File too large to show in full — showing first 500 KB
            </p>
          )}
        </div>

        {/* Content */}
        <div className="preview-content-wrap">
          {loading ? (
            <div className="preview-loading">
              <div className="spinner" />
              <span>Loading content…</span>
            </div>
          ) : (
            <pre className="preview-code">{content}</pre>
          )}
        </div>

        {/* Actions */}
        <div className="preview-actions">
          <button
            className={`btn-secondary preview-action-btn ${copied ? 'copied' : ''}`}
            onClick={copyContent}
            disabled={loading || !content}
          >
            {copied ? <Check size={16} /> : <Copy size={16} />}
            {copied ? 'Copied!' : 'Copy to Clipboard'}
          </button>
          <a
            href={downloadUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="btn-secondary preview-action-btn"
          >
            <Download size={16} />
            Download
          </a>
          <a
            href={file.webViewLink}
            target="_blank"
            rel="noopener noreferrer"
            className="btn-secondary preview-action-btn"
          >
            <ExternalLink size={16} />
            Open in Drive
          </a>
        </div>
      </div>
    </div>
  )
}
