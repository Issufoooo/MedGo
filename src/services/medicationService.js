import { supabase } from '../lib/supabase'

export async function getMedications({ search = '', category = '' } = {}) {
  let q = supabase
    .from('medications')
    .select('*')
    .is('deleted_at', null)   // exclude soft-deleted
    .order('commercial_name')

  if (search) {
    q = q.or(`commercial_name.ilike.%${search}%,generic_name.ilike.%${search}%`)
  }
  if (category) {
    q = q.eq('category', category)
  }

  const { data, error } = await q
  if (error) throw error
  return data || []
}

export async function createMedication(payload) {
  const { data, error } = await supabase
    .from('medications')
    .insert(payload)
    .select()
    .single()
  if (error) throw error
  return data
}

export async function updateMedication(id, payload) {
  const { data, error } = await supabase
    .from('medications')
    .update(payload)
    .eq('id', id)
    .select()
    .single()
  if (error) throw error
  return data
}

export async function toggleMedicationVisibility(id, isVisible) {
  return updateMedication(id, { is_visible: isVisible })
}

export async function deleteMedication(id) {
  // Soft delete — preserves FK integrity with orders
  const { error } = await supabase
    .from('medications')
    .update({ deleted_at: new Date().toISOString(), is_visible: false })
    .eq('id', id)
  if (error) throw error
}

export async function getMedicationCategories() {
  return ['FREE', 'PRESCRIPTION', 'RESTRICTED_MONITORED']
}
