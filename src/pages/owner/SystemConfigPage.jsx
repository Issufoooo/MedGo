import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { supabase } from '../../lib/supabase'
import { useNotificationStore } from '../../store/notificationStore'
import { Alert } from '../../components/ui/Alert'
import { Spinner } from '../../components/ui/Spinner'

// ── WhatsApp message templates ────────────────────────────────
const TEMPLATE_DEFS = [
  {
    key: 'whatsapp_template_order_created',
    label: 'Pedido criado',
    trigger: 'Enviado quando o cliente faz um pedido',
    variables: ['{nome_cliente}', '{medicamento}', '{link_tracking}'],
    default: 'Olá {nome_cliente}! 👋\n\nRecebemos o seu pedido de *{medicamento}*.\n\nAcompanhe o estado aqui: {link_tracking}\n\nEntraremos em contacto em breve para confirmar disponibilidade e preço.\n\n— MedGo',
  },
  {
    key: 'whatsapp_template_price_confirmation',
    label: 'Confirmação de preço',
    trigger: 'Enviado quando o operador confirma a farmácia e preço',
    variables: ['{nome_cliente}', '{medicamento}', '{preco_total}', '{link_tracking}'],
    default: 'Olá {nome_cliente}! 💊\n\nTemos boas notícias sobre o seu pedido de *{medicamento}*.\n\nPreço total (incluindo entrega): *{preco_total} MZN*\n\nPara confirmar, responda *SIM* a esta mensagem. Caso não pretenda, responda *NÃO*.\n\nAcompanhe aqui: {link_tracking}\n\n— MedGo',
  },
  {
    key: 'whatsapp_template_dispatched',
    label: 'Pedido despachado',
    trigger: 'Enviado quando o motoboy parte para a entrega',
    variables: ['{nome_cliente}', '{medicamento}', '{link_tracking}'],
    default: 'Olá {nome_cliente}! 🛵\n\nO seu pedido de *{medicamento}* está a caminho!\n\nO nosso motoboy encontra-se a dirigir-se à sua morada. Fique disponível.\n\nAcompanhe: {link_tracking}\n\n— MedGo',
  },
  {
    key: 'whatsapp_template_delivered',
    label: 'Entrega concluída',
    trigger: 'Enviado após confirmação de entrega',
    variables: ['{nome_cliente}', '{medicamento}'],
    default: 'Olá {nome_cliente}! ✅\n\nO seu pedido de *{medicamento}* foi entregue com sucesso.\n\nObrigado por confiar na MedGo! Qualquer questão, estamos à disposição.\n\n— MedGo',
  },
  {
    key: 'whatsapp_template_cancelled',
    label: 'Pedido cancelado',
    trigger: 'Enviado quando um pedido é cancelado',
    variables: ['{nome_cliente}', '{medicamento}', '{motivo}'],
    default: 'Olá {nome_cliente}.\n\nLamentamos informar que o seu pedido de *{medicamento}* foi cancelado.\n\nMotivo: {motivo}\n\nPara qualquer questão, contacte-nos. Estamos aqui para ajudar.\n\n— MedGo',
  },
]

const SYSTEM_FIELDS = [
  { key: 'whatsapp_number',     label: 'Número WhatsApp da operação', placeholder: '+258 84 XXX XXXX', type: 'tel',  hint: 'Número principal da MedGo que os clientes contactam.' },
  { key: 'whatsapp_api_url',    label: 'URL da API WhatsApp',         placeholder: 'https://api.z-api.io/...', type: 'url', hint: 'Deixe em branco para usar modo manual (links).' },
  { key: 'whatsapp_api_token',  label: 'Token da API',                placeholder: '••••••••••••••••', type: 'password', hint: 'Token de autenticação da API WhatsApp (Z-API, Twilio, etc.).' },
  { key: 'tracking_base_url',   label: 'URL base de tracking',        placeholder: 'https://medgo.co.mz', type: 'url', hint: 'URL do site público usado nos links de acompanhamento.' },
  { key: 'operation_name',      label: 'Nome da operação',            placeholder: 'MedGo', type: 'text', hint: 'Nome usado nas mensagens automáticas.' },
]

