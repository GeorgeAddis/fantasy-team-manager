import { apiFetch } from './client'

const path = '/leagues'

/** @returns {Promise<{ data: object[], links?: object, meta?: object }>} */
export function listLeagues(params = {}) {
  const q = new URLSearchParams(params).toString()
  return apiFetch(q ? `${path}?${q}` : path)
}

/** @returns {Promise<object>} */
export function getLeague(id) {
  return apiFetch(`${path}/${id}`)
}

/** @returns {Promise<object>} */
export function createLeague(body) {
  return apiFetch(path, { method: 'POST', body })
}

/** @returns {Promise<object>} */
export function updateLeague(id, body) {
  return apiFetch(`${path}/${id}`, { method: 'PATCH', body })
}

/** @returns {Promise<void>} */
export function deleteLeague(id) {
  return apiFetch(`${path}/${id}`, { method: 'DELETE' })
}

/** @returns {Promise<object>} */
export function getWaiverBoard(leagueId, teamId) {
  return apiFetch(`${path}/${leagueId}/waiver-board?team_id=${teamId}`)
}

/** @returns {Promise<object>} */
export function flagWaiverClaims() {
  return apiFetch(`${path}/flag-waiver-claims`, { method: 'POST' })
}

/** @returns {Promise<object>} */
export function flagRosterMoves() {
  return apiFetch(`${path}/flag-roster-moves`, { method: 'POST' })
}

/** @returns {Promise<object>} */
export function flagRosterOptimisation() {
  return apiFetch(`${path}/flag-roster-optimisation`, { method: 'POST' })
}

/** @returns {Promise<object>} */
export function flagThursdayUpdate() {
  return apiFetch(`${path}/flag-thursday-update`, { method: 'POST' })
}

/** @returns {Promise<object>} */
export function updateRosters(leagueId, data) {
  return apiFetch(`${path}/${leagueId}/update-rosters`, {
    method: 'POST',
    body: { data },
  })
}
