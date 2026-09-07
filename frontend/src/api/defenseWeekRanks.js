import { apiFetch } from './client'

const path = '/defense-week-ranks'

export function listDefenseWeekRanks(week) {
  return apiFetch(`${path}?week=${week}`)
}

export function updateDefenseWeekRanks(week, data) {
  return apiFetch(path, { method: 'PUT', body: { week, data } })
}

export function getDefenseManagement() {
  return apiFetch(`${path}/management`)
}
