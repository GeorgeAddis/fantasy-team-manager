import { apiFetch } from './client'

const path = '/settings'

export function getSettings() {
  return apiFetch(path)
}

export function updateSetting(key, value) {
  return apiFetch(path, { method: 'PATCH', body: { key, value } })
}
