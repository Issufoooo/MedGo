import { supabase } from '../lib/supabase'
import { checkBlacklist } from './blacklistService'

/**
 * Upsert a customer by WhatsApp number.
 * If customer exists, updates name and address.
 * Returns { customer, blacklistResult }
 */
export async function upsertCustomer({ fullName, whatsappNumber, addressNotes = null, zoneId = null }) {
  // Normalize WhatsApp number: remove spaces, dashes
  const normalizedPhone = whatsappNumber.replace(/[\s\-()]/g, '')

  const { data: customer, error } = await supabase
    .from('customers')
    .upsert(
      {
        full_name: fullName,
        whatsapp_number: normalizedPhone,
        address_notes: addressNotes,
        zone_id: zoneId,
        last_order_at: new Date().toISOString(),
      },
      { onConflict: 'whatsapp_number', ignoreDuplicates: false }
    )
    .select()
    .single()

  if (error) throw new Error('Erro ao criar cliente: ' + error.message)

  // Check blacklist (for operator alert — does not block order)
  const blacklistResult = await checkBlacklist(normalizedPhone)

  return { customer, blacklistResult }
}

/**
 * Get customer order history by WhatsApp number.
 */
export async function getCustomerByWhatsApp(whatsappNumber) {
  const { data, error } = await supabase
    .from('customers')
    .select('*, orders(id, status, medication_name_snapshot, created_at, total_price)')
    .eq('whatsapp_number', whatsappNumber)
    .order('created_at', { foreignTable: 'orders', ascending: false })
    .single()

  if (error) return null
  return data
}

/**
 * Get paginated customer list for operator/owner view.
 */
export async function getCustomers({ page = 1, pageSize = 20, search = '' } = {}) {
  let query = supabase
    .from('customers')
    .select(
      '*, zone:delivery_zones(name), orders(count)',
      { count: 'exact' }
    )
    .order('last_order_at', { ascending: false, nullsFirst: false })
    .range((page - 1) * pageSize, page * pageSize - 1)

  if (search) {
    query = query.or(
      `full_name.ilike.%${search}%,whatsapp_number.ilike.%${search}%`
    )
  }

  const { data, error, count } = await query
  if (error) throw error

  return { customers: data || [], total: count || 0 }
}
