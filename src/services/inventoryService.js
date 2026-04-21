import { supabase } from '../lib/supabase'
import { auditLog } from './auditService'
import { LOW_STOCK_THRESHOLD } from '../lib/constants'

// ─────────────────────────────────────────────────────────────
// MedGo — Inventory Service
// Stock manager CRUD + operator lookup
// ─────────────────────────────────────────────────────────────

/**
 * Get full inventory overview for all pharmacies.
 * Stock manager sees everything; can filter by pharmacy.
 */
export async function getInventoryOverview({ pharmacyId, search, statusFilter } = {}) {
  let q = supabase
    .from('inventory_overview')
    .select('*')
    .order('pharmacy_name')
    .order('medication_name')

  if (pharmacyId) q = q.eq('pharmacy_id', pharmacyId)
  if (statusFilter && statusFilter !== 'ALL') q = q.eq('status', statusFilter)
  if (search) {
    q = q.or(`medication_name.ilike.%${search}%,generic_name.ilike.%${search}%,pharmacy_name.ilike.%${search}%`)
  }

  const { data, error } = await q
  if (error) throw error
  return data || []
}

/**
 * Get inventory for a single pharmacy.
 */
export async function getPharmacyInventory(pharmacyId) {
  const { data, error } = await supabase
    .from('inventory_overview')
    .select('*')
    .eq('pharmacy_id', pharmacyId)
    .order('status', { ascending: true }) // OUT_OF_STOCK first
    .order('medication_name')

  if (error) throw error
  return data || []
}

/**
 * Check if a specific medication is available at any pharmacy.
 * Used by operator during order confirmation.
 */
export async function checkMedicationAvailability(medicationId) {
  const { data, error } = await supabase
    .from('inventory_overview')
    .select('pharmacy_id, pharmacy_name, pharmacy_address, quantity, unit_price, status')
    .eq('medication_id', medicationId)
    .neq('status', 'OUT_OF_STOCK')
    .order('quantity', { ascending: false })

  if (error) throw error
  return data || []
}

/**
 * Upsert a single inventory record (add or update medication stock at a pharmacy).
 */
export async function upsertInventoryItem({ pharmacyId, medicationId, quantity, unitPrice, notes, actorId }) {
  // Get current state for movement log
  const { data: existing } = await supabase
    .from('pharmacy_inventory')
    .select('id, quantity')
    .eq('pharmacy_id', pharmacyId)
    .eq('medication_id', medicationId)
    .maybeSingle()

  const quantityBefore = existing?.quantity ?? 0
  const quantityChange = quantity - quantityBefore

  // Upsert inventory record
  const { data, error } = await supabase
    .from('pharmacy_inventory')
    .upsert({
      pharmacy_id:     pharmacyId,
      medication_id:   medicationId,
      quantity:        quantity,
      unit_price:      unitPrice ?? null,
      notes:           notes ?? null,
      last_updated_by: actorId,
      last_synced_at:  new Date().toISOString(),
    }, { onConflict: 'pharmacy_id,medication_id' })
    .select()
    .single()

  if (error) throw error

  // Record movement
  await supabase.from('inventory_movements').insert({
    inventory_id:    data.id,
    pharmacy_id:     pharmacyId,
    medication_id:   medicationId,
    movement_type:   'SYNC',
    quantity_before: quantityBefore,
    quantity_change: quantityChange,
    quantity_after:  quantity,
    notes:           notes || 'Sincronização manual',
    performed_by:    actorId,
  })

  return data
}

/**
 * Bulk sync — update multiple medications for a pharmacy at once.
 * Used when importing from a pharmacy's stock sheet.
 */
export async function bulkSyncPharmacyInventory({ pharmacyId, items, actorId }) {
  const results = []
  const errors  = []

  for (const item of items) {
    try {
      const result = await upsertInventoryItem({
        pharmacyId,
        medicationId: item.medication_id,
        quantity:     item.quantity,
        unitPrice:    item.unit_price,
        notes:        item.notes,
        actorId,
      })
      results.push(result)
    } catch (err) {
      errors.push({ item, error: err.message })
    }
  }

  await auditLog({
    actorId,
    actorRole: 'stock_manager',
    action: 'INVENTORY_BULK_SYNC',
    entityType: 'pharmacy',
    entityId: pharmacyId,
    metadata: { synced: results.length, errors: errors.length },
  })

  return { results, errors }
}

/**
 * Manual adjustment — add or subtract units with a reason.
 */
export async function adjustInventory({ inventoryId, adjustmentQty, reason, actorId }) {
  // Get current record
  const { data: current, error: fetchErr } = await supabase
    .from('pharmacy_inventory')
    .select('id, pharmacy_id, medication_id, quantity')
    .eq('id', inventoryId)
    .single()

  if (fetchErr || !current) throw new Error('Registo de inventário não encontrado.')

  const newQty = Math.max(0, current.quantity + adjustmentQty)

  const { data, error } = await supabase
    .from('pharmacy_inventory')
    .update({
      quantity:        newQty,
      last_updated_by: actorId,
      updated_at:      new Date().toISOString(),
    })
    .eq('id', inventoryId)
    .select()
    .single()

  if (error) throw error

  // Record movement
  await supabase.from('inventory_movements').insert({
    inventory_id:    inventoryId,
    pharmacy_id:     current.pharmacy_id,
    medication_id:   current.medication_id,
    movement_type:   'ADJUSTMENT',
    quantity_before: current.quantity,
    quantity_change: adjustmentQty,
    quantity_after:  newQty,
    notes:           reason || 'Ajuste manual',
    performed_by:    actorId,
  })

  return data
}

/**
 * Get recent movements for a pharmacy (audit trail).
 */
export async function getInventoryMovements(pharmacyId, limit = 50) {
  const { data, error } = await supabase
    .from('inventory_movements')
    .select(`
      *,
      medication:medications(commercial_name, dosage),
      performed_by_profile:profiles!inventory_movements_performed_by_fkey(full_name)
    `)
    .eq('pharmacy_id', pharmacyId)
    .order('created_at', { ascending: false })
    .limit(limit)

  if (error) throw error
  return data || []
}

/**
 * Get stock summary stats across all pharmacies.
 */
export async function getStockSummaryStats() {
  const { data, error } = await supabase
    .from('pharmacy_inventory')
    .select('status, pharmacy_id')

  if (error) throw error

  const items = data || []
  return {
    total:       items.length,
    in_stock:    items.filter(i => i.status === 'IN_STOCK').length,
    low_stock:   items.filter(i => i.status === 'LOW_STOCK').length,
    out_of_stock:items.filter(i => i.status === 'OUT_OF_STOCK').length,
    pharmacies:  new Set(items.map(i => i.pharmacy_id)).size,
  }
}

/**
 * Delete an inventory item (remove medication from pharmacy).
 */
export async function removeInventoryItem(inventoryId, actorId) {
  const { error } = await supabase
    .from('pharmacy_inventory')
    .delete()
    .eq('id', inventoryId)

  if (error) throw error

  await auditLog({
    actorId,
    actorRole: 'stock_manager',
    action: 'INVENTORY_ITEM_REMOVED',
    entityType: 'pharmacy_inventory',
    entityId: inventoryId,
  })
}
