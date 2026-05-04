// ─────────────────────────────────────────────────────────────
// MedGo — Notification Service (WhatsApp)
// Templates read from system_config — owner can edit in UI.
// Fallback to defaults if not configured.
// Token read from system_config.whatsapp_api_token.
// ─────────────────────────────────────────────────────────────

import { supabase } from '../lib/supabase'

// ── Config reader ─────────────────────────────────────────────

async function getWhatsAppConfig() {
  const { data } = await supabase
    .from('system_config')
    .select('key, value')
    .in('key', [
      'whatsapp_api_url',
      'whatsapp_api_token',
      'whatsapp_number',
      'whatsapp_template_order_created',
      'whatsapp_template_price_confirmation',
      'whatsapp_template_dispatched',
      'whatsapp_template_delivered',
      'whatsapp_template_cancelled',
    ])

  return Object.fromEntries((data || []).map(r => [r.key, r.value]))
}

// ── Template key mapping ──────────────────────────────────────
// service key  → system_config key
const TEMPLATE_CONFIG_KEY = {
  order_created:        'whatsapp_template_order_created',
  price_confirmation:   'whatsapp_template_price_confirmation',
  order_dispatched:     'whatsapp_template_dispatched',
  order_delivered:      'whatsapp_template_delivered',
  order_cancelled:      'whatsapp_template_cancelled',
}

// ── Default templates (fallback) ──────────────────────────────
const DEFAULT_TEMPLATES = {
  order_created: 'Olá {nome_cliente}! 👋\n\nRecebemos o seu pedido de *{medicamento}*.\n\nAcompanhe o estado aqui: {link_tracking}\n\nEntraremos em contacto em breve para confirmar disponibilidade e preço.\n\n— MedGo',
  price_confirmation: 'Olá {nome_cliente}! 💊\n\nTemos boas notícias sobre o seu pedido de *{medicamento}*.\n\nPreço total (incluindo entrega): *{preco_total}*\n\nPara confirmar, responda *SIM* a esta mensagem. Caso não pretenda, responda *NÃO*.\n\nTem 30 minutos para responder.\n\nAcompanhe aqui: {link_tracking}\n\n— MedGo',
  order_dispatched: 'Olá {nome_cliente}! 🛵\n\nO seu pedido de *{medicamento}* está a caminho!\n\nO nosso motoboy encontra-se a dirigir-se à sua morada. Fique disponível.\n\nAcompanhe: {link_tracking}\n\n— MedGo',
  order_delivered: 'Olá {nome_cliente}! ✅\n\nO seu pedido de *{medicamento}* foi entregue com sucesso.\n\nObrigado por confiar na MedGo! Qualquer questão, estamos à disposição.\n\n— MedGo',
  order_cancelled: 'Olá {nome_cliente}.\n\nLamentamos informar que o seu pedido de *{medicamento}* foi cancelado.\n\nMotivo: {motivo}\n\nPara qualquer questão, contacte-nos. Estamos aqui para ajudar.\n\n— MedGo',
}

// ── Variable interpolation ────────────────────────────────────

function formatMZN(amount) {
  if (!amount) return '—'
  return new Intl.NumberFormat('pt-MZ', {
    style: 'currency', currency: 'MZN', minimumFractionDigits: 0,
  }).format(amount)
}

/**
 * Replace {variables} in a template string with actual values.
 * Variables: {nome_cliente}, {medicamento}, {link_tracking},
 *            {preco_total}, {taxa_entrega}, {motivo}
 */
function interpolate(template, data) {
  const { order, customer, trackingUrl } = data
  return template
    .replace(/\{nome_cliente\}/g, customer?.full_name || 'Cliente')
    .replace(/\{medicamento\}/g,  order?.medication_name_snapshot || '—')
    .replace(/\{link_tracking\}/g, trackingUrl || '')
    .replace(/\{preco_total\}/g,  formatMZN(order?.total_price))
    .replace(/\{taxa_entrega\}/g, formatMZN(order?.delivery_fee))
    .replace(/\{motivo\}/g,       order?.cancellation_reason || 'Não especificado')
}

// ── Send ──────────────────────────────────────────────────────

/**
 * Send a WhatsApp notification.
 * Fails silently — never blocks the main order flow.
 *
 * @param {string} templateKey — one of: order_created, price_confirmation,
 *                               order_dispatched, order_delivered, order_cancelled
 * @param {object} data        — { order, customer, trackingUrl }
 */
export async function sendNotification(templateKey, data) {
  try {
    const config = await getWhatsAppConfig()

    const apiUrl = config.whatsapp_api_url
    if (!apiUrl) {
      console.info('[Notification] WhatsApp API not configured. Skipping:', templateKey)
      return { sent: false, reason: 'not_configured' }
    }

    // Resolve template: system_config first, fallback to default
    const configKey = TEMPLATE_CONFIG_KEY[templateKey]
    const templateText = (configKey && config[configKey])
      ? config[configKey]
      : DEFAULT_TEMPLATES[templateKey]

    if (!templateText) {
      console.warn('[Notification] Unknown template key:', templateKey)
      return { sent: false, reason: 'unknown_template' }
    }

    const message = interpolate(templateText, data)
    const recipientPhone = data.customer?.whatsapp_number
    if (!recipientPhone) {
      console.warn('[Notification] No recipient phone for:', templateKey)
      return { sent: false, reason: 'no_phone' }
    }

    // Build headers — include token if configured
    const headers = { 'Content-Type': 'application/json' }
    if (config.whatsapp_api_token) {
      headers['Authorization'] = `Bearer ${config.whatsapp_api_token}`
      headers['client-token']  = config.whatsapp_api_token  // Z-API uses this header
    }

    const response = await fetch(apiUrl, {
      method: 'POST',
      headers,
      body: JSON.stringify({
        phone: recipientPhone.replace(/[\s\-()]/g, ''),
        message,
      }),
    })

    if (!response.ok) {
      console.warn('[Notification] API error:', response.status)
      return { sent: false, reason: 'api_error' }
    }

    return { sent: true }
  } catch (err) {
    console.warn('[Notification] Failed:', templateKey, err?.message)
    return { sent: false, reason: 'exception' }
  }
}

/**
 * Build the public tracking URL for a given tracking token.
 */
export async function buildTrackingUrl(trackingToken) {
  const { data } = await supabase
    .from('system_config')
    .select('value')
    .eq('key', 'tracking_base_url')
    .single()

  const base = data?.value || 'https://medgo.co.mz/acompanhar'
  return `${base}/${trackingToken}`
}
