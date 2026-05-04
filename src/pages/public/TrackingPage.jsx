import { useParams, Link } from 'react-router-dom'
import { useQuery } from '@tanstack/react-query'
import { supabase } from '../../lib/supabase'
import { TrackingTimeline } from '../../components/public/TrackingTimeline'
import { Spinner } from '../../components/ui/Spinner'
import { CUSTOMER_CANCELLABLE_STATES } from '../../lib/constants'
import { useWhatsAppUrl } from '../../hooks/useSystemConfig'
import { useMapConfig } from '../../hooks/useMapConfig'
import { OrderMapView } from '../../components/dashboard/OrderMapView'

const fmt = (v) =>
  v ? new Intl.NumberFormat('pt-MZ', { style:'currency', currency:'MZN', minimumFractionDigits:2 }).format(v) : '—'

const fmtDate = (iso) =>
  iso ? new Date(iso).toLocaleString('pt-MZ', { day:'2-digit', month:'short', year:'numeric', hour:'2-digit', minute:'2-digit' }) : '—'

const STATUS_LABELS = {
  NEW:'Pedido recebido', PRESCRIPTION_PENDING:'A aguardar receita',
  IN_VALIDATION:'Em validação', AWAITING_PHARMACY:'A confirmar disponibilidade',
  AWAITING_CLIENT:'A aguardar a sua confirmação', CONFIRMED:'Confirmado',
  IN_PREPARATION:'Em preparação', IN_DELIVERY:'Em entrega',
  DELIVERED:'Entregue', CANCELLED:'Cancelado',
}
const PAY_LABELS = { MPESA:'M-Pesa', EMOLA:'e-Mola', CASH_ON_DELIVERY:'Dinheiro na entrega', POS:'POS' }

function WhatsAppIcon() {
  return <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24" aria-hidden="true"><path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884"/></svg>
}

function StatusPill({ status }) {
  const tones = {
    DELIVERED:'bg-green-50 text-green-700 border-green-200',
    CANCELLED:'bg-red-50 text-red-700 border-red-200',
    AWAITING_CLIENT:'bg-orange-50 text-orange-700 border-orange-200',
    CONFIRMED:'bg-teal-50 text-teal-700 border-teal-200',
    IN_DELIVERY:'bg-cyan-50 text-cyan-700 border-cyan-200',
  }
  return (
    <span className={`inline-flex items-center rounded-full border px-3 py-1 text-xs font-bold ${tones[status] || 'bg-slate-50 text-slate-700 border-slate-200'}`}>
      {STATUS_LABELS[status] || status}
    </span>
  )
}

