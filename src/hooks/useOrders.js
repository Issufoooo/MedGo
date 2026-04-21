import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { useEffect } from 'react'
import { supabase } from '../lib/supabase'
import { getOrdersForOperator, getOrderDetail, updateOrderStatus } from '../services/orderService'

/**
 * Live orders list for operator dashboard.
 * Subscribes to Supabase Realtime for instant updates.
 */
export function useOrders({ statusFilter = 'ALL', search = '' } = {}) {
  const qc = useQueryClient()

  const query = useQuery({
    queryKey: ['orders', statusFilter, search],
    queryFn: () => getOrdersForOperator({ statusFilter, search }),
    refetchInterval: 20_000,
  })

  // Realtime subscription — invalidate on any orders change
  useEffect(() => {
    const channel = supabase
      .channel('orders-realtime')
      .on('postgres_changes', {
        event: '*',
        schema: 'public',
        table: 'orders',
      }, () => {
        qc.invalidateQueries({ queryKey: ['orders'] })
      })
      .subscribe()

    return () => { supabase.removeChannel(channel) }
  }, [qc])

  return query
}

/**
 * Single order detail — used in the order detail page.
 */
export function useOrderDetail(orderId) {
  return useQuery({
    queryKey: ['order', orderId],
    queryFn: () => getOrderDetail(orderId),
    enabled: !!orderId,
    staleTime: 10_000,
  })
}

/**
 * Mutation: update order status.
 * Auto-invalidates order lists and detail cache.
 */
export function useUpdateStatus() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: updateOrderStatus,
    onSuccess: (_data, variables) => {
      qc.invalidateQueries({ queryKey: ['orders'] })
      qc.invalidateQueries({ queryKey: ['order', variables.orderId] })
    },
  })
}

/**
 * Count of orders by status — used for dashboard badges.
 */
export function useOrderCounts() {
  return useQuery({
    queryKey: ['order-counts'],
    queryFn: async () => {
      const { data } = await supabase
        .from('orders')
        .select('status')
        .not('status', 'in', '("DELIVERED","CANCELLED")')
      if (!data) return {}
      return data.reduce((acc, row) => {
        acc[row.status] = (acc[row.status] || 0) + 1
        acc._total = (acc._total || 0) + 1
        return acc
      }, {})
    },
    refetchInterval: 15_000,
  })
}
