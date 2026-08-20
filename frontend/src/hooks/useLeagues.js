import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import * as leaguesApi from '../api/leagues'
import { queryKeys } from './queryKeys'

export function useLeagueList(params = {}) {
  return useQuery({
    queryKey: queryKeys.leagues.list(params),
    queryFn: () => leaguesApi.listLeagues(params),
  })
}

export function useLeague(id, options = {}) {
  return useQuery({
    queryKey: queryKeys.leagues.detail(id),
    queryFn: () => leaguesApi.getLeague(id),
    enabled: id != null && options.enabled !== false,
  })
}

export function useCreateLeague() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (body) => leaguesApi.createLeague(body),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: queryKeys.leagues.all })
    },
  })
}

export function useImportFantraxLeague() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (body) => leaguesApi.importFantraxLeague(body),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: queryKeys.leagues.all })
      qc.invalidateQueries({ queryKey: queryKeys.teams.all })
    },
  })
}

export function useUpdateLeague() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: ({ id, ...body }) => leaguesApi.updateLeague(id, body),
    onMutate: async ({ id, ...body }) => {
      await qc.cancelQueries({ queryKey: queryKeys.leagues.all })
      const listKey = queryKeys.leagues.list({})
      const prev = qc.getQueryData(listKey)
      if (prev?.data) {
        qc.setQueryData(listKey, {
          ...prev,
          data: prev.data.map((l) => (l.id === id ? { ...l, ...body } : l)),
        })
      }
      return { prev }
    },
    onError: (_err, _vars, ctx) => {
      if (ctx?.prev) qc.setQueryData(queryKeys.leagues.list({}), ctx.prev)
    },
    onSettled: (_, __, { id }) => {
      qc.invalidateQueries({ queryKey: queryKeys.leagues.all })
      qc.invalidateQueries({ queryKey: queryKeys.leagues.detail(id) })
    },
  })
}

export function useDeleteLeague() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (id) => leaguesApi.deleteLeague(id),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: queryKeys.leagues.all })
    },
  })
}

export function useWaiverBoard(leagueId, teamId) {
  return useQuery({
    queryKey: [...queryKeys.leagues.all, 'waiver-board', leagueId, teamId],
    queryFn: () => leaguesApi.getWaiverBoard(leagueId, teamId),
    enabled: leagueId != null && teamId != null,
  })
}

export function useFlagWaiverClaims() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: () => leaguesApi.flagWaiverClaims(),
    onMutate: async () => {
      await qc.cancelQueries({ queryKey: queryKeys.leagues.all })
      const listKey = queryKeys.leagues.list({})
      const prev = qc.getQueryData(listKey)
      if (prev?.data) {
        qc.setQueryData(listKey, {
          ...prev,
          data: prev.data.map((l) => ({ ...l, requires_waiver_claim: true })),
        })
      }
      return { prev }
    },
    onError: (_err, _vars, ctx) => {
      if (ctx?.prev) qc.setQueryData(queryKeys.leagues.list({}), ctx.prev)
    },
    onSettled: () => {
      qc.invalidateQueries({ queryKey: queryKeys.leagues.all })
    },
  })
}

export function useFlagRosterMoves() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: () => leaguesApi.flagRosterMoves(),
    onMutate: async () => {
      await qc.cancelQueries({ queryKey: queryKeys.leagues.all })
      const listKey = queryKeys.leagues.list({})
      const prev = qc.getQueryData(listKey)
      if (prev?.data) {
        qc.setQueryData(listKey, {
          ...prev,
          data: prev.data.map((l) => ({ ...l, requires_roster_moves: true })),
        })
      }
      return { prev }
    },
    onError: (_err, _vars, ctx) => {
      if (ctx?.prev) qc.setQueryData(queryKeys.leagues.list({}), ctx.prev)
    },
    onSettled: () => {
      qc.invalidateQueries({ queryKey: queryKeys.leagues.all })
    },
  })
}

export function useFlagRosterOptimisation() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: () => leaguesApi.flagRosterOptimisation(),
    onMutate: async () => {
      await qc.cancelQueries({ queryKey: queryKeys.leagues.all })
      const listKey = queryKeys.leagues.list({})
      const prev = qc.getQueryData(listKey)
      if (prev?.data) {
        qc.setQueryData(listKey, {
          ...prev,
          data: prev.data.map((l) => ({ ...l, requires_roster_optimised: true })),
        })
      }
      return { prev }
    },
    onError: (_err, _vars, ctx) => {
      if (ctx?.prev) qc.setQueryData(queryKeys.leagues.list({}), ctx.prev)
    },
    onSettled: () => {
      qc.invalidateQueries({ queryKey: queryKeys.leagues.all })
    },
  })
}

export function useFlagThursdayUpdate() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: () => leaguesApi.flagThursdayUpdate(),
    onMutate: async () => {
      await qc.cancelQueries({ queryKey: queryKeys.leagues.all })
      const listKey = queryKeys.leagues.list({})
      const prev = qc.getQueryData(listKey)
      if (prev?.data) {
        qc.setQueryData(listKey, {
          ...prev,
          data: prev.data.map((l) => ({ ...l, requires_thursday_update: true })),
        })
      }
      return { prev }
    },
    onError: (_err, _vars, ctx) => {
      if (ctx?.prev) qc.setQueryData(queryKeys.leagues.list({}), ctx.prev)
    },
    onSettled: () => {
      qc.invalidateQueries({ queryKey: queryKeys.leagues.all })
    },
  })
}

export function useFlagPreSeasonOptimisation() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: () => leaguesApi.flagPreSeasonOptimisation(),
    onMutate: async () => {
      await qc.cancelQueries({ queryKey: queryKeys.leagues.all })
      const listKey = queryKeys.leagues.list({})
      const prev = qc.getQueryData(listKey)
      if (prev?.data) {
        qc.setQueryData(listKey, {
          ...prev,
          data: prev.data.map((l) => ({ ...l, requires_pre_season_optimised: true })),
        })
      }
      return { prev }
    },
    onError: (_err, _vars, ctx) => {
      if (ctx?.prev) qc.setQueryData(queryKeys.leagues.list({}), ctx.prev)
    },
    onSettled: () => {
      qc.invalidateQueries({ queryKey: queryKeys.leagues.all })
    },
  })
}

export function useUpdateRosters() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: ({ leagueId }) => leaguesApi.updateRosters(leagueId),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: queryKeys.leagues.all })
      qc.invalidateQueries({ queryKey: queryKeys.teams.all })
    },
  })
}

export function useUpdateAllRosters() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: () => leaguesApi.updateAllRosters(),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: queryKeys.leagues.all })
      qc.invalidateQueries({ queryKey: queryKeys.teams.all })
    },
  })
}
