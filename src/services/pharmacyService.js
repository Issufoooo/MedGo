import { supabase } from '../lib/supabase'
import { auditLog } from './auditService'

// ─────────────────────────────────────────────────────────────
// MedGo — Pharmacy Service
// ─────────────────────────────────────────────────────────────

/**
 * Get all pharmacies. Optionally include inactive ones.
 */
export async function getPharmacies({ includeInactive = false } = {}) {
  let q = supabase
    .from('pharmacies')
    .select(`
      id, name, address, contact_phone, contact_email,
      whatsapp_number, notes, is_active, created_at
    `)
    .order('name', { ascending: true })

  if (!includeInactive) {
    q = q.eq('is_active', true)
  }

  const { data, error } = await q
  if (error) throw error
  return data || []
}

/**
 * Get a single pharmacy by ID.
 */
export async function getPharmacy(id) {
  const { data, error } = await supabase
    .from('pharmacies')
    .select(`
      id, name, address, contact_phone, contact_email,
      whatsapp_number, notes, is_active, created_at
    `)
    .eq('id', id)
    .single()

  if (error) throw error
  return data
}

/**
 * Create a new pharmacy.
 */
export async function createPharmacy(payload, actorId, actorRole) {
  const { data, error } = await supabase
    .from('pharmacies')
    .insert({
      name:            payload.name,
      address:         payload.address || null,
      contact_phone:   payload.contact_phone || null,
      contact_email:   payload.contact_email || null,
      whatsapp_number: payload.whatsapp_number || null,
      notes:           payload.notes || null,
      is_active:       payload.is_active ?? true,
    })
    .select()
    .single()

  if (error) throw error

  await auditLog({
    actorId,
    actorRole,
    action: 'PHARMACY_CREATED',
    entityType: 'pharmacy',
    entityId: data.id,
    metadata: { name: payload.name },
  })

  return data
}

/**
 * Update an existing pharmacy.
 */
export async function updatePharmacy(id, payload, actorId, actorRole) {
  const { data, error } = await supabase
    .from('pharmacies')
    .update({
      name:            payload.name,
      address:         payload.address || null,
      contact_phone:   payload.contact_phone || null,
      contact_email:   payload.contact_email || null,
      whatsapp_number: payload.whatsapp_number || null,
      notes:           payload.notes || null,
      updated_at:      new Date().toISOString(),
    })
    .eq('id', id)
    .select()
    .single()

  if (error) throw error

  await auditLog({
    actorId,
    actorRole,
    action: 'PHARMACY_UPDATED',
    entityType: 'pharmacy',
    entityId: id,
    metadata: { name: payload.name },
  })

  return data
}

/**
 * Toggle active/inactive status.
 */
export async function togglePharmacyStatus(id, isActive, actorId, actorRole) {
  const { data, error } = await supabase
    .from('pharmacies')
    .update({ is_active: isActive, updated_at: new Date().toISOString() })
    .eq('id', id)
    .select('id, name, is_active')
    .single()

  if (error) throw error

  await auditLog({
    actorId,
    actorRole,
    action: isActive ? 'PHARMACY_ACTIVATED' : 'PHARMACY_DEACTIVATED',
    entityType: 'pharmacy',
    entityId: id,
    metadata: { name: data.name },
  })

  return data
}

/**
 * Get count of orders per pharmacy (for dashboard display).
 */
export async function getPharmacyOrderCounts() {
  const { data, error } = await supabase
    .from('orders')
    .select('pharmacy_id')
    .not('pharmacy_id', 'is', null)
    .not('status', 'in', '("CANCELLED")')

  if (error) return {}

  return (data || []).reduce((acc, row) => {
    if (row.pharmacy_id) acc[row.pharmacy_id] = (acc[row.pharmacy_id] || 0) + 1
    return acc
  }, {})
}
