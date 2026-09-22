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

    // 1. List files in the root folder (non-folder items only)
    const rootFiles = []
    let pageToken = null

    do {
      const listRes = await drive.files.list({
        q: `'${parentFolderId}' in parents and trashed = false and mimeType != 'application/vnd.google-apps.folder'`,
        fields: 'nextPageToken, files(id, name, mimeType, size, createdTime, webViewLink, webContentLink)',
        orderBy: 'createdTime desc',
        pageSize: 100,
        pageToken: pageToken || undefined,
        spaces: 'drive',
        supportsAllDrives: true,
        includeItemsFromAllDrives: true,
      })

      for (const file of (listRes.data.files || [])) {
        rootFiles.push({
          ...file,
          folder: 'Files',
        })
      }
      pageToken = listRes.data.nextPageToken
    } while (pageToken)

    // 2. Find the Snippets subfolder
    const snippetFiles = []
    const folderRes = await drive.files.list({
      q: `'${parentFolderId}' in parents and name = 'Snippets' and mimeType = 'application/vnd.google-apps.folder' and trashed = false`,
      fields: 'files(id)',
      spaces: 'drive',
      supportsAllDrives: true,
      includeItemsFromAllDrives: true,
    })

    if (folderRes.data.files && folderRes.data.files.length > 0) {
      const snippetsFolderId = folderRes.data.files[0].id
      let snippetPageToken = null

      do {
        const snippetListRes = await drive.files.list({
          q: `'${snippetsFolderId}' in parents and trashed = false and mimeType != 'application/vnd.google-apps.folder'`,
          fields: 'nextPageToken, files(id, name, mimeType, size, createdTime, webViewLink, webContentLink)',
          orderBy: 'createdTime desc',
          pageSize: 100,
          pageToken: snippetPageToken || undefined,
          spaces: 'drive',
          supportsAllDrives: true,
          includeItemsFromAllDrives: true,
        })

        for (const file of (snippetListRes.data.files || [])) {
          snippetFiles.push({
            ...file,
            folder: 'Snippets',
          })
        }
        snippetPageToken = snippetListRes.data.nextPageToken
      } while (snippetPageToken)
    }

    // 3. Merge and sort by createdTime descending
    const allFiles = [...rootFiles, ...snippetFiles].sort(
      (a, b) => new Date(b.createdTime) - new Date(a.createdTime)
    )

    return res.status(200).json({ files: allFiles })
  } catch (error) {
    console.error('Error listing files:', error.response?.data || error.message || error)
    return res.status(500).json({
      error: error.response?.data?.error_description || error.message || 'Internal Server Error'
    })
  }
}
