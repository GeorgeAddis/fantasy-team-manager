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
    mutationFn: ({ data, type, period, ppr = true }) => api.importRankings(data, type, period, ppr),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: queryKeys.players.all })
    },
  })
}

export function useImportWaiverRankings() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: ({ data, type, ppr = true }) => api.importWaiverRankings(data, type, ppr),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: queryKeys.players.all })
    },
  })
}

export function useSearchMyTeams(params = {}, options = {}) {
  return useQuery({
    queryKey: queryKeys.players.searchMyTeams(params),
    queryFn: () => api.searchMyTeams(params),
    enabled: !!params.search && options.enabled !== false,
  })
}

export function usePlayerExposure(options = {}) {
  return useQuery({
    queryKey: queryKeys.players.exposure,
    queryFn: () => api.getPlayerExposure(),
    enabled: options.enabled !== false,
  })
}

export function useDoNotRosterList() {
  return useQuery({
    queryKey: queryKeys.players.doNotRoster,
    queryFn: () => api.listDoNotRoster(),
  })
}

export function useDoNotRosterTeams() {
  return useQuery({
    queryKey: queryKeys.players.doNotRosterTeams,
    queryFn: () => api.listDoNotRosterTeams(),
  })
}

export function useAddDoNotRoster() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: ({ data }) => api.addDoNotRoster(data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: queryKeys.players.doNotRoster })
      qc.invalidateQueries({ queryKey: queryKeys.players.doNotRosterTeams })
      qc.invalidateQueries({ queryKey: queryKeys.players.all })
      qc.invalidateQueries({ queryKey: queryKeys.teams.all })
    },
  })
}

export function useRemoveDoNotRoster() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (playerId) => api.removeDoNotRoster(playerId),
    onMutate: async (playerId) => {
      await qc.cancelQueries({ queryKey: queryKeys.players.doNotRoster })
      const prev = qc.getQueryData(queryKeys.players.doNotRoster)
      if (prev?.data) {
        qc.setQueryData(queryKeys.players.doNotRoster, {
          ...prev,
          data: prev.data.filter((p) => p.id !== playerId),
        })
      }
      return { prev }
    },
    onError: (_err, _vars, ctx) => {
      if (ctx?.prev) qc.setQueryData(queryKeys.players.doNotRoster, ctx.prev)
    },
    onSettled: () => {
      qc.invalidateQueries({ queryKey: queryKeys.players.doNotRoster })
      qc.invalidateQueries({ queryKey: queryKeys.players.doNotRosterTeams })
      qc.invalidateQueries({ queryKey: queryKeys.players.all })
      qc.invalidateQueries({ queryKey: queryKeys.teams.all })
    },
  })
}

export function useResetDoNotRoster() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: () => api.resetDoNotRoster(),
    onMutate: async () => {
      await qc.cancelQueries({ queryKey: queryKeys.players.doNotRoster })
      const prev = qc.getQueryData(queryKeys.players.doNotRoster)
      qc.setQueryData(queryKeys.players.doNotRoster, { data: [] })
      return { prev }
    },
    onError: (_err, _vars, ctx) => {
      if (ctx?.prev) qc.setQueryData(queryKeys.players.doNotRoster, ctx.prev)
    },
    onSettled: () => {
      qc.invalidateQueries({ queryKey: queryKeys.players.doNotRoster })
      qc.invalidateQueries({ queryKey: queryKeys.players.doNotRosterTeams })
      qc.invalidateQueries({ queryKey: queryKeys.players.all })
      qc.invalidateQueries({ queryKey: queryKeys.teams.all })
    },
  })
}

export function useImportSeasonRankings() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (payload) => api.importSeasonRankings(payload),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: queryKeys.players.all })
      qc.invalidateQueries({ queryKey: queryKeys.leagues.all })
    },
  })
}
