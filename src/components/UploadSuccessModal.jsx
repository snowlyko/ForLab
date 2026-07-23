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
        <button
          onClick={onClose}
          style={{
            position: 'absolute',
            top: '16px',
            right: '16px',
            background: 'rgba(255,255,255,0.08)',
            border: '1px solid rgba(255,255,255,0.1)',
            borderRadius: '8px',
            color: 'var(--text-secondary)',
            cursor: 'pointer',
            padding: '6px',
            display: 'flex',
            transition: 'all 0.2s var(--ease-out)',
          }}
        >
          <X size={16} />
        </button>

        {/* Success Icon */}
        <div className="modal-success-icon">
          <CheckCircle size={30} />
        </div>

        <h2 className="modal-title">
          {singleResult ? 'Uploaded!' : `${results.length} Files Uploaded!`}
        </h2>
        <p className="modal-subtitle">
          {singleResult
            ? results[0].fileName
            : 'All files saved to Google Drive'
          }
        </p>

        {/* QR Code (for single file) */}
        {singleResult && primaryLink && (
          <div style={{ display: 'flex', justifyContent: 'center', marginBottom: '20px' }}>
            <div className="modal-qr">
              <QRCodeSVG
                value={primaryLink}
                size={140}
                level="M"
                bgColor="#ffffff"
                fgColor="#0a0a1a"
              />
            </div>
          </div>
        )}

        {/* Links */}
        {results.map((result, i) => (
          <div key={i} style={{ marginBottom: i < results.length - 1 ? '10px' : '20px' }}>
            {!singleResult && (
              <div style={{
                fontSize: '0.75rem',
                color: 'var(--text-secondary)',
                marginBottom: '6px',
                textAlign: 'left',
              }}>
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
                {copiedIndex === i ? <Check size={12} /> : <Copy size={12} />}
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
            <ExternalLink size={16} />
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
