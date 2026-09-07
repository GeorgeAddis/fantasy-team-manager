import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import * as api from '../api/defenseWeekRanks'
import { queryKeys } from './queryKeys'

export function useDefenseWeekRanks(week, options = {}) {
  return useQuery({
    queryKey: queryKeys.defenseWeekRanks.list(week),
    queryFn: () => api.listDefenseWeekRanks(week),
    enabled: week != null && options.enabled !== false,
  })
}

export function useDefenseManagement(options = {}) {
  return useQuery({
    queryKey: [...queryKeys.defenseWeekRanks.all, 'management'],
    queryFn: () => api.getDefenseManagement(),
    enabled: options.enabled !== false,
  })
}

export function useUpdateDefenseWeekRanks() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: ({ week, data }) => api.updateDefenseWeekRanks(week, data),
    onSuccess: (_data, { week }) => {
      qc.invalidateQueries({ queryKey: queryKeys.defenseWeekRanks.list(week) })
      qc.invalidateQueries({ queryKey: queryKeys.defenseWeekRanks.all })
      qc.invalidateQueries({ queryKey: [...queryKeys.defenseWeekRanks.all, 'management'] })
    },
  })
}
