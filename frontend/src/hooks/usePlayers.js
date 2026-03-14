import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import * as api from '../api/players'
import { queryKeys } from './queryKeys'

export function usePlayerList(params = {}) {
  return useQuery({
    queryKey: queryKeys.players.list(params),
    queryFn: () => api.listPlayers(params),
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
