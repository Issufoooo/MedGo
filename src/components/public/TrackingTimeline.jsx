import { ORDER_STATUS_TIMELINE } from '../../lib/constants'

const META = {
  NEW:                  { label:'Pedido recebido',            desc:'Recebemos o seu pedido e estamos a analisá-lo.' },
  PRESCRIPTION_PENDING: { label:'Aguarda receita médica',     desc:'Precisamos da sua receita para continuar.' },
  IN_VALIDATION:        { label:'Em validação',               desc:'A nossa equipa está a verificar o seu pedido.' },
  AWAITING_PHARMACY:    { label:'A confirmar disponibilidade',desc:'A confirmar disponibilidade do medicamento.' },
  AWAITING_CLIENT:      { label:'Aguarda a sua confirmação',  desc:'Enviámos o preço. Responda para continuar.' },
  CONFIRMED:            { label:'Pedido confirmado',          desc:'Confirmado! Estamos a preparar a entrega.' },
  IN_PREPARATION:       { label:'Em preparação',              desc:'O motoboy foi atribuído e vai buscar o medicamento.' },
  IN_DELIVERY:          { label:'Em entrega',                 desc:'O motoboy está a caminho. Fique disponível!' },
  DELIVERED:            { label:'Entregue com sucesso',       desc:'O medicamento foi entregue. Obrigado!' },
}

const fmtTs = iso => iso
  ? new Date(iso).toLocaleString('pt-MZ', { day:'2-digit', month:'short', hour:'2-digit', minute:'2-digit' })
  : null

export function TrackingTimeline({ currentStatus, statusHistory = [] }) {
  if (currentStatus === 'CANCELLED') {
    return (
      <div className="flex items-start gap-3 p-4 bg-red-50 border border-red-200 rounded-2xl animate-fade-in">
        <div className="w-8 h-8 rounded-full bg-red-100 flex items-center justify-center shrink-0">
          <svg className="w-4 h-4 text-red-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M6 18L18 6M6 6l12 12"/>
          </svg>
        </div>
        <div>
          <p className="font-extrabold text-red-700">Pedido cancelado</p>
          <p className="text-sm text-red-600 mt-0.5">Se tiver dúvidas, contacte-nos via WhatsApp.</p>
        </div>
      </div>
    )
  }

  const currentIdx = ORDER_STATUS_TIMELINE.indexOf(currentStatus)

  return (
    <div>
      {ORDER_STATUS_TIMELINE.map((status, i) => {
        const isDone    = i < currentIdx
        const isCurrent = i === currentIdx
        const isPending = i > currentIdx
        const meta      = META[status] || { label: status }
        const histEntry = statusHistory.find(h => h.status === status)
        const isLast    = i === ORDER_STATUS_TIMELINE.length - 1

        return (
          <div key={status} className={`flex gap-4 ${isPending ? 'opacity-30' : ''}`}>
            {/* Dot + line */}
            <div className="flex flex-col items-center shrink-0">
              <div className={`
                w-8 h-8 rounded-full flex items-center justify-center shrink-0 transition-all duration-500
                ${isDone    ? 'bg-teal-500 border-2 border-teal-500 text-white'                         : ''}
                ${isCurrent ? 'bg-teal-500 border-2 border-teal-500 text-white ring-4 ring-teal-100 scale-110' : ''}
                ${isPending ? 'bg-white border-2 border-slate-200'                                      : ''}
              `}>
                {isDone ? (
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M5 13l4 4L19 7"/>
                  </svg>
                ) : isCurrent ? (
                  <span className="w-2 h-2 rounded-full bg-white" />
                ) : (
                  <span className="w-1.5 h-1.5 rounded-full bg-slate-300" />
                )}
              </div>
              {!isLast && (
                <div className={`w-0.5 flex-1 min-h-[20px] my-1 transition-all duration-500 ${
                  isDone ? 'bg-teal-200' : 'bg-slate-100'
                }`} />
              )}
            </div>

            {/* Content */}
            <div className={`pb-4 flex-1 min-w-0 ${isLast ? 'pb-0' : ''}`}>
              <p className={`text-sm font-semibold leading-tight mb-0.5 ${
                isCurrent ? 'text-teal-700'  :
                isDone    ? 'text-slate-600' :
                            'text-slate-400'
              }`}>
                {meta.label}
              </p>
              {isCurrent && meta.desc && (
                <p className="text-xs text-slate-500 leading-relaxed mb-0.5">{meta.desc}</p>
              )}
              {histEntry?.created_at && (
                <p className="text-xs text-slate-400 font-medium">{fmtTs(histEntry.created_at)}</p>
              )}
            </div>
          </div>
        )
      })}
    </div>
  )
}
