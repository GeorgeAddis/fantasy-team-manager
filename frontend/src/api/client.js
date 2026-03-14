/**
 * Shared fetch client for Laravel JSON API.
 * Dev: Vite proxies /api → http://localhost:8000
 * Prod: set VITE_API_URL=https://api.example.com (no trailing slash)
 */
const BASE =
  import.meta.env.VITE_API_URL?.replace(/\/$/, '') || ''

const API_ROOT = `${BASE}/api/v1`

async function parseJson(res) {
  const text = await res.text()
  if (!text) return null
  try {
    return JSON.parse(text)
  } catch {
    return text
  }
}

export class ApiError extends Error {
  constructor(message, { status, body } = {}) {
    super(message)
    this.name = 'ApiError'
    this.status = status
    this.body = body
  }
}

/**
 * @param {string} path - e.g. "/leagues" (relative to /api/v1)
 * @param {RequestInit} [init]
 */
export async function apiFetch(path, init = {}) {
  const url = `${API_ROOT}${path.startsWith('/') ? path : `/${path}`}`
  const headers = {
    Accept: 'application/json',
    ...init.headers,
  }
  if (init.body != null && typeof init.body === 'object' && !(init.body instanceof FormData)) {
    headers['Content-Type'] = 'application/json'
    init = { ...init, body: JSON.stringify(init.body) }
  }
  const res = await fetch(url, { ...init, headers })
  const body = await parseJson(res)

  if (!res.ok) {
    const msg =
      (body && body.message) ||
      (typeof body === 'string' ? body : res.statusText)
    throw new ApiError(msg || `HTTP ${res.status}`, {
      status: res.status,
      body,
    })
  }
  return body
}

export { API_ROOT }
