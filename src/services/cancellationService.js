import { supabase } from '../lib/supabase'
import { auditLog } from './auditService'
import { updateOrderStatus } from './orderService'

/**
 * Operator requests cancellation.
 * If order is in an early state → direct cancel.
 * If order is confirmed/dispatched → needs owner approval.
 */
export async function requestCancellation({ orderId, requestedBy, reason }) {
  const { data: order } = await supabase
    .from('orders')
    .select('status')
    .eq('id', orderId)
    .single()

  if (!order) throw new Error('Pedido não encontrado.')

  const earlyStates = ['NEW','PRESCRIPTION_PENDING','IN_VALIDATION','AWAITING_PHARMACY','AWAITING_CLIENT']
  const needsApproval = !earlyStates.includes(order.status)

  if (!needsApproval) {
    // Direct cancellation — no approval needed
    await updateOrderStatus({
      orderId,
      newStatus: 'CANCELLED',
      actorId: requestedBy,
      actorRole: 'operator',
      notes: reason,
      extraFields: { cancellation_reason: reason, cancelled_by: requestedBy },
    })
    return { immediate: true }
  }

  // Create approval request
  const { data, error } = await supabase
    .from('cancellation_requests')
    .insert({ order_id: orderId, requested_by: requestedBy, reason })
    .select()
    .single()

  if (error) throw new Error('Erro ao criar pedido de cancelamento: ' + error.message)

  await auditLog({
    actorId: requestedBy,
    actorRole: 'operator',
    action: 'CANCELLATION_REQUESTED',
    entityType: 'order',
    entityId: orderId,
    metadata: { reason, requestId: data.id },
  })

  return { immediate: false, requestId: data.id }
}

/**
 * Owner approves or rejects a cancellation request.
 */
export async function reviewCancellationRequest({ requestId, reviewedBy, decision, reviewNotes }) {
  const { data: req } = await supabase
    .from('cancellation_requests')
    .select('*, order:orders(status)')
    .eq('id', requestId)
    .single()

  if (!req) throw new Error('Pedido de cancelamento não encontrado.')
  if (req.status !== 'PENDING') throw new Error('Este pedido já foi analisado.')

  await supabase.from('cancellation_requests').update({
    status: decision,
    reviewed_by: reviewedBy,
    reviewed_at: new Date().toISOString(),
    review_notes: reviewNotes,
  }).eq('id', requestId)

  if (decision === 'APPROVED') {
    await updateOrderStatus({
      orderId: req.order_id,
      newStatus: 'CANCELLED',
      actorId: reviewedBy,
      actorRole: 'owner',
      notes: `Cancelamento aprovado. ${req.reason}`,
      extraFields: { cancellation_reason: req.reason, cancelled_by: reviewedBy },
    })
  }

  await auditLog({
    actorId: reviewedBy,
    actorRole: 'owner',
    action: `CANCELLATION_${decision}`,
    entityType: 'order',
    entityId: req.order_id,
    metadata: { requestId, decision, reviewNotes },
  })
}

/**
 * Get pending cancellation requests — for owner.
 */
export async function getPendingCancellations() {
  const { data, error } = await supabase
    .from('cancellation_requests')
    .select(`
      *, 
      order:orders(id, status, medication_name_snapshot),
      requested_by_profile:profiles!cancellation_requests_requested_by_fkey(full_name)
    `)
    .eq('status', 'PENDING')
    .order('created_at', { ascending: false })

  if (error) throw error
  return data || []
}
