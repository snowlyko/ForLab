import { useState } from 'react'
import { FolderUp, Code, HardDriveDownload, LogOut } from 'lucide-react'
import KeyAuthModal from './components/KeyAuthModal'
import FileDropzone from './components/FileDropzone'
import SnippetEditor from './components/SnippetEditor'
import DriveFiles from './components/DriveFiles'
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
      {/* Dashboard */}
      <div className="dashboard">
        {/* Header */}
        <div className="glass-panel-static header">
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '12px' }}>
            <h1 className="header-logo">ForLab</h1>
            <button
              onClick={handleLogout}
              title="Lock"
              className="logout-btn"
            >
              <LogOut size={15} />
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
            <FolderUp size={16} />
            Files
          </button>
          <button
            className={`tab-btn ${activeTab === 'snippet' ? 'active' : ''}`}
            onClick={() => setActiveTab('snippet')}
          >
            <Code size={16} />
            Code Snippet
          </button>
          <button
            className={`tab-btn ${activeTab === 'drive' ? 'active' : ''}`}
            onClick={() => setActiveTab('drive')}
          >
            <HardDriveDownload size={16} />
            Drive Files
          </button>
        </div>

        {/* Tab Content */}
        <div className="glass-panel-static" style={{ padding: '24px', minHeight: '280px' }}>
          {activeTab === 'files' && (
            <FileDropzone
              masterKey={masterKey}
              onUploadSuccess={handleUploadSuccess}
            />
          )}
          {activeTab === 'snippet' && (
            <SnippetEditor
              masterKey={masterKey}
              onUploadSuccess={handleUploadSuccess}
            />
          )}
          {activeTab === 'drive' && (
            <DriveFiles masterKey={masterKey} />
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
