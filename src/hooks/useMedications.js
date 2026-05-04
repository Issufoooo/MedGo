import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import {
  getMedications,
  createMedication,
  updateMedication,
  toggleMedicationVisibility,
  deleteMedication,
} from '../services/medicationService'

export function useMedications({ search = '', category = '' } = {}) {
  return useQuery({
    queryKey: ['medications', search, category],
    queryFn: () => getMedications({ search, category }),
    staleTime: 30_000,
  })
}

export function useCreateMedication() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: createMedication,
    onSuccess: () => qc.invalidateQueries({ queryKey: ['medications'] }),
  })
}

export function useUpdateMedication() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: ({ id, ...payload }) => updateMedication(id, payload),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['medications'] }),
  })
}

export function useToggleMedicationVisibility() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: ({ id, isVisible }) => toggleMedicationVisibility(id, isVisible),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['medications'] }),
  })
}

export function useDeleteMedication() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: deleteMedication,
    onSuccess: () => qc.invalidateQueries({ queryKey: ['medications'] }),
  })
}
