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

export function getPlayerStats() {
  return apiFetch(`${path}/stats`)
}

export function importPlayers(file, clearExisting = false) {
  const form = new FormData()
  form.append('file', file)
  if (clearExisting) form.append('clear_existing', '1')
  return apiFetch(`${path}/import`, { method: 'POST', body: form })
}

export function importRankings(data, type, period) {
  return apiFetch(`${path}/import-rankings`, {
    method: 'POST',
    body: { data, type, period },
  })
}
