import { useState } from 'react'
import { Code, Send } from 'lucide-react'
import axios from 'axios'

const LANGUAGES = [
  { value: 'cpp', label: 'C++', ext: '.cpp' },
  { value: 'python', label: 'Python', ext: '.py' },
  { value: 'java', label: 'Java', ext: '.java' },
  { value: 'javascript', label: 'JavaScript', ext: '.js' },
  { value: 'text', label: 'Plain Text', ext: '.txt' },
]

export default function SnippetEditor({ masterKey, onUploadSuccess }) {
  const [content, setContent] = useState('')
  const [language, setLanguage] = useState('text')
  const [fileName, setFileName] = useState('')
  const [uploading, setUploading] = useState(false)

  const handleKeyDown = (e) => {
    // Allow Tab key for indentation inside the textarea
    if (e.key === 'Tab') {
      e.preventDefault()
      const start = e.target.selectionStart
      const end = e.target.selectionEnd
      const value = e.target.value
      setContent(value.substring(0, start) + '    ' + value.substring(end))
      // Set cursor position after the tab
      setTimeout(() => {
        e.target.selectionStart = e.target.selectionEnd = start + 4
      }, 0)
    }
  }

  const handleUpload = async () => {
    if (!content.trim() || uploading) return

    setUploading(true)

    try {
      const { data } = await axios.post('/api/upload-snippet', {
        content: content,
        language,
        fileName: fileName.trim() || undefined,
      }, {
        headers: { 'x-master-key': masterKey },
      })

      onUploadSuccess([{
        fileName: data.fileName,
        webViewLink: data.webViewLink,
      }])

      setContent('')
      setFileName('')
    } catch (err) {
      console.error('Snippet upload failed:', err)
      alert(err.response?.data?.error || 'Failed to upload snippet')
    } finally {
      setUploading(false)
    }
  }

  const selectedLang = LANGUAGES.find(l => l.value === language)

  return (
    <div className="fade-enter">
      {/* Toolbar */}
      <div className="snippet-toolbar">
        <select
          className="lang-select"
          value={language}
          onChange={(e) => setLanguage(e.target.value)}
        >
          {LANGUAGES.map(lang => (
            <option key={lang.value} value={lang.value}>
              {lang.label}
            </option>
          ))}
        </select>
        <input
          type="text"
          className="snippet-filename"
          placeholder={`Filename (optional)${selectedLang ? selectedLang.ext : ''}`}
          value={fileName}
          onChange={(e) => setFileName(e.target.value)}
        />
      </div>

      {/* Code Textarea */}
      <textarea
        className="snippet-textarea"
        placeholder="Paste your code, text, or URL here..."
        value={content}
        onChange={(e) => setContent(e.target.value)}
        onKeyDown={handleKeyDown}
        spellCheck={false}
      />

      {/* Character count */}
      <div style={{
        display: 'flex',
        justifyContent: 'flex-end',
        marginTop: '8px',
        fontSize: '0.75rem',
        color: 'var(--text-tertiary)',
      }}>
        {content.length.toLocaleString()} characters
      </div>

      {/* Upload Button */}
      <button
        className="btn-primary mt-12"
        onClick={handleUpload}
        disabled={!content.trim() || uploading}
      >
        {uploading ? (
          <div className="spinner" />
        ) : (
          <>
            <Send size={18} />
            Save to Google Drive
          </>
        )}
      </button>
    </div>
  )
}
