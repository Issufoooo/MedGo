import { useQuery } from '@tanstack/react-query'
import { getCustomers } from '../services/customerService'
import { supabase } from '../lib/supabase'

export function useCustomers({ page = 1, pageSize = 25, search = '' } = {}) {
  return useQuery({
    queryKey: ['customers', page, pageSize, search],
    queryFn: () => getCustomers({ page, pageSize, search }),
    staleTime: 30_000,
    keepPreviousData: true,
  })
}

export function useCustomerOrders(customerId) {
  return useQuery({
    queryKey: ['customerOrders', customerId],
    queryFn: async () => {
      if (!customerId) return []
      const { data, error } = await supabase
        .from('orders')
        .select('id, status, medication_name_snapshot, created_at, total_price, delivery_fee, zone:delivery_zones(name)')
        .eq('customer_id', customerId)
        .order('created_at', { ascending: false })
        .limit(50)
      if (error) throw error
      return data || []
    },
    enabled: !!customerId,
    staleTime: 30_000,
  })
}
