import { supabase } from '../lib/supabase'
import { auditLog } from './auditService'
import { checkBlacklist } from './blacklistService'
import { uploadPrescription } from './prescriptionService'
import { sendNotification, buildTrackingUrl } from './notificationService'
import {
  VALID_TRANSITIONS,
  ORDER_STATUS,
  REQUIRES_OWNER_APPROVAL,
} from '../lib/constants'

// ─────────────────────────────────────────────────────────────
// VALIDATION
// ─────────────────────────────────────────────────────────────

/**
 * Validates that a status transition is legal.
 * Throws with a descriptive error if not.
 */
export function assertValidTransition(fromStatus, toStatus) {
  const allowed = VALID_TRANSITIONS[fromStatus] || []
  if (!allowed.includes(toStatus)) {
    throw new Error(
      `Transição inválida: ${fromStatus} → ${toStatus}. ` +
      `Permitido: [${allowed.join(', ') || 'nenhum'}]`
    )
  }
}

// ─────────────────────────────────────────────────────────────
// CREATE ORDER
// ─────────────────────────────────────────────────────────────

export async function createOrder({
  customerData,
  medicationId,
  zoneId,
  deliveryAddress,
  paymentMethod,
  prescriptionFile,
  customerNotes,
}) {
  // 1. Normalise WhatsApp
  const whatsapp = customerData.whatsapp.replace(/[\s\-()]/g, '')

  // 2. Upsert customer
  const { data: customer, error: custErr } = await supabase
    .from('customers')
    .upsert(
      {
        full_name: customerData.fullName,
        whatsapp_number: whatsapp,
        address_notes: deliveryAddress,
        zone_id: zoneId,
        last_order_at: new Date().toISOString(),
      },
      { onConflict: 'whatsapp_number' }
    )
    .select()
    .single()

  if (custErr) throw new Error('Erro ao registar cliente: ' + custErr.message)

  // 3. Increment order count
  await supabase.rpc('increment_customer_order_count', { customer_id: customer.id })
    .catch(() => null) // non-fatal

  // 4. Blacklist check (informational — does not block order)
  const blacklistResult = await checkBlacklist(whatsapp)

  // 5. Load medication
  const { data: medication, error: medErr } = await supabase
    .from('medications')
    .select('id, commercial_name, requires_prescription, category, is_visible')
    .eq('id', medicationId)
    .eq('is_visible', true)
    .single()

  if (medErr || !medication) throw new Error('Medicamento não encontrado ou indisponível.')

  // 6. Load zone delivery fee
  const { data: zone } = await supabase
    .from('delivery_zones')
    .select('delivery_fee')
    .eq('id', zoneId)
    .single()

  // 7. Determine initial status
  const needsPrescription = medication.requires_prescription
  const initialStatus = needsPrescription
    ? ORDER_STATUS.PRESCRIPTION_PENDING
    : ORDER_STATUS.IN_VALIDATION

  // 8. Create order
  const { data: order, error: orderErr } = await supabase
    .from('orders')
    .insert({
      customer_id: customer.id,
      medication_id: medicationId,
      medication_name_snapshot: medication.commercial_name,
      zone_id: zoneId,
      delivery_address: deliveryAddress,
      delivery_fee: zone?.delivery_fee ?? null,
      payment_method: paymentMethod,
      status: initialStatus,
      customer_notes: customerNotes || null,
      prescription_status: needsPrescription ? 'PENDING' : null,
    })
    .select()
    .single()

  if (orderErr) throw new Error('Erro ao criar pedido: ' + orderErr.message)

  // 9. Insert initial status history
  await supabase.from('order_status_history').insert({
    order_id: order.id,
    from_status: null,
    to_status: initialStatus,
    notes: 'Pedido criado pelo cliente',
  })

  // 10. Upload prescription if provided
  if (prescriptionFile && needsPrescription) {
    await uploadPrescription(order.id, prescriptionFile)
  }

  // 11. Audit
  await auditLog({
    action: 'ORDER_CREATED',
    entityType: 'order',
    entityId: order.id,
    metadata: {
      medicationId,
      medicationName: medication.commercial_name,
      zoneId,
      needsPrescription,
      blacklisted: blacklistResult.isBlacklisted,
    },
  })

  // 12. Notify customer via WhatsApp
  const trackingUrl = await buildTrackingUrl(order.tracking_token)
  await sendNotification('order_created', { order, customer, trackingUrl })

  return {
    order,
    trackingToken: order.tracking_token,
    blacklistAlert: blacklistResult.isBlacklisted ? blacklistResult.entry : null,
  }
}

// ─────────────────────────────────────────────────────────────
// UPDATE ORDER STATUS
// ─────────────────────────────────────────────────────────────

