import { apiFetch } from './client'

const path = '/teams'

export function listTeams(params = {}) {
  const q = new URLSearchParams(params).toString()
  return apiFetch(q ? `${path}?${q}` : path)
}

export function getTeam(id) {
  return apiFetch(`${path}/${id}`)
}

export function createTeam(body) {
  return apiFetch(path, { method: 'POST', body })
}

export function updateTeam(id, body) {
  return apiFetch(`${path}/${id}`, { method: 'PATCH', body })
}

export function deleteTeam(id) {
  return apiFetch(`${path}/${id}`, { method: 'DELETE' })
}

export function getTeamLineupAnalysis() {
  return apiFetch(`${path}/lineup-analysis`)
}

export function getTeamRoster(id) {
  return apiFetch(`${path}/${id}/roster`)
}