const MAP_FIELDS = [
  { key: 'map_reference_lat',   label: 'Latitude da sede',            placeholder: '-25.9650', type: 'text', hint: 'Latitude do ponto de referência central (ex: -25.9650).' },
  { key: 'map_reference_lng',   label: 'Longitude da sede',           placeholder: '32.5699',  type: 'text', hint: 'Longitude do ponto de referência central (ex: 32.5699).' },
  { key: 'map_reference_label', label: 'Nome do ponto de referência', placeholder: 'MedGo HQ', type: 'text', hint: 'Nome exibido no mapa junto ao marcador da sede.' },
]

const PAYMENT_PROVIDERS = [
  { value: '',           label: 'Sem gateway (manual)' },
  { value: 'mpesa_api',  label: 'M-Pesa API (Vodacom MZ)' },
  { value: 'emola_api',  label: 'e-Mola API (Telecel MZ)' },
  { value: 'paydunya',   label: 'PayDunya' },
]

const PAYMENT_FIELDS = [
  { key: 'payment_gateway_api_key',       label: 'API Key / Client Secret', placeholder: '••••••••••••', type: 'password', hint: 'Chave de acesso fornecida pelo gateway de pagamento.' },
  { key: 'payment_gateway_merchant_code', label: 'Código do comerciante',   placeholder: 'MER-12345',    type: 'text',     hint: 'Service Provider Code ou Merchant ID atribuído ao negócio.' },
  { key: 'payment_gateway_webhook_secret',label: 'Webhook Secret',          placeholder: '••••••••••••', type: 'password', hint: 'Chave para validar callbacks recebidos do gateway.' },
]