export async function updateOrderStatus({
  orderId,
  newStatus,
  actorId,
  actorRole,
  notes,
  extraFields = {},
}) {
  // 1. Load current order
  const { data: order, error: loadErr } = await supabase
    .from('orders')
    .select('id, status, tracking_token, customer_id')
    .eq('id', orderId)
    .single()

  if (loadErr || !order) throw new Error('Pedido não encontrado.')

  // 2. Validate transition
  assertValidTransition(order.status, newStatus)

  // 3. Build payload with automatic timestamp fields
  const payload = { status: newStatus, ...extraFields }
  if (newStatus === ORDER_STATUS.IN_DELIVERY) payload.dispatched_at = new Date().toISOString()
  if (newStatus === ORDER_STATUS.DELIVERED)   payload.delivered_at  = new Date().toISOString()
  if (newStatus === ORDER_STATUS.CONFIRMED)   payload.client_confirmed_at = new Date().toISOString()
  if (newStatus === ORDER_STATUS.AWAITING_CLIENT) payload.price_confirmed_at = new Date().toISOString()

  // 4. Persist status change
  const { error: updateErr } = await supabase
    .from('orders')
    .update(payload)
    .eq('id', orderId)

  if (updateErr) throw new Error('Erro ao actualizar pedido: ' + updateErr.message)

  // 5. Status history
  await supabase.from('order_status_history').insert({
    order_id: orderId,
    from_status: order.status,
    to_status: newStatus,
    changed_by: actorId || null,
    notes: notes || null,
  })

  // 6. Audit log
  await auditLog({
    actorId,
    actorRole,
    action: 'ORDER_STATUS_CHANGED',
    entityType: 'order',
    entityId: orderId,
    metadata: { from: order.status, to: newStatus, notes },
  })

  // 7. Customer notification for key transitions
  const notifyOn = [
    ORDER_STATUS.AWAITING_CLIENT,
    ORDER_STATUS.IN_DELIVERY,
    ORDER_STATUS.DELIVERED,
    ORDER_STATUS.CANCELLED,
  ]
  if (notifyOn.includes(newStatus)) {
    const { data: fullOrder } = await supabase
      .from('orders')
      .select('*, customer:customers(full_name, whatsapp_number)')
      .eq('id', orderId)
      .single()

    if (fullOrder) {
      const templateMap = {
        [ORDER_STATUS.IN_DELIVERY]:     'order_dispatched',
        [ORDER_STATUS.DELIVERED]:       'order_delivered',
        [ORDER_STATUS.CANCELLED]:       'order_cancelled',
        [ORDER_STATUS.AWAITING_CLIENT]: 'price_confirmation',
      }
      const template = templateMap[newStatus]
      if (template) {
        const trackingUrl = await buildTrackingUrl(fullOrder.tracking_token)
        await sendNotification(template, {
          order: fullOrder,
          customer: fullOrder.customer,
          trackingUrl,
        })
      }
    }
  }

  return { success: true, previousStatus: order.status }
}

// ─────────────────────────────────────────────────────────────
// OPERATOR — CONFIRM PHARMACY + PRICE
// ─────────────────────────────────────────────────────────────

export async function confirmPharmacyAndPrice({
  orderId,
  pharmacyId,
  medicationPrice,
  actorId,
  actorRole,
}) {
  const deliveryFee = await getOrderDeliveryFee(orderId)
  const totalPrice  = parseFloat(medicationPrice) + parseFloat(deliveryFee || 0)

  return updateOrderStatus({
    orderId,
    newStatus: ORDER_STATUS.AWAITING_CLIENT,
    actorId,
    actorRole,
    notes: `Farmácia confirmada. Preço: ${medicationPrice} MZN`,
    extraFields: {
      pharmacy_id:      pharmacyId,
      medication_price: medicationPrice,
      total_price:      totalPrice,
    },
  })
}

async function getOrderDeliveryFee(orderId) {
  const { data } = await supabase
    .from('orders')
    .select('delivery_fee')
    .eq('id', orderId)
    .single()
  return data?.delivery_fee || 0
}

// ─────────────────────────────────────────────────────────────
// QUERY HELPERS
// ─────────────────────────────────────────────────────────────

export async function getOrdersForOperator({ statusFilter, search, limit = 50 } = {}) {
  let query = supabase
    .from('orders')
    .select(`
      id, tracking_token, status, medication_name_snapshot,
      delivery_address, delivery_fee, medication_price, total_price,
      payment_method, created_at, updated_at, operator_notes,
      prescription_status,
      customer:customers(id, full_name, whatsapp_number, is_blacklisted),
      zone:delivery_zones(name, delivery_fee)
    `)
    .order('created_at', { ascending: false })
    .limit(limit)

  if (statusFilter && statusFilter !== 'ALL') {
    query = query.eq('status', statusFilter)
  }
  if (search) {
    query = query.or(
      `medication_name_snapshot.ilike.%${search}%`
    )
  }

  const { data, error } = await query
  if (error) throw error
  return data || []
}

export async function getOrderDetail(orderId) {
  const { data, error } = await supabase
    .from('orders')
    .select(`
      *,
      customer:customers(*),
      medication:medications(commercial_name, generic_name, category, requires_prescription),
      zone:delivery_zones(name, delivery_fee),
      pharmacy:pharmacies(name, address, contact_phone),
      motoboy:profiles!orders_assigned_motoboy_id_fkey(full_name, phone),
      operator:profiles!orders_assigned_operator_id_fkey(full_name),
      status_history:order_status_history(
        id, from_status, to_status, notes, created_at,
        changed_by_profile:profiles(full_name)
      )
    `)
    .eq('id', orderId)
    .single()

  if (error) throw error
  return data
}
