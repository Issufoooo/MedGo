import { supabase } from '../lib/supabase'

export async function getZones() {
  const { data, error } = await supabase
    .from('delivery_zones')
    .select('*')
    .order('min_km', { ascending: true })
  if (error) throw error
  return data || []
}

export async function getZonesWithOrderCounts() {
  const { data, error } = await supabase
    .from('delivery_zones')
    .select('*, orders(count)')
    .order('min_km', { ascending: true })
  if (error) throw error
  return (data || []).map(z => ({
    ...z,
    order_count: z.orders?.[0]?.count ?? 0,
  }))
}

export async function createZone(payload) {
  const { data, error } = await supabase
    .from('delivery_zones')
    .insert(payload)
    .select()
    .single()
  if (error) throw error
  return data
}

export async function updateZone(id, payload) {
  const { data, error } = await supabase
    .from('delivery_zones')
    .update(payload)
    .eq('id', id)
    .select()
    .single()
  if (error) throw error
  return data
}

export async function toggleZoneStatus(id, isActive) {
  return updateZone(id, { is_active: isActive })
}

export async function deleteZone(id) {
  const { error } = await supabase
    .from('delivery_zones')
    .delete()
    .eq('id', id)
  if (error) throw error
}
