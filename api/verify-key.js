export default async function handler(req, res) {
  if (req.method !== 'POST') {
    res.setHeader('Allow', ['POST'])
    return res.status(405).json({ error: 'Method Not Allowed' })
  }

  try {
    const body = typeof req.body === 'string' ? JSON.parse(req.body) : (req.body || {})
    const { key } = body
    const masterKey = process.env.MASTER_KEY

    if (key && masterKey && key === masterKey) {
      return res.status(200).json({ valid: true })
    } else {
      return res.status(401).json({ valid: false })
    }
  } catch (error) {
    return res.status(401).json({ valid: false })
  }
}
