import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { useAuthStore } from '../store/authStore'
import {
  getInventoryOverview,
  getPharmacyInventory,
  checkMedicationAvailability,
  upsertInventoryItem,
  bulkSyncPharmacyInventory,
  adjustInventory,
  getInventoryMovements,
  getStockSummaryStats,
  removeInventoryItem,
} from '../services/inventoryService'

export function useInventoryOverview({ pharmacyId, search, statusFilter } = {}) {
  return useQuery({
    queryKey: ['inventory', pharmacyId, search, statusFilter],
    queryFn: () => getInventoryOverview({ pharmacyId, search, statusFilter }),
    staleTime: 30_000,
    refetchInterval: 60_000,
  })
}

export function usePharmacyInventory(pharmacyId) {
  return useQuery({
    queryKey: ['pharmacy-inventory', pharmacyId],
    queryFn: () => getPharmacyInventory(pharmacyId),
    enabled: !!pharmacyId,
    staleTime: 30_000,
  })
}

export function useMedicationAvailability(medicationId) {
  return useQuery({
    queryKey: ['med-availability', medicationId],
    queryFn: () => checkMedicationAvailability(medicationId),
    enabled: !!medicationId,
    staleTime: 60_000,
  })
}

export function useStockSummary() {
  return useQuery({
    queryKey: ['stock-summary'],
    queryFn: getStockSummaryStats,
    refetchInterval: 60_000,
    staleTime: 30_000,
  })
}

export function useInventoryMovements(pharmacyId) {
  return useQuery({
    queryKey: ['inventory-movements', pharmacyId],
    queryFn: () => getInventoryMovements(pharmacyId),
    enabled: !!pharmacyId,
    staleTime: 30_000,
  })
}

export function useUpsertInventoryItem() {
  const qc = useQueryClient()
  const { profile } = useAuthStore()
  return useMutation({
    mutationFn: (payload) => upsertInventoryItem({ ...payload, actorId: profile?.id }),
    onSuccess: (_, variables) => {
      qc.invalidateQueries({ queryKey: ['inventory'] })
      qc.invalidateQueries({ queryKey: ['pharmacy-inventory', variables.pharmacyId] })
      qc.invalidateQueries({ queryKey: ['stock-summary'] })
    },
  })
}

export function useBulkSync() {
  const qc = useQueryClient()
  const { profile } = useAuthStore()
  return useMutation({
    mutationFn: ({ pharmacyId, items }) =>
      bulkSyncPharmacyInventory({ pharmacyId, items, actorId: profile?.id }),
    onSuccess: (_, { pharmacyId }) => {
      qc.invalidateQueries({ queryKey: ['inventory'] })
      qc.invalidateQueries({ queryKey: ['pharmacy-inventory', pharmacyId] })
      qc.invalidateQueries({ queryKey: ['stock-summary'] })
    },
  })
}

export function useAdjustInventory() {
  const qc = useQueryClient()
  const { profile } = useAuthStore()
  return useMutation({
    mutationFn: (payload) => adjustInventory({ ...payload, actorId: profile?.id }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['inventory'] })
      qc.invalidateQueries({ queryKey: ['stock-summary'] })
    },
  })
}

export function useRemoveInventoryItem() {
  const qc = useQueryClient()
  const { profile } = useAuthStore()
  return useMutation({
    mutationFn: (inventoryId) => removeInventoryItem(inventoryId, profile?.id),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['inventory'] })
      qc.invalidateQueries({ queryKey: ['stock-summary'] })
    },
  })
}
