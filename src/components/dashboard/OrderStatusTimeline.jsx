const STATUS_LABELS = {
  NEW:'Pedido recebido', PRESCRIPTION_PENDING:'Aguardando receita', IN_VALIDATION:'Em validação',
  AWAITING_PHARMACY:'Farmácia seleccionada', AWAITING_CLIENT:'Aguardando confirmação do cliente',
  CONFIRMED:'Confirmado pelo cliente', IN_PREPARATION:'Motoboy atribuído',
  IN_DELIVERY:'Em entrega', DELIVERED:'Entregue', CANCELLED:'Cancelado',
}

const STATUS_COLORS = {
  DELIVERED: 'step-done', CANCELLED: 'bg-red-500 border-red-500 text-white',
}

function getStepCls(status, isFirst) {
  if (!isFirst) return 'bg-white border-2 border-slate-200 text-slate-400'
  if (status === 'CANCELLED') return 'bg-red-500 border-2 border-red-500 text-white'
  return 'step-done'
}

const fmtTs = iso => iso
  ? new Date(iso).toLocaleString('pt-MZ', { day:'2-digit', month:'short', hour:'2-digit', minute:'2-digit' })
  : ''

export function OrderStatusTimeline({ history = [] }) {
  if (!history.length) {
    return <p className="text-sm text-slate-400 py-6 text-center">Sem histórico registado.</p>
  }

  const sorted = [...history].sort((a, b) => new Date(b.created_at) - new Date(a.created_at))

  return (
    <div>
      {sorted.map((entry, i) => {
        const isFirst = i === 0
        const isCancelled = entry.to_status === 'CANCELLED'
        return (
          <div key={entry.id || i} className="flex gap-3">
            {/* Dot + line */}
            <div className="flex flex-col items-center shrink-0">
              <div className={`
                w-7 h-7 rounded-full border-2 flex items-center justify-center text-xs shrink-0
                ${getStepCls(entry.to_status, isFirst)}
              `}>
                {isFirst && !isCancelled
                  ? <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M5 13l4 4L19 7"/></svg>
                  : isCancelled
                    ? <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M6 18L18 6M6 6l12 12"/></svg>
                    : <span className="w-1.5 h-1.5 rounded-full bg-slate-300" />
                }
              </div>
              {i < sorted.length - 1 && (
                <div className="w-px flex-1 min-h-[20px] my-1 bg-slate-100" />
              )}
            </div>

            {/* Content */}
            <div className="pb-4 flex-1 min-w-0 last:pb-0">
              <div className="flex items-center justify-between gap-2 mb-0.5">
                <p className={`text-sm font-semibold ${
                  isFirst && !isCancelled ? 'text-teal-700'  :
                  isCancelled             ? 'text-red-600'   :
                                            'text-slate-500'
                }`}>
                  {STATUS_LABELS[entry.to_status] || entry.to_status}
                </p>
                {entry.created_at && (
                  <p className="text-xs text-slate-400 shrink-0 font-medium">{fmtTs(entry.created_at)}</p>
                )}
              </div>
              {entry.notes && (
                <p className="text-xs text-slate-500 leading-relaxed">{entry.notes}</p>
              )}
              {entry.changed_by_profile?.full_name && (
                <p className="text-2xs text-slate-400 mt-0.5 font-medium">
                  por {entry.changed_by_profile.full_name}
                </p>
              )}
            </div>
          </div>
        )
      })}
    </div>
  )
}
