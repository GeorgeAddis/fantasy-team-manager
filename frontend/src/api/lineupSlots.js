import { apiFetch } from './client'

const path = '/lineup-slots'

export function listLineupSlots(params = {}) {
  const q = new URLSearchParams(params).toString()
  return apiFetch(q ? `${path}?${q}` : path)
}

export function getLineupSlot(id) {
  return apiFetch(`${path}/${id}`)
}

export function createLineupSlot(body) {
  return apiFetch(path, { method: 'POST', body })
}

export function updateLineupSlot(id, body) {
  return apiFetch(`${path}/${id}`, { method: 'PATCH', body })
}

export function deleteLineupSlot(id) {
  return apiFetch(`${path}/${id}`, { method: 'DELETE' })
}
