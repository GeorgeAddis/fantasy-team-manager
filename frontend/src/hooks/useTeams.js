import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import * as teamsApi from '../api/teams'
import { queryKeys } from './queryKeys'

export function useTeamList(params = {}) {
  return useQuery({
    queryKey: queryKeys.teams.list(params),
    queryFn: () => teamsApi.listTeams(params),
  })
}

export function useTeam(id, options = {}) {
  return useQuery({
    queryKey: queryKeys.teams.detail(id),
    queryFn: () => teamsApi.getTeam(id),
    enabled: id != null && options.enabled !== false,
  })
}

export function useCreateTeam() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (body) => teamsApi.createTeam(body),
    onSuccess: () => qc.invalidateQueries({ queryKey: queryKeys.teams.all }),
  })
}

export function useUpdateTeam() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: ({ id, ...body }) => teamsApi.updateTeam(id, body),
    onSuccess: (_, { id }) => {
      qc.invalidateQueries({ queryKey: queryKeys.teams.all })
      qc.invalidateQueries({ queryKey: queryKeys.teams.detail(id) })
    },
  })
}

export function useDeleteTeam() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (id) => teamsApi.deleteTeam(id),
    onSuccess: () => qc.invalidateQueries({ queryKey: queryKeys.teams.all }),
  })
}
