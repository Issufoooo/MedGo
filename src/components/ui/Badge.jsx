import { STATUS_BADGE_CLASS, CATEGORY_BADGE_CLASS } from '../../lib/constants'

const STATUS_LABELS = {
  NEW:'Novo', PRESCRIPTION_PENDING:'Aguarda receita', IN_VALIDATION:'Em validação',
  AWAITING_PHARMACY:'A confirmar farmácia', AWAITING_CLIENT:'Aguarda confirmação',
  CONFIRMED:'Confirmado', IN_PREPARATION:'Em preparação', IN_DELIVERY:'Em entrega',
  DELIVERED:'Entregue', CANCELLED:'Cancelado',
}
const STATUS_DOTS = {
  NEW:'bg-slate-400', PRESCRIPTION_PENDING:'bg-amber-400', IN_VALIDATION:'bg-violet-500',
  AWAITING_PHARMACY:'bg-blue-500', AWAITING_CLIENT:'bg-orange-500',
  CONFIRMED:'bg-teal-500', IN_PREPARATION:'bg-indigo-500', IN_DELIVERY:'bg-cyan-500',
  DELIVERED:'bg-green-500', CANCELLED:'bg-red-400',
}
const CATEGORY_LABELS = {
  FREE:'Venda Livre', PRESCRIPTION:'Receita Obrigatória', RESTRICTED_MONITORED:'Venda Restrita',
}

export function StatusBadge({ status, showIcon = false }) {
  const cls = STATUS_BADGE_CLASS[status] || 'badge bg-slate-100 text-slate-600'
  const dot = STATUS_DOTS[status]
  const label = STATUS_LABELS[status] || status
  return (
    <span className={cls}>
      {dot && <span className={`w-1.5 h-1.5 rounded-full ${dot} shrink-0`} />}
      {label}
    </span>
  )
}

export function CategoryBadge({ category }) {
  const cls = CATEGORY_BADGE_CLASS[category] || 'badge bg-slate-100 text-slate-600'
  return <span className={cls}>{CATEGORY_LABELS[category] || category}</span>
}

export function Badge({ children, variant = 'default', className = '' }) {
  const v = {
    default: 'bg-slate-100 text-slate-700',
    teal:    'bg-teal-100 text-teal-700',
    orange:  'bg-orange-100 text-orange-700',
    green:   'bg-green-100 text-green-700',
    red:     'bg-red-50 text-red-600',
    yellow:  'bg-yellow-100 text-yellow-700',
    blue:    'bg-blue-100 text-blue-700',
    purple:  'bg-violet-100 text-violet-700',
  }
  return <span className={`badge ${v[variant] || v.default} ${className}`}>{children}</span>
}
