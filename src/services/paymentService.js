// ─────────────────────────────────────────────────────────────
// MedGo — Payment Gateway Service
// Clean abstraction over any payment provider.
// Currently: infrastructure only.
// To activate: set payment_gateway_provider in system_config.
// ─────────────────────────────────────────────────────────────

import { supabase } from '../lib/supabase'

async function getGatewayConfig() {
  const { data } = await supabase
    .from('system_config')
    .select('key, value')
    .in('key', [
      'payment_gateway_provider',
      'payment_gateway_api_key',
      'payment_gateway_merchant_code',
      'payment_gateway_environment',
      'payment_gateway_webhook_secret',
    ])

  const m = Object.fromEntries((data || []).map(r => [r.key, r.value]))
  return {
    provider:      m.payment_gateway_provider      || null,
    apiKey:        m.payment_gateway_api_key        || null,
    merchantCode:  m.payment_gateway_merchant_code  || null,
    environment:   m.payment_gateway_environment    || 'sandbox',
    webhookSecret: m.payment_gateway_webhook_secret || null,
  }
}

// ── Provider adapters ─────────────────────────────────────────

/**
 * M-Pesa Mozambique API (Vodacom)
 * Docs: developer.mpesa.vm.co.mz
 */
async function mpesaInitiate({ phone, amount, reference, config }) {
  const baseUrl = config.environment === 'production'
    ? 'https://api.sandbox.vm.co.mz'   // TODO: replace with production URL
    : 'https://api.sandbox.vm.co.mz'

  const res = await fetch(`${baseUrl}/ipg/v1x/c2bPayment/singleStage/`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${config.apiKey}`,
      'Origin': window.location.origin,
    },
    body: JSON.stringify({
      input_TransactionReference: reference,
      input_CustomerMSISDN: phone,
      input_Amount: amount.toFixed(2),
      input_ThirdPartyReference: reference,
      input_ServiceProviderCode: config.merchantCode,
    }),
  })

  if (!res.ok) {
    const err = await res.json().catch(() => ({}))
    throw new Error(err.output_error_message || `M-Pesa API error: ${res.status}`)
  }

  return res.json()
}

/**
 * e-Mola API (Mozambique Telecel)
 * Placeholder — official docs needed for exact format
 */
async function emolaInitiate({ phone, amount, reference, config }) {
  const baseUrl = config.environment === 'production'
    ? 'https://api.emola.co.mz'
    : 'https://api.sandbox.emola.co.mz'

  const res = await fetch(`${baseUrl}/payment/request`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'X-API-Key': config.apiKey,
    },
    body: JSON.stringify({
      merchant: config.merchantCode,
      amount,
      msisdn: phone,
      reference,
    }),
  })

  if (!res.ok) throw new Error(`e-Mola API error: ${res.status}`)
  return res.json()
}

// ── Public interface ──────────────────────────────────────────

/**
 * Initiate a payment request.
 * Records the attempt in orders.payment_gateway_ref + payment_initiated_at.
 *
 * @param {object} params
 * @param {string} params.orderId
 * @param {number} params.amount     — total MZN
 * @param {string} params.phone      — customer WhatsApp/mobile (e.g. +258841234567)
 * @param {string} params.method     — 'MPESA' | 'EMOLA'
 * @param {string} params.reference  — short order reference for SMS display
 */
export async function initiatePayment({ orderId, amount, phone, method, reference }) {
  const config = await getGatewayConfig()

  if (!config.provider) {
    return { success: false, reason: 'gateway_not_configured' }
  }

  const cleanPhone = phone.replace(/[\s\-()]/g, '').replace(/^\+/, '')
  let result

  try {
    if (method === 'MPESA' || config.provider === 'mpesa_api') {
      result = await mpesaInitiate({ phone: cleanPhone, amount, reference, config })
    } else if (method === 'EMOLA' || config.provider === 'emola_api') {
      result = await emolaInitiate({ phone: cleanPhone, amount, reference, config })
    } else {
      return { success: false, reason: 'unsupported_provider' }
    }

    // Record the gateway reference on the order
    const gatewayRef = result?.output_TransactionID || result?.transactionId || reference
    await supabase.from('orders').update({
      payment_gateway_ref: gatewayRef,
      payment_gateway_status: 'PENDING',
      payment_initiated_at: new Date().toISOString(),
    }).eq('id', orderId)

    return { success: true, gatewayRef, raw: result }
  } catch (err) {
    await supabase.from('orders').update({
      payment_gateway_status: 'FAILED',
    }).eq('id', orderId)

    return { success: false, reason: err.message }
  }
}

/**
 * Mark payment as manually confirmed by the operator.
 * Used when automatic gateway is not configured or as override.
 */
export async function confirmPaymentManually({ orderId, reference, notes }) {
  const { error } = await supabase.from('orders').update({
    payment_status: 'CONFIRMED',
    payment_reference: reference || null,
    payment_gateway_status: reference ? 'CONFIRMED_MANUAL' : null,
  }).eq('id', orderId)

  if (error) throw new Error('Erro ao confirmar pagamento: ' + error.message)
}

/**
 * Process a payment webhook callback from the gateway.
 * Should be called from a Supabase Edge Function.
 *
 * @param {object} payload — raw webhook body
 * @param {string} provider — 'mpesa_api' | 'emola_api'
 */
export async function processWebhook(payload, provider) {
  // Normalize across providers
  let transactionId, status, merchantReference

  if (provider === 'mpesa_api') {
    transactionId    = payload.output_TransactionID
    merchantReference = payload.input_ThirdPartyReference
    status           = payload.output_ResponseCode === 'INS-0' ? 'CONFIRMED' : 'FAILED'
  } else if (provider === 'emola_api') {
    transactionId    = payload.transactionId
    merchantReference = payload.reference
    status           = payload.status === 'SUCCESS' ? 'CONFIRMED' : 'FAILED'
  } else {
    throw new Error('Unknown provider: ' + provider)
  }

  // Update order
  const { error } = await supabase.from('orders')
    .update({
      payment_status: status,
      payment_gateway_ref: transactionId,
      payment_gateway_status: status,
      payment_reference: transactionId,
    })
    .eq('payment_gateway_ref', merchantReference)

  if (error) throw error

  return { status, transactionId }
}
