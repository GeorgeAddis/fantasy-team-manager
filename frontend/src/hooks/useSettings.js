import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import * as settingsApi from '../api/settings'
import { queryKeys } from './queryKeys'

export function useSettings() {
  return useQuery({
    queryKey: queryKeys.settings.all,
    queryFn: () => settingsApi.getSettings(),
  })
}

export function useUpdateSetting() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: ({ key, value }) => settingsApi.updateSetting(key, value),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: queryKeys.settings.all })
    },
  })
}
