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

export function importPlayers(file, clearExisting = false, skipExisting = true) {
  const form = new FormData()
  form.append('file', file)
  if (clearExisting) form.append('clear_existing', '1')
  if (skipExisting) form.append('skip_existing', '1')
  return apiFetch(`${path}/import`, { method: 'POST', body: form })
}

export function importFantraxIds() {
  return apiFetch(`${path}/import-fantrax-ids`, { method: 'POST' })
}

export function importRankings(data, type, period) {
  return apiFetch(`${path}/import-rankings`, {
    method: 'POST',
    body: { data, type, period },
  })
}

export function importSeasonRankings(data) {
  return apiFetch(`${path}/import-season-rankings`, {
    method: 'POST',
    body: { data },
  })
}
