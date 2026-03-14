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

export function useUpdateLeague() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: ({ id, ...body }) => leaguesApi.updateLeague(id, body),
    onSuccess: (_, { id }) => {
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
