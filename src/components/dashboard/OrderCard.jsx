import { useNavigate } from 'react-router-dom'
import { ORDER_CARD_CLASS } from '../../lib/constants'

const STATUS_LABEL = {
  NEW:'Novo', PRESCRIPTION_PENDING:'Aguarda receita', IN_VALIDATION:'Em validação',
  AWAITING_PHARMACY:'A confirmar farmácia', AWAITING_CLIENT:'Aguarda confirmação',
  CONFIRMED:'Confirmado', IN_PREPARATION:'Em preparação', IN_DELIVERY:'Em entrega',
  DELIVERED:'Entregue', CANCELLED:'Cancelado',
}
const STATUS_DOT = {
  NEW:'bg-slate-400', PRESCRIPTION_PENDING:'bg-amber-400', IN_VALIDATION:'bg-violet-400',
  AWAITING_PHARMACY:'bg-blue-400', AWAITING_CLIENT:'bg-orange-400',
  CONFIRMED:'bg-teal-500', IN_PREPARATION:'bg-indigo-400', IN_DELIVERY:'bg-cyan-400',
  DELIVERED:'bg-green-500', CANCELLED:'bg-red-400',
}

const fmt = v => v ? new Intl.NumberFormat('pt-MZ',{style:'currency',currency:'MZN',minimumFractionDigits:0}).format(v) : null

// ── SVG payment icons ─────────────────────────────────────────

function IconMpesa() {
  return (
    <svg className="w-3.5 h-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}>
      <rect x="5" y="2" width="14" height="20" rx="2"/>
      <path d="M12 18h.01"/>
    </svg>
  )
}
function IconCard() {
  return (
    <svg className="w-3.5 h-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}>
      <rect x="2" y="5" width="20" height="14" rx="2"/>
      <path d="M2 10h20"/>
    </svg>
  )
}
function IconCash() {
  return (
    <svg className="w-3.5 h-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}>
      <rect x="2" y="6" width="20" height="12" rx="1"/>
      <circle cx="12" cy="12" r="2"/>
      <path d="M6 12h.01M18 12h.01"/>
    </svg>
  )
}
function IconPos() {
  return (
    <svg className="w-3.5 h-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}>
      <rect x="4" y="3" width="16" height="18" rx="2"/>
      <path d="M8 7h8M8 11h4M8 15h2"/>
    </svg>
  )
}
function IconPin() {
  return (
    <svg className="w-3 h-3 shrink-0" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z"/>
      <path strokeLinecap="round" strokeLinejoin="round" d="M15 11a3 3 0 11-6 0 3 3 0 016 0z"/>
    </svg>
  )
}
function IconRx() {
  return (
    <svg className="w-3 h-3" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"/>
    </svg>
  )
}
function IconWarning() {
  return (
    <svg className="w-3 h-3" viewBox="0 0 20 20" fill="currentColor">
      <path fillRule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clipRule="evenodd"/>
    </svg>
  )
}

const PAY_ICON = {
  MPESA:            <IconMpesa />,
  EMOLA:            <IconCard />,
  CASH_ON_DELIVERY: <IconCash />,
  POS:              <IconPos />,
}
const PAY_LABEL = { MPESA:'M-Pesa', EMOLA:'e-Mola', CASH_ON_DELIVERY:'Dinheiro', POS:'POS' }

function timeAgo(iso) {
  if (!iso) return ''
  const m = Math.floor((Date.now() - new Date(iso)) / 60000)
  if (m < 1)    return 'agora'
  if (m < 60)   return m + 'min'
  if (m < 1440) return Math.floor(m/60) + 'h'
  return new Date(iso).toLocaleDateString('pt-MZ', { day:'2-digit', month:'short' })
}

export function OrderCard({ order }) {
  const navigate = useNavigate()
  const borderCls = ORDER_CARD_CLASS[order.status] || 'border-l-slate-200'

  return (
    <div
      onClick={() => navigate(`/dashboard/pedido/${order.id}`)}
      className={`order-card ${borderCls} animate-fade-in`}
    >
      <div className="flex items-start justify-between gap-3 mb-2.5">
        {/* Left */}
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-1.5 flex-wrap">
            {/* Status pill */}
            <span className="inline-flex items-center gap-1.5 text-xs font-semibold text-slate-600">
              <span className={`w-1.5 h-1.5 rounded-full shrink-0 ${STATUS_DOT[order.status] || 'bg-slate-400'}`} />
              {STATUS_LABEL[order.status] || order.status}
            </span>
            {/* Blacklist warning */}
            {order.customer?.is_blacklisted && (
              <span className="inline-flex items-center gap-1 badge-sm bg-red-600 text-white">
                <IconWarning /> Lista negra
              </span>
            )}
            {/* Prescription pending */}
            {order.prescription_status === 'PENDING' && (
              <span className="inline-flex items-center gap-1 badge-sm bg-amber-100 text-amber-700">
                <IconRx /> Receita
              </span>
            )}
          </div>
          <p className="font-extrabold text-slate-900 text-sm leading-tight truncate">
            {order.medication_name_snapshot}
          </p>
          <p className="text-xs text-slate-500 truncate mt-0.5">
            {order.customer?.full_name}
            {order.zone?.name && (
              <><span className="text-slate-300 mx-1.5">·</span>{order.zone.name}</>
            )}
          </p>
        </div>

        {/* Right */}
        <div className="text-right shrink-0">
          <p className="text-xs text-slate-400 font-medium">{timeAgo(order.created_at)}</p>
          {fmt(order.total_price) && (
            <p className="text-sm font-extrabold text-teal-700 mt-0.5">{fmt(order.total_price)}</p>
          )}
        </div>
      </div>

      {/* Footer row */}
      <div className="flex items-center gap-3 pt-2.5 border-t border-slate-50">
        {order.payment_method && (
          <span className="text-xs text-slate-400 flex items-center gap-1.5">
            <span className="text-slate-400">{PAY_ICON[order.payment_method]}</span>
            {PAY_LABEL[order.payment_method]}
          </span>
        )}
        {order.delivery_address && (
          <span className="text-xs text-slate-400 truncate flex-1 min-w-0 flex items-center gap-1">
            <IconPin />
            <span className="truncate">{order.delivery_address}</span>
          </span>
        )}
        <svg className="w-4 h-4 text-slate-300 shrink-0 ml-auto" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7"/>
        </svg>
      </div>
    </div>
  )
}
