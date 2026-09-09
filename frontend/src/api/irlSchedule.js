import { apiFetch } from './client'

const path = '/irl-schedule'

export function listIrlSchedule(week, season) {
  const params = new URLSearchParams({ week: String(week) })
  if (season != null) params.set('season', String(season))
  return apiFetch(`${path}?${params}`)
}

export function updateIrlSchedule(season) {
  return apiFetch(`${path}/update`, {
    method: 'POST',
    body: season != null ? { season } : {},
  })
}
