import { useState } from 'react'
import { QRCodeSVG } from 'qrcode.react'
import { CheckCircle, Copy, Check, ExternalLink, X } from 'lucide-react'

export default function UploadSuccessModal({ results, onClose }) {
  const [copiedIndex, setCopiedIndex] = useState(null)

  const copyLink = async (link, index) => {
    try {
      await navigator.clipboard.writeText(link)
      setCopiedIndex(index)
      setTimeout(() => setCopiedIndex(null), 2000)
    } catch {
      // Fallback for older browsers
      const textArea = document.createElement('textarea')
      textArea.value = link
      document.body.appendChild(textArea)
      textArea.select()
      document.execCommand('copy')
      document.body.removeChild(textArea)
      setCopiedIndex(index)
      setTimeout(() => setCopiedIndex(null), 2000)
    }
  }

  const singleResult = results.length === 1
  const primaryLink = results[0]?.webViewLink

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div
        className="modal-card glass-panel-static"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Close Button */}
        <button onClick={onClose} className="modal-close-btn">
          <X size={14} />
        </button>

        {/* Success Icon */}
        <div className="modal-success-icon">
          <CheckCircle size={26} />
        </div>

        <h2 className="modal-title">
          {singleResult ? 'Uploaded' : `${results.length} Files Uploaded`}
        </h2>
        <p className="modal-subtitle">
          {singleResult
            ? results[0].fileName
            : 'All files saved to Google Drive'
          }
        </p>

        {/* QR Code (for single file) */}
        {singleResult && primaryLink && (
          <div className="modal-qr-wrap">
            <div className="modal-qr">
              <QRCodeSVG
                value={primaryLink}
                size={130}
                level="M"
                bgColor="#ffffff"
                fgColor="#0b0b0d"
              />
            </div>
          </div>
        )}

        {/* Links */}
        {results.map((result, i) => (
          <div key={i} className="modal-link-row">
            {!singleResult && (
              <div className="modal-link-label">
                {result.fileName}
              </div>
            )}
            <div className="modal-link-box">
              <span className="modal-link-text">
                {result.webViewLink}
              </span>
              <button
                className={`modal-copy-btn ${copiedIndex === i ? 'copied' : ''}`}
                onClick={() => copyLink(result.webViewLink, i)}
              >
                {copiedIndex === i ? <Check size={11} /> : <Copy size={11} />}
                {copiedIndex === i ? 'Copied' : 'Copy'}
              </button>
            </div>
          </div>
        ))}

        {/* Open in Drive Button */}
        {singleResult && primaryLink && (
          <a
            href={primaryLink}
            target="_blank"
            rel="noopener noreferrer"
            className="btn-secondary"
            style={{ textDecoration: 'none' }}
          >
            <ExternalLink size={14} />
            Open in Google Drive
          </a>
        )}

        <button className="btn-primary mt-12" onClick={onClose}>
          Done
        </button>
      </div>
    </div>
  )
}
