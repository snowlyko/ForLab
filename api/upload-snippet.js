import { google } from 'googleapis'
import { Readable } from 'stream'

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
    const { content, language, fileName } = body

    const extensionMap = {
      cpp: '.cpp',
      python: '.py',
      java: '.java',
      javascript: '.js',
      text: '.txt'
    }

    let finalFileName = fileName
    if (!finalFileName) {
      const langKey = language ? String(language).toLowerCase() : 'text'
      const ext = extensionMap[langKey] || '.txt'
      const now = new Date()
      const pad = (n) => String(n).padStart(2, '0')
      const dateStr = `${now.getFullYear()}-${pad(now.getMonth() + 1)}-${pad(now.getDate())}`
      const timeStr = `${pad(now.getHours())}-${pad(now.getMinutes())}`
      finalFileName = `Snippet_${dateStr}_${timeStr}${ext}`
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

    // Find or create 'Snippets' subfolder inside parent folder
    let snippetsFolderId = null
    let query = "name = 'Snippets' and mimeType = 'application/vnd.google-apps.folder' and trashed = false"
    if (parentFolderId) {
      query += ` and '${parentFolderId}' in parents`
    }

    const listFolderRes = await drive.files.list({
      q: query,
      fields: 'files(id, name)',
      spaces: 'drive',
      supportsAllDrives: true,
      includeItemsFromAllDrives: true
    })

    if (listFolderRes.data.files && listFolderRes.data.files.length > 0) {
      snippetsFolderId = listFolderRes.data.files[0].id
    } else {
      const folderMetadata = {
        name: 'Snippets',
        mimeType: 'application/vnd.google-apps.folder',
        ...(parentFolderId ? { parents: [parentFolderId] } : {})
      }
      const folderRes = await drive.files.create({
        requestBody: folderMetadata,
        fields: 'id',
        supportsAllDrives: true
      })
      snippetsFolderId = folderRes.data.id
    }

    // Convert text content to readable stream
    const bufferStream = new Readable()
    bufferStream.push(content || '')
    bufferStream.push(null)

    const fileMetadata = {
      name: finalFileName,
      parents: [snippetsFolderId]
    }

    const media = {
      mimeType: 'text/plain; charset=utf-8',
      body: bufferStream
    }

    const uploadedFile = await drive.files.create({
      requestBody: fileMetadata,
      media: media,
      fields: 'id, webViewLink',
      supportsAllDrives: true
    })

    const fileId = uploadedFile.data.id

    // Set permissions to anyone with link can view (reader)
    await drive.permissions.create({
      fileId: fileId,
      requestBody: {
        role: 'reader',
        type: 'anyone'
      },
      supportsAllDrives: true
    })

    const webViewLink = uploadedFile.data.webViewLink || `https://drive.google.com/file/d/${fileId}/view?usp=sharing`

    return res.status(200).json({
      webViewLink,
      fileName: finalFileName
    })
  } catch (error) {
    console.error('Error uploading snippet:', error.response?.data || error.message || error)
    return res.status(500).json({
      error: error.response?.data?.error_description || error.message || 'Internal Server Error'
    })
  }
}
