const CLOUD_NAME = Deno.env.get('CLOUDINARY_CLOUD_NAME') || 'dvnhgvdd1'
const API_KEY = Deno.env.get('CLOUDINARY_API_KEY') || ''
const API_SECRET = Deno.env.get('CLOUDINARY_API_SECRET') || ''

const CORS_HEADERS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization',
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { status: 204, headers: CORS_HEADERS })
  }

  try {
    if (req.method !== 'POST') {
      return new Response(JSON.stringify({ error: 'Method not allowed' }), { status: 405, headers: { 'Content-Type': 'application/json', ...CORS_HEADERS } })
    }

    const body = await req.json()
    const { upload_preset } = body
    const timestamp = Math.round(Date.now() / 1000)

    const params: Record<string, string> = {
      timestamp: String(timestamp),
      source: 'uw',
    }
    if (upload_preset) params.upload_preset = upload_preset

    const sortedKeys = Object.keys(params).sort()
    const signatureStr = sortedKeys.map(k => `${k}=${params[k]}`).join('&') + API_SECRET

    const encoder = new TextEncoder()
    const data = encoder.encode(signatureStr)
    const hashBuffer = await crypto.subtle.digest('SHA-1', data)
    const hashArray = Array.from(new Uint8Array(hashBuffer))
    const signature = hashArray.map(b => b.toString(16).padStart(2, '0')).join('')

    return new Response(
      JSON.stringify({ signature, api_key: API_KEY, timestamp, cloud_name: CLOUD_NAME }),
      { status: 200, headers: { 'Content-Type': 'application/json', ...CORS_HEADERS } },
    )
  } catch (err) {
    return new Response(
      JSON.stringify({ error: err instanceof Error ? err.message : 'Internal error' }),
      { status: 500, headers: { 'Content-Type': 'application/json', ...CORS_HEADERS } },
    )
  }
})
