import express from 'express'
import dotenv from 'dotenv'
import verifyKeyHandler from './api/verify-key.js'
import createUploadUrlHandler from './api/create-upload-url.js'
import uploadSnippetHandler from './api/upload-snippet.js'
import uploadFileHandler from './api/upload-file.js'

dotenv.config()

const app = express()
const PORT = 3001

// Support large file uploads (up to 50MB)
app.use(express.json({ limit: '50mb' }))
app.use(express.urlencoded({ limit: '50mb', extended: true }))
app.use(express.text({ limit: '50mb' }))

// Express adapter for Vercel serverless function signatures
const adapter = (handler) => async (req, res) => {
  try {
    await handler(req, res)
  } catch (err) {
    console.error('API Error:', err)
    if (!res.headersSent) {
      res.status(500).json({ error: err.message || 'Internal Server Error' })
    }
  }
}

app.post('/api/verify-key', adapter(verifyKeyHandler))
app.post('/api/create-upload-url', adapter(createUploadUrlHandler))
app.post('/api/upload-snippet', adapter(uploadSnippetHandler))
app.post('/api/upload-file', adapter(uploadFileHandler))

app.listen(PORT, () => {
  console.log(`\n🚀 Local API Server running at http://localhost:${PORT}`)
  console.log(`🔐 Master Key loaded: ${process.env.MASTER_KEY ? 'Yes (' + process.env.MASTER_KEY + ')' : 'No'}\n`)
})
