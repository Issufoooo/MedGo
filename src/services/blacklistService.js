import { supabase } from '../lib/supabase'
import { auditLog } from './auditService'

/**
 * Check if a WhatsApp number is on the active blacklist.
 * Returns { isBlacklisted, entry } — does NOT block orders automatically.
 * The operator sees the alert and decides.
 */
export async function checkBlacklist(whatsappNumber) {
  const { data, error } = await supabase
    .from('blacklist')
    .select('*')
    .eq('whatsapp_number', whatsappNumber)
    .eq('is_active', true)
    .limit(1)

  if (error) {
    console.warn('[Blacklist] Check failed:', error.message)
    return { isBlacklisted: false }
  }

  if (data && data.length > 0) {
    return { isBlacklisted: true, entry: data[0] }
  }

  return { isBlacklisted: false }
}

/**
 * Add a customer to the blacklist.
 */
export async function addToBlacklist({
  customerId = null,
  whatsappNumber,
  severity,
  reason,
  notes = null,
  addedBy,
  addedByRole,
}) {
  const { data, error } = await supabase
    .from('blacklist')
    .insert({
      customer_id: customerId,
      whatsapp_number: whatsappNumber,
      severity,
      reason,
      notes,
      added_by: addedBy,
    })
    .select()
    .single()

  if (error) throw new Error('Erro ao adicionar à lista negra: ' + error.message)

  // Also flag the customer record if we have one
  if (customerId) {
    await supabase
      .from('customers')
      .update({ is_blacklisted: true })
      .eq('id', customerId)
  }

  await auditLog({
    actorId: addedBy,
    actorRole: addedByRole,
    action: 'BLACKLIST_ADDED',
    entityType: 'blacklist',
    entityId: data.id,
    metadata: { whatsappNumber, severity, reason },
  })

  return data
}

/**
 * Deactivate a blacklist entry (soft remove).
 */
export async function removeFromBlacklist({ blacklistId, removedBy, removedByRole }) {
  const { error } = await supabase
    .from('blacklist')
    .update({ is_active: false, updated_at: new Date().toISOString() })
    .eq('id', blacklistId)

  if (error) throw new Error('Erro ao remover da lista negra: ' + error.message)

  await auditLog({
    actorId: removedBy,
    actorRole: removedByRole,
    action: 'BLACKLIST_REMOVED',
    entityType: 'blacklist',
    entityId: blacklistId,
  })
}

/**
 * Get all active blacklist entries (operator/owner only).
 */
export async function getBlacklist() {
  const { data, error } = await supabase
    .from('blacklist')
    .select('*, customer:customers(full_name, whatsapp_number)')
    .eq('is_active', true)
    .order('created_at', { ascending: false })

  if (error) throw error
  return data || []
}
