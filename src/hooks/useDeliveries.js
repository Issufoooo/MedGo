import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { supabase } from '../lib/supabase'
import { useAuthStore } from '../store/authStore'
import { updateOrderStatus } from '../services/orderService'
import { auditLog } from '../services/auditService'

/**
 * Motoboy's assigned deliveries — current session only.
 */
export function useMyDeliveries() {
  const { profile } = useAuthStore()
  return useQuery({
    queryKey: ['motoboy-deliveries', profile?.id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('orders')
        .select(`
          id, tracking_token, status, medication_name_snapshot,
          delivery_address, payment_method, total_price, delivery_fee,
          dispatched_at,
          customer:customers(full_name, whatsapp_number)
        `)
        .eq('assigned_motoboy_id', profile.id)
        .in('status', ['IN_PREPARATION', 'IN_DELIVERY'])
        .order('updated_at', { ascending: false })
      if (error) throw error
      return data || []
    },
    enabled: !!profile?.id,
    refetchInterval: 20_000,
  })
}

/**
 * Motoboy's delivery history — completed deliveries.
 */
export function useDeliveryHistory() {
  const { profile } = useAuthStore()
  return useQuery({
    queryKey: ['motoboy-history', profile?.id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('orders')
        .select(`
          id, status, medication_name_snapshot, delivery_address,
          total_price, delivered_at,
          customer:customers(full_name, whatsapp_number)
        `)
        .eq('assigned_motoboy_id', profile.id)
        .eq('status', 'DELIVERED')
        .order('delivered_at', { ascending: false })
        .limit(30)
      if (error) throw error
      return data || []
    },
    enabled: !!profile?.id,
  })
}

/**
 * Mutation: motoboy confirms pickup (IN_PREPARATION → IN_DELIVERY)
 */
export function useConfirmPickup() {
  const qc = useQueryClient()
  const { profile } = useAuthStore()
  return useMutation({
    mutationFn: async (orderId) => {
      return updateOrderStatus({
        orderId,
        newStatus: 'IN_DELIVERY',
        actorId: profile.id,
        actorRole: 'motoboy',
        notes: 'Medicamento recolhido na farmácia',
      })
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['motoboy-deliveries'] }),
  })
}

/**
 * Mutation: motoboy confirms delivery (IN_DELIVERY → DELIVERED)
 */
export function useConfirmDelivery() {
  const qc = useQueryClient()
  const { profile } = useAuthStore()
  return useMutation({
    mutationFn: async ({ orderId, notes }) => {
      await supabase
        .from('motoboy_deliveries')
        .update({ delivered_at: new Date().toISOString(), delivery_notes: notes })
        .eq('order_id', orderId)
        .eq('motoboy_id', profile.id)

      return updateOrderStatus({
        orderId,
        newStatus: 'DELIVERED',
        actorId: profile.id,
        actorRole: 'motoboy',
        notes: notes || 'Entrega concluída',
      })
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['motoboy-deliveries'] })
      qc.invalidateQueries({ queryKey: ['motoboy-history'] })
    },
  })
}
