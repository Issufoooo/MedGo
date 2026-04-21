import { supabase } from '../lib/supabase'

/**
 * Get a system config value by key.
 */
async function getConfig(key) {
  const { data } = await supabase
    .from('system_config')
    .select('value')
    .eq('key', key)
    .single()
  return data?.value || null
}

/**
 * WhatsApp message templates.
 * These are defaults — can be overridden via system_config in the future.
 */
const TEMPLATES = {
  order_created: ({ order, customer, trackingUrl }) =>
    `Olá ${customer.full_name}! 👋\n\nO seu pedido de *${order.medication_name_snapshot}* foi recebido com sucesso.\n\n` +
    `Acompanhe o estado aqui: ${trackingUrl}\n\n_MedGo — Medicamentos ao seu domicílio_`,

  prescription_requested: ({ customer }) =>
    `Olá ${customer.full_name},\n\nNão conseguimos ler a sua receita médica. Por favor envie uma nova foto mais nítida.\n\n` +
    `Tem *30 minutos* para reenviar, caso contrário o pedido será cancelado.\n\n_MedGo_`,

  price_confirmation: ({ customer, order, trackingUrl }) =>
    `Olá ${customer.full_name}! ✅\n\nO seu pedido está confirmado!\n\n` +
    `💊 *${order.medication_name_snapshot}*\n` +
    `💵 Medicamento: ${formatMZN(order.medication_price)}\n` +
    `🛵 Entrega: ${formatMZN(order.delivery_fee)}\n` +
    `💰 *Total: ${formatMZN(order.total_price)}*\n\n` +
    `Responda *SIM* para confirmar ou *NÃO* para cancelar.\n` +
    `Tem 30 minutos para responder.\n\n` +
    `Acompanhe aqui: ${trackingUrl}`,

  order_dispatched: ({ customer }) =>
    `O seu pedido está a caminho! 🛵\n\nO motoboy já saiu com o seu medicamento. Esteja disponível para receber.\n\n_MedGo_`,

  order_delivered: ({ customer, order }) =>
    `Entrega concluída! ✅\n\nO seu medicamento *${order.medication_name_snapshot}* foi entregue.\n\nObrigado por confiar na MedGo! 💙`,

  order_cancelled: ({ customer, order }) =>
    `O seu pedido de *${order.medication_name_snapshot}* foi cancelado.\n\n` +
    `Motivo: ${order.cancellation_reason || 'Não especificado'}\n\n` +
    `Em caso de dúvida, contacte-nos. _MedGo_`,
}

function formatMZN(amount) {
  if (!amount) return '—'
  return new Intl.NumberFormat('pt-MZ', {
    style: 'currency',
    currency: 'MZN',
    minimumFractionDigits: 2,
  }).format(amount)
}

/**
 * Send a WhatsApp notification.
 * Fails silently — never block the main order flow.
 *
 * @param {string} templateKey - Key from TEMPLATES object
 * @param {object} data        - Data passed to template function
 */
export async function sendNotification(templateKey, data) {
  try {
    const apiUrl = await getConfig('whatsapp_api_url')
    const senderNumber = await getConfig('whatsapp_sender_number')

    if (!apiUrl || !senderNumber) {
      // WhatsApp not configured yet — log and skip
      console.info('[Notification] WhatsApp not configured. Skipping:', templateKey)
      return { sent: false, reason: 'not_configured' }
    }

    const template = TEMPLATES[templateKey]
    if (!template) {
      console.warn('[Notification] Unknown template:', templateKey)
      return { sent: false, reason: 'unknown_template' }
    }

    const message = template(data)
    const recipientPhone = data.customer?.whatsapp_number

    if (!recipientPhone) {
      console.warn('[Notification] No recipient phone for:', templateKey)
      return { sent: false, reason: 'no_phone' }
    }

    const response = await fetch(apiUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        phone: recipientPhone,
        message,
        from: senderNumber,
      }),
    })

    if (!response.ok) {
      console.warn('[Notification] API error:', response.status)
      return { sent: false, reason: 'api_error' }
    }

    return { sent: true }
  } catch (err) {
    // Silent fail — notifications must never crash business logic
    console.warn('[Notification] Failed:', templateKey, err?.message)
    return { sent: false, reason: 'exception' }
  }
}

/**
 * Build the public tracking URL for a given tracking token.
 */
export async function buildTrackingUrl(trackingToken) {
  const base = await getConfig('tracking_base_url')
  return `${base || 'https://medgo.co.mz/acompanhar'}/${trackingToken}`
}
