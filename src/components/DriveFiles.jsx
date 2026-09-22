import { useState, useEffect, useCallback } from 'react'
import {
  RefreshCw, Download, ExternalLink, Eye, Trash2,
  FileText, Image, Archive, Film, Code, Search, FolderOpen, AlertTriangle
} from 'lucide-react'
import axios from 'axios'
import FilePreviewModal from './FilePreviewModal'

// Text-based extensions that support Quick View & Copy
const TEXT_EXTENSIONS = new Set([
  '.txt', '.py', '.cpp', '.c', '.h', '.hpp', '.java', '.js', '.jsx', '.ts', '.tsx',
  '.json', '.md', '.csv', '.html', '.css', '.xml', '.yaml', '.yml', '.sh', '.bat',
  '.sql', '.r', '.m', '.rb', '.go', '.rs', '.php', '.swift', '.kt', '.scala',
  '.pl', '.lua', '.dart', '.toml', '.ini', '.cfg', '.conf', '.log', '.env',
])

const FILE_ICONS = {
  'application/pdf': FileText,
  'application/zip': Archive,
  'application/x-zip-compressed': Archive,
  'application/x-rar': Archive,
  'image/': Image,
  'video/': Film,
  'text/x-python': Code,
  'text/x-c': Code,
  'text/x-java': Code,
  'text/javascript': Code,
  'application/javascript': Code,
  'application/json': Code,
  'text/html': Code,
  'text/css': Code,
}

function getFileIcon(mimeType) {
  if (!mimeType) return FileText
  for (const [key, Icon] of Object.entries(FILE_ICONS)) {
    if (mimeType.startsWith(key)) return Icon
  }
  if (mimeType.startsWith('text/')) return FileText
  return FileText
}

function getExtension(fileName) {
  const dot = fileName.lastIndexOf('.')
  if (dot === -1) return ''
  return fileName.substring(dot).toLowerCase()
}

function isTextFile(fileName) {
  return TEXT_EXTENSIONS.has(getExtension(fileName))
}

function formatSize(bytes) {
  if (!bytes || bytes === '0') return '\u2014'
  const b = Number(bytes)
  if (b < 1024) return `${b} B`
  if (b < 1024 * 1024) return `${(b / 1024).toFixed(1)} KB`
  return `${(b / (1024 * 1024)).toFixed(1)} MB`
}

function timeAgo(dateStr) {
  const now = new Date()
  const then = new Date(dateStr)
  const diffMs = now - then
  const diffSec = Math.floor(diffMs / 1000)
  const diffMin = Math.floor(diffSec / 60)
  const diffHr = Math.floor(diffMin / 60)
  const diffDays = Math.floor(diffHr / 24)

  if (diffSec < 60) return 'Just now'
  if (diffMin < 60) return `${diffMin}m ago`
  if (diffHr < 24) return `${diffHr}h ago`
  if (diffDays < 7) return `${diffDays}d ago`
  return then.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
}

function isToday(dateStr) {
  const now = new Date()
  const then = new Date(dateStr)
  return now.toDateString() === then.toDateString()
}

function isThisWeek(dateStr) {
  const now = new Date()
  const then = new Date(dateStr)
  const diffMs = now - then
  return diffMs < 7 * 24 * 60 * 60 * 1000
}

const FILTERS = [
  { key: 'all', label: 'All' },
  { key: 'today', label: 'Today' },
  { key: 'week', label: 'This Week' },
]

