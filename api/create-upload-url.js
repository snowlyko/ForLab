import { google } from 'googleapis'

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    res.setHeader('Allow', ['POST'])
    return res.status(405).json({ error: 'Method Not Allowed' })
  }

  // Validate Master Key from x-master-key header
  const clientKey = req.headers['x-master-key']
  const masterKey = process.env.MASTER_KEY
  if (!clientKey || !masterKey || clientKey !== masterKey) {
    return res.status(401).json({ error: 'Unauthorized: Invalid master key' })
  }

  try {
    const body = typeof req.body === 'string' ? JSON.parse(req.body) : (req.body || {})
    const { fileName, mimeType } = body

    const folderId = process.env.GOOGLE_DRIVE_FOLDER_ID
    const clientId = process.env.GOOGLE_CLIENT_ID
    const clientSecret = process.env.GOOGLE_CLIENT_SECRET
    const refreshToken = process.env.GOOGLE_REFRESH_TOKEN

    const serviceEmail = process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL
    let privateKey = process.env.GOOGLE_PRIVATE_KEY

    let auth

    // Priority 1: User OAuth2 Credentials + Refresh Token
    if (clientId && clientSecret && refreshToken) {
      const oauth2Client = new google.auth.OAuth2(
        clientId.trim(),
        clientSecret.trim(),
        'https://developers.google.com/oauthplayground'
      )
      oauth2Client.setCredentials({ refresh_token: refreshToken.trim() })
      auth = oauth2Client
    } 
    // Priority 2: Service Account JWT
    else if (serviceEmail && privateKey) {
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
      return res.status(500).json({ error: 'Google Drive configuration is missing (CLIENT_ID, CLIENT_SECRET, REFRESH_TOKEN required).' })
    }

    const fileMetadata = {
      name: fileName || 'Untitled',
      ...(folderId ? { parents: [folderId] } : {})
    }

    const response = await auth.request({
      url: 'https://www.googleapis.com/upload/drive/v3/files?uploadType=resumable&supportsAllDrives=true&fields=id,webViewLink',
      method: 'POST',
      headers: {
        'Content-Type': 'application/json; charset=UTF-8',
        'X-Upload-Content-Type': mimeType || 'application/octet-stream'
      },
      data: fileMetadata
    })

    const uploadUrl = response.headers.location || response.headers['location']
    const fileId = response.data ? response.data.id : null
    const webViewLink = response.data && response.data.webViewLink
      ? response.data.webViewLink
      : (fileId ? `https://drive.google.com/file/d/${fileId}/view` : null)

    if (!uploadUrl) {
      throw new Error('Failed to retrieve resumable upload URL from Google Drive API')
    }

    return res.status(200).json({
      uploadUrl,
      fileId,
      webViewLink
    })
  } catch (error) {
    console.error('Error creating upload URL:', error.response?.data || error.message || error)
    return res.status(500).json({
      error: error.response?.data?.error_description || error.message || 'Internal Server Error'
    })
  }
}
