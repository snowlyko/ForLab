import { google } from 'googleapis'

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    res.setHeader('Allow', ['POST'])
    return res.status(405).json({ error: 'Method Not Allowed' })
  }

  // Validate Master Key
  const clientKey = req.headers['x-master-key']
  const masterKey = process.env.MASTER_KEY
  if (!clientKey || !masterKey || clientKey !== masterKey) {
    return res.status(401).json({ error: 'Unauthorized: Invalid master key' })
  }

  try {
    const body = typeof req.body === 'string' ? JSON.parse(req.body) : (req.body || {})
    const { fileId } = body

    if (!fileId) {
      return res.status(400).json({ error: 'fileId is required' })
    }

    const clientId = process.env.GOOGLE_CLIENT_ID
    const clientSecret = process.env.GOOGLE_CLIENT_SECRET
    const refreshToken = process.env.GOOGLE_REFRESH_TOKEN
    const serviceEmail = process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL
    let privateKey = process.env.GOOGLE_PRIVATE_KEY

    let auth

    if (clientId && clientSecret && refreshToken) {
      const oauth2Client = new google.auth.OAuth2(
        clientId.trim(),
        clientSecret.trim(),
        'https://developers.google.com/oauthplayground'
      )
      oauth2Client.setCredentials({ refresh_token: refreshToken.trim() })
      auth = oauth2Client
    } else if (serviceEmail && privateKey) {
      if (!privateKey.includes('-----BEGIN PRIVATE KEY-----')) {
        privateKey = Buffer.from(privateKey, 'base64').toString('utf8')
      }
      privateKey = privateKey.replace(/\\n/g, '\n')

      auth = new google.auth.JWT({
        email: serviceEmail,
        key: privateKey,
        scopes: ['https://www.googleapis.com/auth/drive', 'https://www.googleapis.com/auth/drive.file']
      })
    } else {
      return res.status(500).json({ error: 'Google Drive configuration missing.' })
    }

    const drive = google.drive({ version: 'v3', auth })

    await drive.files.delete({
      fileId,
      supportsAllDrives: true,
    })

    return res.status(200).json({ success: true })
  } catch (error) {
    console.error('Error deleting file:', error.response?.data || error.message || error)
    return res.status(500).json({
      error: error.response?.data?.error_description || error.message || 'Internal Server Error'
    })
  }
}