function TemplateEditor({ def, value, onChange }) {
  const [expanded, setExpanded] = useState(false)
  const current = value || def.default

  return (
    <div className="card p-5">
      <button
        type="button"
        onClick={() => setExpanded(!expanded)}
        className="w-full flex items-start justify-between gap-3 text-left"
      >
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-0.5">
            <p className="font-extrabold text-slate-900 text-sm">{def.label}</p>
            {value && value !== def.default && (
              <span className="text-[10px] font-bold bg-teal-50 text-teal-700 border border-teal-200 px-1.5 py-0.5 rounded-full">Personalizado</span>
            )}
          </div>
          <p className="text-xs text-slate-500">{def.trigger}</p>
        </div>
        <svg className={`w-4 h-4 text-slate-400 transition-transform shrink-0 mt-0.5 ${expanded ? 'rotate-180' : ''}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7"/>
        </svg>
      </button>

      {expanded && (
        <div className="mt-4 space-y-3 animate-fade-in">
          <div className="flex flex-wrap gap-1.5">
            {def.variables.map(v => (
              <button
                key={v}
                type="button"
                onClick={() => {
                  // Insert at end of textarea (simplified)
                  onChange(current + v)
                }}
                title="Clique para inserir"
                className="font-mono text-[11px] bg-slate-50 border border-slate-200 text-slate-600 px-2 py-1 rounded-lg hover:border-teal-300 hover:bg-teal-50 hover:text-teal-700 transition-colors"
              >
                {v}
              </button>
            ))}
          </div>
          <textarea
            rows={5}
            value={current}
            onChange={e => onChange(e.target.value)}
            className="input resize-none font-mono text-xs leading-relaxed"
          />
          {value && value !== def.default && (
            <button
              type="button"
              onClick={() => onChange(def.default)}
              className="text-xs text-slate-400 hover:text-slate-700 font-medium transition-colors"
            >
              ↩ Restaurar template original
            </button>
          )}
        </div>
      )}
    </div>
  )
}

export function SystemConfigPage() {
  const notify = useNotificationStore()
  const qc = useQueryClient()
  const [saving, setSaving] = useState(false)
  const [localConfig, setLocalConfig] = useState({})
  const [dirty, setDirty] = useState(false)

  const { data: configs = [], isLoading } = useQuery({
    queryKey: ['system-config'],
    queryFn: async () => {
      const { data, error } = await supabase.from('system_config').select('key,value')
      if (error) throw error
      return data || []
    },
    onSuccess: (data) => {
      const map = {}
      data.forEach(row => { map[row.key] = row.value })
      setLocalConfig(map)
    },
  })

  const configMap = { ...configs.reduce((acc, r) => { acc[r.key] = r.value; return acc }, {}), ...localConfig }

  const setVal = (key, value) => {
    setLocalConfig(prev => ({ ...prev, [key]: value }))
    setDirty(true)
  }

  const handleSave = async () => {
    setSaving(true)
    try {
      const upserts = Object.entries(localConfig).map(([key, value]) => ({ key, value }))
      if (upserts.length === 0) { notify.info('Sem alterações para guardar.'); return }

      const { error } = await supabase.from('system_config').upsert(upserts, { onConflict: 'key' })
      if (error) throw error

      notify.success('Configurações guardadas com sucesso.')
      setDirty(false)
      qc.invalidateQueries({ queryKey: ['system-config'] })
    } catch (err) {
      notify.error(err.message)
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="max-w-3xl mx-auto px-4 md:px-6 py-6 pb-10 space-y-6">

      {/* Header */}
      <div className="relative overflow-hidden rounded-[28px] border border-white/10 bg-[linear-gradient(155deg,#0d9488_0%,#0f766e_25%,#0a192f_100%)] px-6 py-7 text-white shadow-lg">
        <div className="absolute inset-0 dot-pattern opacity-60" />
        <div className="relative flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <p className="text-xs font-extrabold uppercase tracking-[0.22em] text-white/70">Sistema</p>
            <h1 className="mt-2 text-2xl font-extrabold">Configurações</h1>
            <p className="mt-1.5 text-sm text-white/70">
              Parâmetros da plataforma, número WhatsApp e templates de mensagens.
            </p>
          </div>
          {dirty && (
            <button
              onClick={handleSave}
              disabled={saving}
              className="inline-flex items-center gap-2 rounded-2xl bg-white/15 border border-white/20 px-5 py-2.5 text-sm font-semibold text-white hover:bg-white/25 transition-colors backdrop-blur-sm shrink-0"
            >
              {saving ? <Spinner size="sm" color="white" /> : (
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7"/>
                </svg>
              )}
              Guardar alterações
            </button>
          )}
        </div>
      </div>

      {isLoading ? (
        <div className="flex justify-center py-12"><Spinner size="lg" /></div>
      ) : (
        <>
          {/* System parameters */}
          <div className="space-y-4">
            <div>
              <h2 className="text-lg font-extrabold text-slate-900 mb-1">Parâmetros do sistema</h2>
              <p className="text-sm text-slate-500">Contactos, URLs e identificação da operação.</p>
            </div>

            <div className="card p-5 space-y-4">
              {SYSTEM_FIELDS.map(field => (
                <div key={field.key}>
                  <label className="label">{field.label}</label>
                  <input
                    type={field.type}
                    value={configMap[field.key] || ''}
                    onChange={e => setVal(field.key, e.target.value)}
                    placeholder={field.placeholder}
                    className="input"
                  />
                  <p className="label-hint">{field.hint}</p>
                </div>
              ))}
            </div>
          </div>

          {/* WhatsApp integration */}
          <div className="space-y-4">
            <div>
              <h2 className="text-lg font-extrabold text-slate-900 mb-1">Integração WhatsApp</h2>
              <p className="text-sm text-slate-500">Estado da integração e como funciona sem API.</p>
            </div>

            <div className="card p-5">
              <div className="flex items-start gap-3">
                <div className={`w-3 h-3 rounded-full mt-1 shrink-0 ${configMap['whatsapp_api_url'] ? 'bg-teal-500' : 'bg-amber-400'}`} />
                <div>
                  <p className="font-semibold text-slate-900 text-sm">
                    {configMap['whatsapp_api_url'] ? 'API configurada' : 'Modo manual (botões WhatsApp)'}
                  </p>
                  <p className="text-xs text-slate-500 mt-0.5">
                    {configMap['whatsapp_api_url']
                      ? 'Mensagens enviadas automaticamente via API.'
                      : 'Sem URL de API definida. Os operadores usam botões WhatsApp para contactar clientes manualmente. O sistema funciona normalmente.'}
                  </p>
                </div>
              </div>
            </div>
          </div>

          {/* Map reference point */}
          <div className="space-y-4">
            <div>
              <h2 className="text-lg font-extrabold text-slate-900 mb-1">Ponto de referência do mapa</h2>
              <p className="text-sm text-slate-500">
                Coordenadas da sede MedGo — usadas para calcular distâncias e taxas de entrega automaticamente.
                Pode também arrastar o marcador directamente na página de Zonas.
              </p>
            </div>

            <div className="card p-5 space-y-4">
              {MAP_FIELDS.map(field => (
                <div key={field.key}>
                  <label className="label">{field.label}</label>
                  <input
                    type={field.type}
                    value={configMap[field.key] || ''}
                    onChange={e => setVal(field.key, e.target.value)}
                    placeholder={field.placeholder}
                    className="input"
                  />
                  <p className="label-hint">{field.hint}</p>
                </div>
              ))}
            </div>
          </div>

          {/* WhatsApp templates */}
          <div className="space-y-4">
            <div>
              <h2 className="text-lg font-extrabold text-slate-900 mb-1">Templates de mensagens</h2>
              <p className="text-sm text-slate-500">
                Personalize as mensagens enviadas em cada etapa do pedido.
                As variáveis disponíveis são: <code className="text-xs bg-slate-100 px-1 rounded">{'{nome_cliente}'}</code>,{' '}
                <code className="text-xs bg-slate-100 px-1 rounded">{'{medicamento}'}</code>,{' '}
                <code className="text-xs bg-slate-100 px-1 rounded">{'{link_tracking}'}</code>,{' '}
                <code className="text-xs bg-slate-100 px-1 rounded">{'{preco_total}'}</code>,{' '}
                <code className="text-xs bg-slate-100 px-1 rounded">{'{motivo}'}</code>.
              </p>
            </div>

            <div className="space-y-3">
              {TEMPLATE_DEFS.map(def => (
                <TemplateEditor
                  key={def.key}
                  def={def}
                  value={configMap[def.key]}
                  onChange={val => setVal(def.key, val)}
                />
              ))}
            </div>
          </div>

          {/* Payment gateway */}
          <div className="space-y-4">
            <div>
              <h2 className="text-lg font-extrabold text-slate-900 mb-1">Gateway de pagamento</h2>
              <p className="text-sm text-slate-500">
                Configure a integração com M-Pesa ou e-Mola para automatizar a cobrança.
                Sem gateway configurado, os pagamentos são confirmados manualmente pelo operador.
              </p>
            </div>

            <div className="card p-5 space-y-4">
              <div>
                <label className="label">Fornecedor</label>
                <select
                  value={configMap['payment_gateway_provider'] || ''}
                  onChange={e => setVal('payment_gateway_provider', e.target.value)}
                  className="input"
                >
                  {PAYMENT_PROVIDERS.map(p => (
                    <option key={p.value} value={p.value}>{p.label}</option>
                  ))}
                </select>
                <p className="label-hint">Seleccione o gateway de pagamento a usar nas cobranças automáticas.</p>
              </div>

              <div>
                <label className="label">Ambiente</label>
                <select
                  value={configMap['payment_gateway_environment'] || 'sandbox'}
                  onChange={e => setVal('payment_gateway_environment', e.target.value)}
                  className="input"
                >
                  <option value="sandbox">Sandbox (testes)</option>
                  <option value="production">Produção</option>
                </select>
                <p className="label-hint text-orange-600 font-semibold">Altere para "Produção" apenas depois de testar completamente no sandbox.</p>
              </div>

              {PAYMENT_FIELDS.map(field => (
                <div key={field.key}>
                  <label className="label">{field.label}</label>
                  <input
                    type={field.type}
                    value={configMap[field.key] || ''}
                    onChange={e => setVal(field.key, e.target.value)}
                    placeholder={field.placeholder}
                    className="input"
                  />
                  <p className="label-hint">{field.hint}</p>
                </div>
              ))}

              {!configMap['payment_gateway_provider'] && (
                <div className="flex items-start gap-3 rounded-xl bg-slate-50 border border-slate-200 px-4 py-3">
                  <svg className="w-4 h-4 text-slate-400 mt-0.5 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"/>
                  </svg>
                  <p className="text-xs text-slate-500">
                    Sem gateway activo, o operador confirma manualmente cada pagamento na página do pedido.
                    O sistema funciona normalmente — o gateway é opcional.
                  </p>
                </div>
              )}
            </div>
          </div>

          {/* Save button (sticky bottom) */}
          {dirty && (
            <div className="sticky bottom-4">
              <button onClick={handleSave} disabled={saving} className="btn-primary-lg w-full shadow-card-lg">
                {saving ? <><Spinner size="sm" /> A guardar...</> : (
                  <><svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7"/></svg> Guardar todas as alterações</>
                )}
              </button>
            </div>
          )}
        </>
      )}
    </div>
  )
}
