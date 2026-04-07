import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import * as api from '../api/players'
import { queryKeys } from './queryKeys'

export function usePlayerList(params = {}, options = {}) {
  return useQuery({
    queryKey: queryKeys.players.list(params),
    queryFn: () => api.listPlayers(params),
    enabled: options.enabled !== false,
  })
}

export function usePlayer(id, options = {}) {
  return useQuery({
    queryKey: queryKeys.players.detail(id),
    queryFn: () => api.getPlayer(id),
    enabled: id != null && options.enabled !== false,
  })
}

export function useCreatePlayer() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (body) => api.createPlayer(body),
    onSuccess: () => qc.invalidateQueries({ queryKey: queryKeys.players.all }),
  })
}

export function useUpdatePlayer() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: ({ id, ...body }) => api.updatePlayer(id, body),
    onSuccess: (_, { id }) => {
      qc.invalidateQueries({ queryKey: queryKeys.players.all })
      qc.invalidateQueries({ queryKey: queryKeys.players.detail(id) })
    },
  })
}

export function useDeletePlayer() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (id) => api.deletePlayer(id),
    onSuccess: () => qc.invalidateQueries({ queryKey: queryKeys.players.all }),
  })
}

export function usePlayerStats() {
  return useQuery({
    queryKey: queryKeys.players.stats,
    queryFn: () => api.getPlayerStats(),
  })
}

export function useImportPlayers() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: ({ file, clearExisting, skipExisting }) => api.importPlayers(file, clearExisting, skipExisting),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: queryKeys.players.all })
      qc.invalidateQueries({ queryKey: queryKeys.players.stats })
    },
  })
}

export function useImportFantraxIds() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: () => api.importFantraxIds(),
    onSuccess: () => qc.invalidateQueries({ queryKey: queryKeys.players.all }),
  })
}

export function useImportRankings() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: ({ data, type, period }) => api.importRankings(data, type, period),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: queryKeys.players.all })
    },
  })
}
