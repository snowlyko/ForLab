import { useState } from 'react'
import { FolderUp, Code, LogOut } from 'lucide-react'
import KeyAuthModal from './components/KeyAuthModal'
import FileDropzone from './components/FileDropzone'
import SnippetEditor from './components/SnippetEditor'
import UploadSuccessModal from './components/UploadSuccessModal'
import './index.css'

export default function App() {
  const [masterKey, setMasterKey] = useState(null)
  const [activeTab, setActiveTab] = useState('files')
  const [uploadResults, setUploadResults] = useState(null)

  const handleAuthenticated = (key) => {
    setMasterKey(key)
  }

  const handleUploadSuccess = (results) => {
    setUploadResults(results)
  }

  const handleLogout = () => {
    setMasterKey(null)
    setActiveTab('files')
  }

  // Lock screen
  if (!masterKey) {
    return <KeyAuthModal onAuthenticated={handleAuthenticated} />
  }

  return (
    <div className="app-container">
      {/* Background */}
      <div className="app-bg" />
      <div className="orb orb-1" />
      <div className="orb orb-2" />
      <div className="orb orb-3" />

      {/* Dashboard */}
      <div className="dashboard">
        {/* Header */}
        <div className="glass-panel-static header">
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '12px' }}>
            <h1 className="header-logo">ForLab</h1>
            <button
              onClick={handleLogout}
              title="Lock"
              style={{
                background: 'rgba(255,255,255,0.06)',
                border: '1px solid rgba(255,255,255,0.1)',
                borderRadius: '10px',
                color: 'var(--text-tertiary)',
                cursor: 'pointer',
                padding: '8px',
                display: 'flex',
                alignItems: 'center',
                transition: 'all 0.2s var(--ease-out)',
              }}
            >
              <LogOut size={16} />
            </button>
          </div>
          <p className="header-tagline">Drop files & code straight to your Google Drive</p>
        </div>

        {/* Tab Navigation */}
        <div className="tab-nav">
          <button
            className={`tab-btn ${activeTab === 'files' ? 'active' : ''}`}
            onClick={() => setActiveTab('files')}
          >
            <FolderUp size={18} />
            Files
          </button>
          <button
            className={`tab-btn ${activeTab === 'snippet' ? 'active' : ''}`}
            onClick={() => setActiveTab('snippet')}
          >
            <Code size={18} />
            Code Snippet
          </button>
        </div>

        {/* Tab Content */}
        <div className="glass-panel-static" style={{ padding: '24px', minHeight: '280px' }}>
          {activeTab === 'files' ? (
            <FileDropzone
              masterKey={masterKey}
              onUploadSuccess={handleUploadSuccess}
            />
          ) : (
            <SnippetEditor
              masterKey={masterKey}
              onUploadSuccess={handleUploadSuccess}
            />
          )}
        </div>
      </div>

      {/* Success Modal */}
      {uploadResults && (
        <UploadSuccessModal
          results={uploadResults}
          onClose={() => setUploadResults(null)}
        />
      )}
    </div>
  )
}