export function TrackingPage() {
  const { token } = useParams()
  const waUrl = useWhatsAppUrl()
  const { data: mapConfig } = useMapConfig()

  const { data: order, isLoading, isError, dataUpdatedAt } = useQuery({
    queryKey: ['tracking', token],
    queryFn: async () => {
      const { data, error } = await supabase.rpc('get_order_by_token', { p_token: token })
      if (error) throw error
      const row = Array.isArray(data) ? data[0] : data
      if (!row) throw new Error('not_found')
      return row
    },
    refetchInterval: 30000,
    retry: 1,
  })

  const WaButton = ({ className = '', label }) => {
    if (!waUrl) return null
    return (
      <a href={waUrl} target="_blank" rel="noopener noreferrer" className={className}>
        <WhatsAppIcon />{label}
      </a>
    )
  }

  if (isLoading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[70svh] gap-4">
        <Spinner size="lg" />
        <p className="text-sm text-slate-400 font-medium">A carregar o estado do pedido...</p>
      </div>
    )
  }

  if (isError || !order) {
    return (
      <div className="page-wrap-xs py-20 text-center">
        <div className="w-20 h-20 bg-slate-100 rounded-[1.75rem] flex items-center justify-center mx-auto mb-5">
          <svg className="w-10 h-10 text-slate-400" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-4.35-4.35M17 11A6 6 0 115 11a6 6 0 0112 0z" /></svg>
        </div>
        <h1 className="text-xl font-extrabold text-slate-900 mb-2">Pedido não encontrado</h1>
        <p className="text-slate-500 text-sm mb-8 max-w-xs mx-auto">Verifique o link ou fale com a equipa para confirmar o estado do pedido.</p>
        <div className="space-y-3 max-w-xs mx-auto">
          <Link to="/" className="btn-secondary-lg w-full justify-center">Voltar ao início</Link>
          {waUrl && (
            <WaButton
              className="w-full inline-flex items-center justify-center gap-2 rounded-xl bg-green-500 px-5 py-3 text-white font-semibold hover:bg-green-600 transition-colors"
              label="Falar no WhatsApp"
            />
          )}
        </div>
      </div>
    )
  }

  const canCancel = CUSTOMER_CANCELLABLE_STATES.includes(order.status)
  const isDelivered = order.status === 'DELIVERED'
  const isCancelled = order.status === 'CANCELLED'
  const isInDelivery = order.status === 'IN_DELIVERY'

  const statusHistory = (() => {
    try { return Array.isArray(order.status_history) ? order.status_history : JSON.parse(order.status_history || '[]') }
    catch { return [] }
  })()

  const hasMap = order.delivery_lat && order.delivery_lng && mapConfig

  return (
    <div className="min-h-[82svh] bg-[linear-gradient(180deg,#f8fffe_0%,#ffffff_30%,#ffffff_100%)]">
      <div className="page-wrap-xs py-8 pb-safe">
        <Link to="/" className="inline-flex items-center gap-1.5 text-sm text-slate-400 hover:text-slate-700 mb-6 transition-colors font-medium">
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" /></svg>
          Início
        </Link>

        {isDelivered && (
          <div className="rounded-[1.75rem] p-6 mb-5 text-white text-center shadow-lg bg-[linear-gradient(135deg,#14b8a6_0%,#0d9488_100%)]">
            <p className="text-xl md:text-2xl font-extrabold">Entrega concluída</p>
            <p className="text-sm text-teal-100 mt-1">Obrigado por confiar na MedGo.</p>
          </div>
        )}

        {isInDelivery && (
          <div className="rounded-[1.75rem] p-5 mb-5 text-white bg-[linear-gradient(135deg,#0891b2_0%,#0e7490_100%)]">
            <div className="flex items-center gap-3">
              <span className="w-2.5 h-2.5 rounded-full bg-white animate-pulse2 shrink-0" />
              <div>
                <p className="font-extrabold">O seu pedido está a caminho</p>
                <p className="text-sm text-cyan-100 mt-0.5">O motoboy encontra-se em rota para a sua morada.</p>
              </div>
            </div>
          </div>
        )}

        <div className="mb-5">
          <h1 className="text-2xl font-extrabold text-slate-950 tracking-tight">Acompanhar pedido</h1>
          <p className="text-sm text-slate-500 mt-1">Estado actual e próximos passos do processo.</p>
        </div>

        {/* Order summary card */}
        <div className="card-lg p-5 md:p-6 mb-4 border border-slate-200">
          <div className="flex items-start justify-between gap-4 mb-5 pb-5 border-b border-slate-100">
            <div className="min-w-0">
              <p className="text-xs font-extrabold uppercase tracking-widest text-slate-400 mb-1">Medicamento</p>
              <h2 className="font-extrabold text-slate-950 text-lg leading-tight break-words">{order.medication_name_snapshot}</h2>
            </div>
            <StatusPill status={order.status} />
          </div>

          <div className="grid grid-cols-2 gap-x-4 gap-y-4">
            <div>
              <p className="text-xs text-slate-400 mb-1">Pedido criado em</p>
              <p className="text-sm font-semibold text-slate-700">{fmtDate(order.created_at)}</p>
            </div>
            <div>
              <p className="text-xs text-slate-400 mb-1">Forma de pagamento</p>
              <p className="text-sm font-semibold text-slate-700">{PAY_LABELS[order.payment_method] || '—'}</p>
            </div>
            <div>
              <p className="text-xs text-slate-400 mb-1">Taxa de entrega</p>
              <p className="text-sm font-semibold text-slate-700">{fmt(order.delivery_fee)}</p>
            </div>
            <div>
              <p className="text-xs text-slate-400 mb-1">Total</p>
              <p className="text-sm font-semibold text-slate-700">{order.total_price ? fmt(order.total_price) : 'A confirmar'}</p>
            </div>
            {order.zone_name && (
              <div className="col-span-2">
                <p className="text-xs text-slate-400 mb-1">Zona de entrega</p>
                <p className="text-sm font-semibold text-slate-700">{order.zone_name}</p>
              </div>
            )}
          </div>
        </div>

        {/* Mini map — shows delivery location */}
        {hasMap && (
          <div className="card-lg p-5 mb-4 border border-slate-200">
            <p className="text-xs font-extrabold uppercase tracking-widest text-slate-400 mb-3">Localização de entrega</p>
            <OrderMapView
              refLat={mapConfig.lat}
              refLng={mapConfig.lng}
              refLabel={mapConfig.label}
              clientLat={parseFloat(order.delivery_lat)}
              clientLng={parseFloat(order.delivery_lng)}
              distanceKm={order.delivery_distance_km}
              zoneName={order.zone_name}
            />
          </div>
        )}

        {/* Timeline */}
        <div className="card-lg p-5 md:p-6 mb-4 border border-slate-200">
          <p className="text-xs font-extrabold uppercase tracking-widest text-slate-400 mb-4">Histórico do pedido</p>
          <TrackingTimeline currentStatus={order.status} statusHistory={statusHistory} />
        </div>

        {/* Cancellation reason */}
        {isCancelled && order.cancellation_reason && (
          <div className="rounded-2xl border border-red-200 bg-red-50 p-4 mb-4">
            <p className="text-sm font-bold text-red-700 mb-1">Motivo do cancelamento</p>
            <p className="text-sm text-red-600 leading-relaxed">{order.cancellation_reason}</p>
          </div>
        )}

        {/* Price confirmation CTA */}
        {order.status === 'AWAITING_CLIENT' && (
          <div className="rounded-2xl border border-orange-200 bg-orange-50 p-5 mb-4">
            <p className="text-sm font-bold text-orange-800 mb-2">Aguardamos a sua confirmação</p>
            <p className="text-sm text-orange-700 leading-relaxed mb-4">
              O preço final foi preparado pela equipa. Fale connosco no WhatsApp para confirmar e avançar com a entrega.
            </p>
            {waUrl && (
              <a href={waUrl} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-2 rounded-xl bg-orange-500 px-5 py-2.5 text-white text-sm font-semibold hover:bg-orange-600 transition-colors">
                <WhatsAppIcon /> Confirmar via WhatsApp
              </a>
            )}
          </div>
        )}

        {/* Delivered summary */}
        {isDelivered && order.total_price && (
          <div className="card p-5 mb-4 border border-slate-200">
            <p className="text-xs font-extrabold uppercase tracking-widest text-slate-400 mb-3">Resumo do pagamento</p>
            <div className="space-y-2 text-sm">
              {order.medication_price && (
                <div className="flex justify-between text-slate-600"><span>Medicamento</span><span className="font-semibold">{fmt(order.medication_price)}</span></div>
              )}
              <div className="flex justify-between text-slate-600"><span>Entrega</span><span className="font-semibold">{fmt(order.delivery_fee)}</span></div>
              <div className="flex justify-between border-t border-slate-100 pt-2 mt-1 font-extrabold text-slate-950">
                <span>Total pago</span><span className="text-teal-700">{fmt(order.total_price)}</span>
              </div>
            </div>
          </div>
        )}

        {dataUpdatedAt && (
          <p className="text-xs text-center text-slate-400 mb-4 font-medium">
            Última actualização: {fmtDate(new Date(dataUpdatedAt).toISOString())}
          </p>
        )}

        {/* Bottom actions */}
        <div className="space-y-3">
          {waUrl && (
            <a href={waUrl} target="_blank" rel="noopener noreferrer" className="w-full inline-flex items-center justify-center gap-2 rounded-2xl bg-green-500 px-6 py-4 text-white font-semibold hover:bg-green-600 transition-colors">
              <WhatsAppIcon /> Falar com a MedGo no WhatsApp
            </a>
          )}
          {canCancel && (
            <Link to={`/cancelar/${token}`} className="w-full inline-flex items-center justify-center rounded-xl px-5 py-3 text-red-600 font-semibold hover:bg-red-50 transition-colors">
              Cancelar pedido
            </Link>
          )}
          {(isDelivered || isCancelled) && (
            <Link to="/medicamentos" className="btn-secondary-lg w-full justify-center">Fazer novo pedido</Link>
          )}
        </div>
      </div>
    </div>
  )
}
