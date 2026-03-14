import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import * as api from '../api/irlFranchises'
import { queryKeys } from './queryKeys'

export function useIrlFranchiseList(params = {}) {
  return useQuery({
    queryKey: queryKeys.irlFranchises.list(params),
    queryFn: () => api.listIrlFranchises(params),
  })
}

export function useIrlFranchise(id, options = {}) {
  return useQuery({
    queryKey: queryKeys.irlFranchises.detail(id),
    queryFn: () => api.getIrlFranchise(id),
    enabled: id != null && options.enabled !== false,
  })
}

export function useCreateIrlFranchise() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (body) => api.createIrlFranchise(body),
    onSuccess: () =>
      qc.invalidateQueries({ queryKey: queryKeys.irlFranchises.all }),
  })
}

export function useUpdateIrlFranchise() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: ({ id, ...body }) => api.updateIrlFranchise(id, body),
    onSuccess: (_, { id }) => {
      qc.invalidateQueries({ queryKey: queryKeys.irlFranchises.all })
      qc.invalidateQueries({ queryKey: queryKeys.irlFranchises.detail(id) })
    },
  })
}

export function useDeleteIrlFranchise() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (id) => api.deleteIrlFranchise(id),
    onSuccess: () =>
      qc.invalidateQueries({ queryKey: queryKeys.irlFranchises.all }),
  })
}
