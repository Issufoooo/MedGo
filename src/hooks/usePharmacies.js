import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { useAuthStore } from '../store/authStore'
import {
  getPharmacies,
  getPharmacy,
  createPharmacy,
  updatePharmacy,
  togglePharmacyStatus,
} from '../services/pharmacyService'

export function usePharmacies({ includeInactive = false } = {}) {
  return useQuery({
    queryKey: ['pharmacies', includeInactive],
    queryFn: () => getPharmacies({ includeInactive }),
    staleTime: 60_000,
  })
}

export function usePharmacy(id) {
  return useQuery({
    queryKey: ['pharmacy', id],
    queryFn: () => getPharmacy(id),
    enabled: !!id,
  })
}

export function useCreatePharmacy() {
  const qc = useQueryClient()
  const { profile } = useAuthStore()
  return useMutation({
    mutationFn: (payload) => createPharmacy(payload, profile?.id, profile?.role),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['pharmacies'] }),
  })
}

export function useUpdatePharmacy() {
  const qc = useQueryClient()
  const { profile } = useAuthStore()
  return useMutation({
    mutationFn: ({ id, payload }) => updatePharmacy(id, payload, profile?.id, profile?.role),
    onSuccess: (_, { id }) => {
      qc.invalidateQueries({ queryKey: ['pharmacies'] })
      qc.invalidateQueries({ queryKey: ['pharmacy', id] })
    },
  })
}

export function useTogglePharmacy() {
  const qc = useQueryClient()
  const { profile } = useAuthStore()
  return useMutation({
    mutationFn: ({ id, isActive }) => togglePharmacyStatus(id, isActive, profile?.id, profile?.role),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['pharmacies'] }),
  })
}
