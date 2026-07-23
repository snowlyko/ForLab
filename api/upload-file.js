import { google } from 'googleapis'
import { Readable } from 'stream'

export const config = {
  api: {
    bodyParser: {
      sizeLimit: '25mb',
    },
  },
}

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
    const { fileName, mimeType, fileData } = body // fileData is base64 string

    if (!fileName || !fileData) {
      return res.status(400).json({ error: 'fileName and fileData are required' })
    }

    const parentFolderId = process.env.GOOGLE_DRIVE_FOLDER_ID
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

    // Convert Base64 back to binary Buffer and Stream
    const buffer = Buffer.from(fileData, 'base64')
    const bufferStream = new Readable()
    bufferStream.push(buffer)
    bufferStream.push(null)

    const fileMetadata = {
      name: fileName,
      ...(parentFolderId ? { parents: [parentFolderId] } : {})
    }

    const media = {
      mimeType: mimeType || 'application/octet-stream',
      body: bufferStream
    }

    const uploadedFile = await drive.files.create({
      requestBody: fileMetadata,
      media: media,
      fields: 'id, webViewLink',
      supportsAllDrives: true
    })

    const fileId = uploadedFile.data.id

    // Set permission so anyone with link can view
    try {
      await drive.permissions.create({
        fileId: fileId,
        requestBody: {
          role: 'reader',
          type: 'anyone'
        },
        supportsAllDrives: true
      })
    } catch (permErr) {
      console.warn('Permission error (non-fatal):', permErr.message)
    }

    const webViewLink = uploadedFile.data.webViewLink || `https://drive.google.com/file/d/${fileId}/view?usp=sharing`

    return res.status(200).json({
      webViewLink,
      fileName,
      fileId
    })
  } catch (error) {
    console.error('Error uploading file:', error.response?.data || error.message || error)
    return res.status(500).json({
      error: error.response?.data?.error_description || error.message || 'Internal Server Error'
    })
  }
}
