import { apiFetch } from './client'

const path = '/irl-franchises'

export function listIrlFranchises(params = {}) {
  const q = new URLSearchParams(params).toString()
  return apiFetch(q ? `${path}?${q}` : path)
}

export function getIrlFranchise(id) {
  return apiFetch(`${path}/${id}`)
}

export function createIrlFranchise(body) {
  return apiFetch(path, { method: 'POST', body })
}

export function updateIrlFranchise(id, body) {
  return apiFetch(`${path}/${id}`, { method: 'PATCH', body })
}

export function deleteIrlFranchise(id) {
  return apiFetch(`${path}/${id}`, { method: 'DELETE' })
}
