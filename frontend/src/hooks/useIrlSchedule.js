import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import * as api from '../api/irlSchedule'
import { queryKeys } from './queryKeys'

export function useIrlSchedule(week, options = {}) {
  return useQuery({
    queryKey: queryKeys.irlSchedule.list(week),
    queryFn: () => api.listIrlSchedule(week),
    enabled: week != null && options.enabled !== false,
  })
}

export function useUpdateIrlSchedule() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (season) => api.updateIrlSchedule(season),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: queryKeys.irlSchedule.all })
    },
  })
}
