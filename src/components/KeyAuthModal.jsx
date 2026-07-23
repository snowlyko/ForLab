import { useState, useRef } from 'react'
import { Lock, ShieldCheck } from 'lucide-react'
import axios from 'axios'

export default function KeyAuthModal({ onAuthenticated }) {
  const [key, setKey] = useState('')
  const [error, setError] = useState(false)
  const [errorMsg, setErrorMsg] = useState('')
  const [loading, setLoading] = useState(false)
  const inputRef = useRef(null)

  const handleSubmit = async (e) => {
    e.preventDefault()
    if (!key.trim() || loading) return

    setLoading(true)
    setError(false)
    setErrorMsg('')

    try {
      const res = await axios.post('/api/verify-key', { key: key.trim() })
      if (res.data.valid) {
        onAuthenticated(key.trim())
      } else {
        triggerError('Invalid key. Try again.')
      }
    } catch (err) {
      if (err.response?.status === 401) {
        triggerError('Invalid key. Try again.')
      } else {
        triggerError('Connection error. Check your network.')
      }
    } finally {
      setLoading(false)
    }
  }

  const triggerError = (msg) => {
    setError(true)
    setErrorMsg(msg)
    setKey('')
    setTimeout(() => inputRef.current?.focus(), 100)
    setTimeout(() => setError(false), 1500)
  }

  return (
    <div className="auth-overlay">
      <div className="app-bg" />
      <div className="orb orb-1" />
      <div className="orb orb-2" />
      <div className="orb orb-3" />

      <div className="auth-card glass-panel-static">
        <div className="auth-icon">
          <Lock size={28} />
        </div>
        <h1 className="auth-title">ForLab</h1>
        <p className="auth-subtitle">Enter your secret key to unlock</p>

        <form onSubmit={handleSubmit}>
          <input
            ref={inputRef}
            type="password"
            className={`auth-input ${error ? 'error' : ''}`}
            placeholder="••••••••"
            value={key}
            onChange={(e) => setKey(e.target.value)}
            autoFocus
            autoComplete="off"
          />
          <p className={`auth-error-text ${errorMsg ? 'visible' : ''}`}>
            {errorMsg || '\u00A0'}
          </p>
          <button
            type="submit"
            className="btn-primary"
            disabled={!key.trim() || loading}
          >
            {loading ? (
              <div className="spinner" />
            ) : (
              <>
                <ShieldCheck size={18} />
                Unlock
              </>
            )}
          </button>
        </form>
      </div>
    </div>
  )
}