export default function DriveFiles({ masterKey }) {
  const [files, setFiles] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [filter, setFilter] = useState('all')
  const [search, setSearch] = useState('')
  const [refreshing, setRefreshing] = useState(false)

  // Preview modal state
  const [previewFile, setPreviewFile] = useState(null)
  const [previewContent, setPreviewContent] = useState('')
  const [previewLoading, setPreviewLoading] = useState(false)
  const [previewTruncated, setPreviewTruncated] = useState(false)

  // Delete confirmation
  const [deleteTarget, setDeleteTarget] = useState(null)
  const [deleting, setDeleting] = useState(false)

  const fetchFiles = useCallback(async (showRefresh) => {
    if (showRefresh) setRefreshing(true)
    else setLoading(true)
    setError(null)

    try {
      const { data } = await axios.post('/api/list-files', {}, {
        headers: { 'x-master-key': masterKey },
      })
      setFiles(data.files || [])
    } catch (err) {
      console.error('Failed to list files:', err)
      setError(err.response?.data?.error || 'Failed to load files')
    } finally {
      setLoading(false)
      setRefreshing(false)
    }
  }, [masterKey])

  useEffect(() => {
    fetchFiles(false)
  }, [fetchFiles])

  const handlePreview = async (file) => {
    setPreviewFile(file)
    setPreviewContent('')
    setPreviewLoading(true)
    setPreviewTruncated(false)

    try {
      const { data } = await axios.post('/api/get-file-content', { fileId: file.id }, {
        headers: { 'x-master-key': masterKey },
      })
      setPreviewContent(data.content || '')
      setPreviewTruncated(data.truncated || false)
    } catch (err) {
      console.error('Failed to get file content:', err)
      setPreviewContent('Failed to load file content.')
    } finally {
      setPreviewLoading(false)
    }
  }

  const handleDelete = async () => {
    if (!deleteTarget || deleting) return
    setDeleting(true)

    try {
      await axios.post('/api/delete-file', { fileId: deleteTarget.id }, {
        headers: { 'x-master-key': masterKey },
      })
      setFiles(prev => prev.filter(f => f.id !== deleteTarget.id))
    } catch (err) {
      console.error('Failed to delete file:', err)
      alert(err.response?.data?.error || 'Failed to delete file')
    } finally {
      setDeleting(false)
      setDeleteTarget(null)
    }
  }

  // Apply filters
  let filtered = files
  if (filter === 'today') filtered = filtered.filter(f => isToday(f.createdTime))
  if (filter === 'week') filtered = filtered.filter(f => isThisWeek(f.createdTime))
  if (search.trim()) {
    const q = search.toLowerCase()
    filtered = filtered.filter(f => f.name.toLowerCase().includes(q))
  }

  return (
    <div className="fade-enter">
      {/* Search & Filter Bar */}
      <div className="drive-toolbar">
        <div className="drive-search-wrap">
          <Search size={15} className="drive-search-icon" />
          <input
            type="text"
            className="drive-search"
            placeholder="Search files..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>
        <button
          className="drive-refresh-btn"
          onClick={() => fetchFiles(true)}
          disabled={refreshing}
          title="Refresh"
        >
          <RefreshCw size={14} className={refreshing ? 'drive-spin' : ''} />
        </button>
      </div>

      {/* Filter Pills */}
      <div className="drive-filters">
        {FILTERS.map(f => (
          <button
            key={f.key}
            className={`drive-filter-pill ${filter === f.key ? 'active' : ''}`}
            onClick={() => setFilter(f.key)}
          >
            {f.label}
          </button>
        ))}
      </div>

      {/* Content */}
      {loading ? (
        <div className="drive-loading">
          {[1, 2, 3].map(i => (
            <div key={i} className="drive-skeleton" />
          ))}
        </div>
      ) : error ? (
        <div className="drive-empty">
          <AlertTriangle size={24} />
          <p className="drive-empty-title">{error}</p>
          <button
            className="btn-secondary mt-12"
            style={{ width: 'auto', display: 'inline-flex' }}
            onClick={() => fetchFiles(false)}
          >
            Try Again
          </button>
        </div>
      ) : filtered.length === 0 ? (
        <div className="drive-empty">
          <FolderOpen size={32} strokeWidth={1.2} />
          <p className="drive-empty-title">
            {files.length === 0 ? 'No files yet' : 'No matching files'}
          </p>
          <p className="drive-empty-sub">
            {files.length === 0
              ? 'Upload files or snippets to see them here'
              : 'Try a different search or filter'
            }
          </p>
        </div>
      ) : (
        <div className="drive-file-list">
          {filtered.map((file) => {
            const Icon = getFileIcon(file.mimeType)
            const canPreview = isTextFile(file.name)
            const downloadUrl = `https://drive.google.com/uc?id=${file.id}&export=download`

            return (
              <div key={file.id} className="drive-file-item">
                <div className="drive-file-left">
                  <Icon size={18} className="drive-file-icon" />
                  <div className="drive-file-info">
                    <div className="drive-file-name">{file.name}</div>
                    <div className="drive-file-meta">
                      <span className={`drive-badge ${file.folder === 'Snippets' ? 'badge-snippet' : 'badge-file'}`}>
                        {file.folder}
                      </span>
                      <span>{formatSize(file.size)}</span>
                      <span>&middot;</span>
                      <span>{timeAgo(file.createdTime)}</span>
                    </div>
                  </div>
                </div>
                <div className="drive-file-actions">
                  {canPreview && (
                    <button
                      className="drive-action-btn"
                      onClick={() => handlePreview(file)}
                      title="Quick View"
                    >
                      <Eye size={14} />
                    </button>
                  )}
                  <a
                    href={downloadUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="drive-action-btn"
                    title="Download"
                  >
                    <Download size={14} />
                  </a>
                  <a
                    href={file.webViewLink}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="drive-action-btn"
                    title="Open in Drive"
                  >
                    <ExternalLink size={14} />
                  </a>
                  <button
                    className="drive-action-btn drive-delete-btn"
                    onClick={() => setDeleteTarget(file)}
                    title="Delete"
                  >
                    <Trash2 size={14} />
                  </button>
                </div>
              </div>
            )
          })}
        </div>
      )}

      {/* Preview Modal */}
      {previewFile && (
        <FilePreviewModal
          file={previewFile}
          content={previewContent}
          truncated={previewTruncated}
          loading={previewLoading}
          onClose={() => setPreviewFile(null)}
        />
      )}

      {/* Delete Confirmation Modal */}
      {deleteTarget && (
        <div className="modal-overlay" onClick={() => !deleting && setDeleteTarget(null)}>
          <div
            className="delete-confirm glass-panel-static"
            onClick={(e) => e.stopPropagation()}
          >
            <Trash2 size={22} style={{ color: 'var(--error)', marginBottom: '16px' }} />
            <h3 className="delete-confirm-title">Delete File</h3>
            <p className="delete-confirm-text">
              <strong>{deleteTarget.name}</strong> will be permanently deleted from Google Drive.
            </p>
            <div className="delete-confirm-actions">
              <button
                className="btn-secondary"
                onClick={() => setDeleteTarget(null)}
                disabled={deleting}
                style={{ flex: 1 }}
              >
                Cancel
              </button>
              <button
                className="drive-confirm-delete-btn"
                onClick={handleDelete}
                disabled={deleting}
              >
                {deleting ? <div className="spinner" /> : 'Delete'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
