import { apiFetch } from './client'

const path = '/players'

export function listPlayers(params = {}) {
  const q = new URLSearchParams(params).toString()
  return apiFetch(q ? `${path}?${q}` : path)
}

export function getPlayer(id) {
  return apiFetch(`${path}/${id}`)
}

export function createPlayer(body) {
  return apiFetch(path, { method: 'POST', body })
}

export function updatePlayer(id, body) {
  return apiFetch(`${path}/${id}`, { method: 'PATCH', body })
}

export function deletePlayer(id) {
  return apiFetch(`${path}/${id}`, { method: 'DELETE' })
}
