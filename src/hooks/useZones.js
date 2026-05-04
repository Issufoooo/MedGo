import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { getZones, getZonesWithOrderCounts, createZone, updateZone, toggleZoneStatus, deleteZone } from '../services/zoneService'

// ── Cache keys ─────────────────────────────────────────────────
// 'zones'        → base list (min_km/max_km/color) used by maps and OrderPage
// 'zones-detail' → enriched with order_count, used by ZonesPage table
// Mutations invalidate both.

export function useZonesWithDistance() {
  return useQuery({
    queryKey: ['zones'],
    queryFn: getZones,
    staleTime: 60_000,
  })
}

export function useZones() {
  return useQuery({
    queryKey: ['zones-detail'],
    queryFn: getZonesWithOrderCounts,
    staleTime: 30_000,
  })
}

function invalidateAll(qc) {
  qc.invalidateQueries({ queryKey: ['zones'] })
  qc.invalidateQueries({ queryKey: ['zones-detail'] })
}

export function useCreateZone() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: createZone,
    onSuccess: () => invalidateAll(qc),
  })
}

export function useUpdateZone() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: ({ id, ...payload }) => updateZone(id, payload),
    onSuccess: () => invalidateAll(qc),
  })
}

export function useToggleZone() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: ({ id, isActive }) => toggleZoneStatus(id, isActive),
    onSuccess: () => invalidateAll(qc),
  })
}

export function useDeleteZone() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: deleteZone,
    onSuccess: () => invalidateAll(qc),
  })
}
