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

export function importRankings(data, type, period, ppr = true) {
  return apiFetch(`${path}/import-rankings`, {
    method: 'POST',
    body: { data, type, period, ppr },
  })
}

export function importSeasonRankings({ file, data, ppr = true } = {}) {
  if (file) {
    const form = new FormData()
    form.append('file', file)
    form.append('ppr', ppr ? '1' : '0')
    return apiFetch(`${path}/import-season-rankings`, { method: 'POST', body: form })
  }
  return apiFetch(`${path}/import-season-rankings`, {
    method: 'POST',
    body: { data, ppr },
  })
}

export function searchMyTeams(params = {}) {
  const q = new URLSearchParams(params).toString()
  return apiFetch(`${path}/search-my-teams?${q}`)
}

export function getPlayerExposure() {
  return apiFetch(`${path}/exposure`)
}

export function importWaiverRankings(data, type, ppr = true) {
  return apiFetch(`${path}/import-waiver-rankings`, {
    method: 'POST',
    body: { data, type, ppr },
  })
}

export function listDoNotRoster() {
  return apiFetch(`${path}/do-not-roster`)
}

export function addDoNotRoster(data) {
  return apiFetch(`${path}/do-not-roster`, {
    method: 'POST',
    body: { data },
  })
}

export function removeDoNotRoster(playerId) {
  return apiFetch(`${path}/${playerId}/do-not-roster`, { method: 'DELETE' })
}

export function resetDoNotRoster() {
  return apiFetch(`${path}/reset-do-not-roster`, { method: 'POST' })
}

export function listDoNotRosterTeams() {
  return apiFetch(`${path}/do-not-roster-teams`)
}
