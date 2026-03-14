import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import * as api from '../api/lineupSlots'
import { queryKeys } from './queryKeys'

export function useLineupSlotList(params = {}) {
  return useQuery({
    queryKey: queryKeys.lineupSlots.list(params),
    queryFn: () => api.listLineupSlots(params),
  })
}

export function useLineupSlot(id, options = {}) {
  return useQuery({
    queryKey: queryKeys.lineupSlots.detail(id),
    queryFn: () => api.getLineupSlot(id),
    enabled: id != null && options.enabled !== false,
  })
}

export function useCreateLineupSlot() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (body) => api.createLineupSlot(body),
    onSuccess: () =>
      qc.invalidateQueries({ queryKey: queryKeys.lineupSlots.all }),
  })
}

export function useUpdateLineupSlot() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: ({ id, ...body }) => api.updateLineupSlot(id, body),
    onSuccess: (_, { id }) => {
      qc.invalidateQueries({ queryKey: queryKeys.lineupSlots.all })
      qc.invalidateQueries({ queryKey: queryKeys.lineupSlots.detail(id) })
    },
  })
}

export function useDeleteLineupSlot() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (id) => api.deleteLineupSlot(id),
    onSuccess: () =>
      qc.invalidateQueries({ queryKey: queryKeys.lineupSlots.all }),
  })
}
