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
const PAY_ICON = { MPESA:'📱', EMOLA:'💳', CASH_ON_DELIVERY:'💵', POS:'🖥️' }
const fmt = v => v ? new Intl.NumberFormat('pt-MZ',{style:'currency',currency:'MZN',minimumFractionDigits:0}).format(v) : null

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
              <span className="badge-sm bg-red-600 text-white">⚠️ Lista negra</span>
            )}
            {/* Prescription pending */}
            {order.prescription_status === 'PENDING' && (
              <span className="badge-sm bg-amber-100 text-amber-700">📋 Receita</span>
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
          <span className="text-xs text-slate-400 flex items-center gap-1">
            {PAY_ICON[order.payment_method]}
            {{ MPESA:'M-Pesa', EMOLA:'e-Mola', CASH_ON_DELIVERY:'Dinheiro', POS:'POS' }[order.payment_method]}
          </span>
        )}
        {order.delivery_address && (
          <span className="text-xs text-slate-400 truncate flex-1 min-w-0">
            📍 {order.delivery_address}
          </span>
        )}
        <svg className="w-4 h-4 text-slate-300 shrink-0 ml-auto" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7"/>
        </svg>
      </div>
    </div>
  )
}
