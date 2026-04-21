import { supabase } from '../lib/supabase'
import { auditLog } from './auditService'
import { PRESCRIPTION_ALLOWED_TYPES, PRESCRIPTION_MAX_SIZE } from '../lib/constants'

const BUCKET = 'prescription-uploads'

/**
 * Validate a prescription file before upload.
 * Returns { valid, error }
 */
export function validatePrescriptionFile(file) {
  if (!file) return { valid: false, error: 'Nenhum ficheiro selecionado.' }

  if (!PRESCRIPTION_ALLOWED_TYPES.includes(file.type)) {
    return {
      valid: false,
      error: 'Tipo de ficheiro não suportado. Use JPG, PNG, WebP ou PDF.',
    }
  }

  if (file.size > PRESCRIPTION_MAX_SIZE) {
    return {
      valid: false,
      error: 'Ficheiro demasiado grande. Máximo 10MB.',
    }
  }

  return { valid: true }
}

/**
 * Upload a prescription file for an order.
 * Stores file reference in prescription_refs table.
 * Returns the storage path.
 */
export async function uploadPrescription(orderId, file) {
  const { valid, error: validError } = validatePrescriptionFile(file)
  if (!valid) throw new Error(validError)

  const timestamp = Date.now()
  const ext = file.name.split('.').pop().toLowerCase()
  const path = `orders/${orderId}/${timestamp}.${ext}`

  // Upload file to storage
  const { error: uploadError } = await supabase.storage
    .from(BUCKET)
    .upload(path, file, {
      upsert: false,
      contentType: file.type,
    })

  if (uploadError) throw new Error('Erro ao enviar receita: ' + uploadError.message)

  // Record reference in DB (upsert in case of re-upload)
  const expiresAt = new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString()

  const { error: refError } = await supabase
    .from('prescription_refs')
    .upsert(
      {
        order_id: orderId,
        storage_path: path,
        file_type: file.type,
        original_name: file.name,
        status: 'PENDING',
        expires_at: expiresAt,
        deleted_at: null,
      },
      { onConflict: 'order_id' }
    )

  if (refError) {
    // Clean up orphaned file
    await supabase.storage.from(BUCKET).remove([path])
    throw new Error('Erro ao registar receita: ' + refError.message)
  }

  return path
}

/**
 * Get a signed (time-limited) URL for an operator to view a prescription.
 * URL expires in 30 minutes.
 */
export async function getPrescriptionSignedUrl(orderId) {
  const { data: ref, error } = await supabase
    .from('prescription_refs')
    .select('storage_path, status, deleted_at')
    .eq('order_id', orderId)
    .single()

  if (error || !ref) return null
  if (ref.deleted_at) return null // File already deleted

  const { data, error: urlError } = await supabase.storage
    .from(BUCKET)
    .createSignedUrl(ref.storage_path, 1800) // 30 minutes

  if (urlError) return null
  return data?.signedUrl
}

/**
 * Approve a prescription.
 * Records the decision and triggers file cleanup.
 */
export async function approvePrescription({ orderId, reviewedBy, reviewedByRole }) {
  const { error } = await supabase
    .from('prescription_refs')
    .update({
      status: 'APPROVED',
      reviewed_by: reviewedBy,
      reviewed_at: new Date().toISOString(),
    })
    .eq('order_id', orderId)

  if (error) throw error

  await auditLog({
    actorId: reviewedBy,
    actorRole: reviewedByRole,
    action: 'PRESCRIPTION_APPROVED',
    entityType: 'order',
    entityId: orderId,
  })

  // Schedule deletion (Edge Function handles this on its cron cycle)
}

/**
 * Reject a prescription with a reason.
 */
export async function rejectPrescription({
  orderId,
  reviewedBy,
  reviewedByRole,
  rejectReason,
  status = 'REJECTED_UNREADABLE',
}) {
  const { error } = await supabase
    .from('prescription_refs')
    .update({
      status,
      reviewed_by: reviewedBy,
      reviewed_at: new Date().toISOString(),
      reject_reason: rejectReason,
    })
    .eq('order_id', orderId)

  if (error) throw error

  await auditLog({
    actorId: reviewedBy,
    actorRole: reviewedByRole,
    action: 'PRESCRIPTION_REJECTED',
    entityType: 'order',
    entityId: orderId,
    metadata: { status, rejectReason },
  })
}

/**
 * Immediately delete a prescription file from storage.
 * Used when an order is cancelled or after validation is complete.
 */
export async function deletePrescriptionFile(orderId, actorId = null) {
  const { data: ref } = await supabase
    .from('prescription_refs')
    .select('*')
    .eq('order_id', orderId)
    .single()

  if (!ref || ref.deleted_at) return // Already deleted

  await supabase.storage.from(BUCKET).remove([ref.storage_path])

  await supabase
    .from('prescription_refs')
    .update({ deleted_at: new Date().toISOString() })
    .eq('order_id', orderId)

  await auditLog({
    actorId,
    action: 'PRESCRIPTION_FILE_DELETED',
    entityType: 'prescription_ref',
    entityId: ref.id,
  })
}
