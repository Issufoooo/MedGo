import { useState, useEffect } from 'react'
import { Link, useNavigate, useParams } from 'react-router-dom'
import { useQueryClient } from '@tanstack/react-query'
import { useOrderDetail, useUpdateStatus } from '../../hooks/useOrders'
import { useAuthStore } from '../../store/authStore'
import { useNotificationStore } from '../../store/notificationStore'
import { StatusBadge } from '../../components/ui/Badge'
import { Alert } from '../../components/ui/Alert'
import { Modal } from '../../components/ui/Modal'
import { Spinner } from '../../components/ui/Spinner'
import { BlacklistAlert } from '../../components/dashboard/BlacklistAlert'
import { OrderStatusTimeline } from '../../components/dashboard/OrderStatusTimeline'
import { OrderMapView } from '../../components/dashboard/OrderMapView'
import { confirmPaymentManually } from '../../services/paymentService'
import { buildTrackingUrl, sendNotification } from '../../services/notificationService'
import { confirmPharmacyAndPrice, updateOrderStatus } from '../../services/orderService'
import { requestCancellation } from '../../services/cancellationService'
import {
  getPrescriptionSignedUrl,
  approvePrescription,
  rejectPrescription,
} from '../../services/prescriptionService'
import { supabase } from '../../lib/supabase'
import { ORDER_STATUS, REQUIRES_OWNER_APPROVAL } from '../../lib/constants'
import { useMedicationAvailability } from '../../hooks/useInventory'
import { useMapConfig } from '../../hooks/useMapConfig'

const fmt = (v) =>
  v != null
    ? new Intl.NumberFormat('pt-MZ', {
        style: 'currency',
        currency: 'MZN',
        minimumFractionDigits: 2,
      }).format(v)
    : '—'

const PAY_LABELS = {
  MPESA: 'M-Pesa',
  EMOLA: 'e-Mola',
  CASH_ON_DELIVERY: 'Dinheiro na entrega',
  POS: 'POS',
}

const PAY_STATUS_LABELS = {
  PENDING: 'Pendente',
  CONFIRMED: 'Confirmado',
  FAILED: 'Falhou',
  REFUNDED: 'Reembolsado',
}

function WaIcon() {
  return (
    <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24">
      <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z" />
    </svg>
  )
}

function BackIcon() {
  return (
    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
    </svg>
  )
}

function Section({ title, action, children }) {
  return (
    <div className="card p-5">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-xs font-extrabold uppercase tracking-widest text-slate-400">
          {title}
        </h3>
        {action}
      </div>
      {children}
    </div>
  )
}

function InfoRow({ label, value, mono, highlight }) {
  return (
    <div className="flex items-start justify-between gap-4 py-2.5 border-b border-slate-50 last:border-0">
      <span className="text-xs text-slate-400 shrink-0 mt-0.5">{label}</span>
      <span
        className={`text-sm text-right min-w-0 break-words ${
          mono
            ? 'font-mono text-xs text-slate-600'
            : highlight
              ? 'font-extrabold text-teal-700 text-base'
              : 'font-semibold text-slate-800'
        }`}
      >
        {value || '—'}
      </span>
    </div>
  )
}

function StockAvailabilityPanel({ medicationId, onSelectPharmacy }) {
  const { data: availability = [], isLoading } = useMedicationAvailability(medicationId)

  if (!medicationId) return null

  if (isLoading) {
    return (
      <div className="p-3 bg-slate-50 rounded-xl border border-slate-100">
        <div className="flex items-center gap-2 text-xs text-slate-400">
          <div className="w-3 h-3 rounded-full border border-teal-400 border-t-transparent animate-spin" />
          A verificar stock nas farmácias...
        </div>
      </div>
    )
  }

  if (availability.length === 0) {
    return (
      <div className="p-3 bg-amber-50 rounded-xl border border-amber-200">
        <p className="text-xs font-semibold text-amber-700">
          Sem dados de stock disponíveis para este medicamento.
        </p>
        <p className="text-xs text-amber-600 mt-0.5">
          Confirme directamente com a farmácia antes de avançar.
        </p>
      </div>
    )
  }

  return (
    <div className="rounded-xl border border-slate-100 overflow-hidden">
      <div className="px-3 py-2 bg-slate-50 border-b border-slate-100">
        <p className="text-xs font-extrabold text-slate-500 uppercase tracking-wide">
          Stock disponível nas farmácias
        </p>
      </div>
      <div className="divide-y divide-slate-50">
        {availability.map((a) => {
          const isGood = a.status === 'IN_STOCK'
          const isLow = a.status === 'LOW_STOCK'

          return (
            <button
              key={a.pharmacy_id}
              type="button"
              onClick={() => onSelectPharmacy(a.pharmacy_id)}
              className="w-full flex items-center justify-between px-3 py-2.5 hover:bg-teal-50/50 transition-colors text-left"
            >
              <div className="flex-1 min-w-0">
                <p className="text-sm font-semibold text-slate-800 truncate">{a.pharmacy_name}</p>
                {a.pharmacy_address && (
                  <p className="text-xs text-slate-400 truncate">{a.pharmacy_address}</p>
                )}
              </div>

              <div className="flex items-center gap-3 shrink-0 ml-3">
                {a.unit_price && (
                  <span className="text-xs font-semibold text-slate-500">
                    {new Intl.NumberFormat('pt-MZ', {
                      style: 'currency',
                      currency: 'MZN',
                      minimumFractionDigits: 0,
                    }).format(a.unit_price)}
                  </span>
                )}

                <div
                  className={`inline-flex items-center gap-1.5 px-2 py-1 rounded-full text-xs font-semibold ${
                    isGood
                      ? 'bg-green-50 text-green-700 border border-green-200'
                      : isLow
                        ? 'bg-amber-50 text-amber-700 border border-amber-200'
                        : 'bg-red-50 text-red-600'
                  }`}
                >
                  <span
                    className={`w-1.5 h-1.5 rounded-full ${
                      isGood ? 'bg-green-500' : isLow ? 'bg-amber-400' : 'bg-red-500'
                    }`}
                  />
                  {a.quantity} un.
                </div>
              </div>
            </button>
          )
        })}
      </div>
    </div>
  )
}

function ConfirmPriceForm({ order, onSuccess }) {
  const { profile } = useAuthStore()
  const notify = useNotificationStore()
  const qc = useQueryClient()

  const [pharmacyId, setPharmacyId] = useState(order.pharmacy_id || '')
  const [price, setPrice] = useState('')
  const [loading, setLoading] = useState(false)
  const [pharmacies, setPharmacies] = useState(null)

  useEffect(() => {
    let cancelled = false

    supabase
      .from('pharmacies')
      .select('id,name,address')
      .eq('is_active', true)
      .order('name')
      .then(({ data }) => {
        if (!cancelled) setPharmacies(data || [])
      })

    return () => {
      cancelled = true
    }
  }, [])

  const parsedPrice = parseFloat(price)
  const deliveryFee = parseFloat(order.delivery_fee || 0)
  const totalPreview = !isNaN(parsedPrice) ? parsedPrice + deliveryFee : null

  const handleSubmit = async () => {
    if (!pharmacyId || !price || isNaN(parsedPrice) || parsedPrice <= 0) {
      notify.warning('Seleccione a farmácia e insira um preço válido.')
      return
    }

    setLoading(true)

    try {
      await confirmPharmacyAndPrice({
        orderId: order.id,
        pharmacyId,
        medicationPrice: parsedPrice,
        actorId: profile.id,
        actorRole: profile.role,
      })

      notify.success('Preço confirmado. A aguardar confirmação do cliente via WhatsApp.')
      qc.invalidateQueries({ queryKey: ['order', order.id] })
      qc.invalidateQueries({ queryKey: ['orders'] })
      onSuccess?.()
    } catch (err) {
      notify.error(err.message)
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="space-y-4">
      <Alert type="info">O cliente receberá mensagem WhatsApp com o preço total para confirmar.</Alert>

      <StockAvailabilityPanel medicationId={order.medication_id} onSelectPharmacy={setPharmacyId} />

      <div>
        <label className="label">Farmácia parceira</label>
        {pharmacies === null ? (
          <div className="skeleton h-11 w-full rounded-xl" />
        ) : pharmacies.length === 0 ? (
          <Alert type="warning">
            Sem farmácias activas.{' '}
            <Link to="/dono/farmacias" className="underline font-semibold">
              Adicionar farmácia
            </Link>
          </Alert>
        ) : (
          <select value={pharmacyId} onChange={(e) => setPharmacyId(e.target.value)} className="input">
            <option value="">Seleccionar farmácia...</option>
            {pharmacies.map((p) => (
              <option key={p.id} value={p.id}>
                {p.name}
                {p.address ? ` — ${p.address}` : ''}
              </option>
            ))}
          </select>
        )}
      </div>

      <div>
        <label className="label">Preço do medicamento (MZN)</label>
        <input
          type="number"
          min="0"
          step="0.01"
          value={price}
          onChange={(e) => setPrice(e.target.value)}
          placeholder="Ex: 450.00"
          className="input"
        />
        {totalPreview !== null && (
          <p className="label-hint">
            Total ao cliente:{' '}
            <strong className="text-teal-700">{fmt(totalPreview)}</strong> ({fmt(parsedPrice)} med. +{' '}
            {fmt(deliveryFee)} entrega)
          </p>
        )}
      </div>

      <button
        onClick={handleSubmit}
        disabled={loading || !pharmacyId || !price}
        className="btn-primary w-full"
      >
        {loading && <Spinner size="sm" />}
        Confirmar e notificar cliente
      </button>
    </div>
  )
}

function AssignMotoboyForm({ order, onSuccess }) {
  const { profile } = useAuthStore()
  const notify = useNotificationStore()
  const qc = useQueryClient()

  const [motoboyId, setMotoboyId] = useState('')
  const [motoboys, setMotoboys] = useState(null)
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    let cancelled = false

    supabase
      .from('profiles')
      .select('id,full_name,phone')
      .eq('role', 'motoboy')
      .eq('is_active', true)
      .order('full_name')
      .then(({ data }) => {
        if (!cancelled) setMotoboys(data || [])
      })

    return () => {
      cancelled = true
    }
  }, [])

  const handleAssign = async () => {
    if (!motoboyId) {
      notify.warning('Seleccione um motoboy.')
      return
    }

    setLoading(true)

    try {
      await supabase.from('motoboy_deliveries').insert({
        order_id: order.id,
        motoboy_id: motoboyId,
        assigned_by: profile.id,
      })

      await updateOrderStatus({
        orderId: order.id,
        newStatus: ORDER_STATUS.IN_PREPARATION,
        actorId: profile.id,
        actorRole: profile.role,
        notes: 'Motoboy atribuído',
        extraFields: { assigned_motoboy_id: motoboyId },
      })

      notify.success('Motoboy atribuído. Pedido em preparação.')
      qc.invalidateQueries({ queryKey: ['order', order.id] })
      qc.invalidateQueries({ queryKey: ['orders'] })
      onSuccess?.()
    } catch (err) {
      notify.error(err.message)
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="space-y-4">
      <div>
        <label className="label">Motoboy disponível</label>
        {motoboys === null ? (
          <div className="skeleton h-11 w-full rounded-xl" />
        ) : motoboys.length === 0 ? (
          <Alert type="warning">
            Sem motoboys activos.{' '}
            <Link to="/dono/utilizadores" className="underline font-semibold">
              Gerir utilizadores
            </Link>
          </Alert>
        ) : (
          <select value={motoboyId} onChange={(e) => setMotoboyId(e.target.value)} className="input">
            <option value="">Seleccionar motoboy...</option>
            {motoboys.map((m) => (
              <option key={m.id} value={m.id}>
                {m.full_name}
                {m.phone ? ` · ${m.phone}` : ''}
              </option>
            ))}
          </select>
        )}
      </div>

      <button onClick={handleAssign} disabled={loading || !motoboyId} className="btn-primary w-full">
        {loading && <Spinner size="sm" />}
        Atribuir motoboy
      </button>
    </div>
  )
}

function MarkPaymentForm({ order, onSuccess }) {
  const notify = useNotificationStore()
  const qc = useQueryClient()

  const [reference, setReference] = useState('')
  const [loading, setLoading] = useState(false)

  const handleSubmit = async () => {
    setLoading(true)

    try {
      await confirmPaymentManually({
        orderId: order.id,
        reference: reference.trim() || null,
        notes: 'Confirmado manualmente pelo operador',
      })

      notify.success('Pagamento confirmado com sucesso.')
      qc.invalidateQueries({ queryKey: ['order', order.id] })
      onSuccess?.()
    } catch (err) {
      notify.error(err.message)
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="space-y-4">
      <Alert type="info">
        Confirme que o pagamento foi recebido via{' '}
        {order.payment_method === 'MPESA' ? 'M-Pesa' : 'e-Mola'}.
        Opcional: introduza o ID da transacção para rastreabilidade.
      </Alert>

      <div>
        <label className="label">
          ID / Referência da transacção{' '}
          <span className="text-slate-400 font-normal">(opcional)</span>
        </label>
        <input
          type="text"
          value={reference}
          onChange={(e) => setReference(e.target.value)}
          placeholder="Ex: MPH01234567890"
          className="input font-mono"
        />
      </div>

      <button onClick={handleSubmit} disabled={loading} className="btn-primary w-full">
        {loading ? (
          <>
            <Spinner size="sm" /> A confirmar...
          </>
        ) : (
          'Confirmar pagamento recebido'
        )}
      </button>
    </div>
  )
}

function CancelForm({ order, onSuccess }) {
  const { profile } = useAuthStore()
  const notify = useNotificationStore()

  const [reason, setReason] = useState('')
  const [loading, setLoading] = useState(false)

  const needsApproval = REQUIRES_OWNER_APPROVAL.includes(order.status)

  const handleSubmit = async () => {
    if (!reason.trim()) {
      notify.warning('Insira o motivo do cancelamento.')
      return
    }

    setLoading(true)

    try {
      const result = await requestCancellation({
        orderId: order.id,
        requestedBy: profile.id,
        reason,
      })

      result.immediate
        ? notify.success('Pedido cancelado.')
        : notify.success('Pedido de cancelamento enviado ao proprietário.')

      onSuccess?.()
    } catch (err) {
      notify.error(err.message)
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="space-y-4">
      {needsApproval && (
        <Alert type="warning" title="Requer aprovação">
          Estado avançado — cancelamento será enviado ao proprietário para decisão.
        </Alert>
      )}

      <div>
        <label className="label">Motivo do cancelamento</label>
        <textarea
          rows={3}
          value={reason}
          onChange={(e) => setReason(e.target.value)}
          placeholder="Descreva o motivo com clareza..."
          className="input resize-none"
        />
      </div>

      <button onClick={handleSubmit} disabled={loading || !reason.trim()} className="btn-danger w-full">
        {loading && <Spinner size="sm" />}
        {needsApproval ? 'Solicitar ao proprietário' : 'Cancelar pedido'}
      </button>
    </div>
  )
}

export function OrderDetailPage() {
  const { orderId } = useParams()
  const navigate = useNavigate()
  const { profile } = useAuthStore()
  const notify = useNotificationStore()
  const qc = useQueryClient()

  const { data: order, isLoading, isError } = useOrderDetail(orderId)
  const { data: mapConfig } = useMapConfig()
  const updateStatusMutation = useUpdateStatus()

  const [modal, setModal] = useState(null)
  const [rxUrl, setRxUrl] = useState(null)
  const [rxLoading, setRxLoading] = useState(false)

  const handleViewRx = async () => {
    if (!order?.id) return

    setRxLoading(true)

    try {
      const url = await getPrescriptionSignedUrl(order.id)

      if (!url) {
        notify.warning('Receita não disponível ou já eliminada.')
        return
      }

      setRxUrl(url)
      setModal('rx')
    } catch {
      notify.error('Não foi possível carregar a receita.')
    } finally {
      setRxLoading(false)
    }
  }

  const handleApproveRx = async () => {
    try {
      await approvePrescription({
        orderId: order.id,
        reviewedBy: profile.id,
        reviewedByRole: profile.role,
      })

      await updateStatusMutation.mutateAsync({
        orderId: order.id,
        newStatus: ORDER_STATUS.IN_VALIDATION,
        actorId: profile.id,
        actorRole: profile.role,
        notes: 'Receita aprovada',
      })

      notify.success('Receita aprovada. Pedido em validação.')
      setModal(null)
    } catch (err) {
      notify.error(err.message)
    }
  }

  const handleRejectRx = async () => {
    try {
      await rejectPrescription({
        orderId: order.id,
        reviewedBy: profile.id,
        reviewedByRole: profile.role,
        rejectReason: 'Receita ilegível ou inválida',
        status: 'REJECTED_UNREADABLE',
      })

      notify.warning('Receita rejeitada. O cliente será notificado.')
      setModal(null)
    } catch (err) {
      notify.error(err.message)
    }
  }

  const handleAdvance = async (newStatus, notes) => {
    try {
      await updateStatusMutation.mutateAsync({
        orderId: order.id,
        newStatus,
        actorId: profile.id,
        actorRole: profile.role,
        notes,
      })

      notify.success('Estado actualizado.')
    } catch (err) {
      notify.error(err.message)
    }
  }

  if (isLoading) {
    return (
      <div className="flex h-full items-center justify-center py-24">
        <div className="flex flex-col items-center gap-3">
          <Spinner size="xl" />
          <p className="text-sm text-slate-400">A carregar pedido...</p>
        </div>
      </div>
    )
  }

  if (isError || !order) {
    return (
      <div className="max-w-lg mx-auto py-16 px-4 text-center">
        <div className="w-16 h-16 rounded-2xl bg-slate-100 flex items-center justify-center mx-auto mb-4">
          <svg className="w-8 h-8 text-slate-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={1.5}
              d="M21 21l-4.35-4.35M17 11A6 6 0 115 11a6 6 0 0112 0z"
            />
          </svg>
        </div>

        <h1 className="text-xl font-extrabold text-slate-900 mb-2">Pedido não encontrado</h1>
        <p className="text-sm text-slate-500 mb-6">O pedido pode ter sido removido ou o ID é inválido.</p>

        <Link to="/dashboard" className="btn-secondary">
          ← Voltar aos pedidos
        </Link>
      </div>
    )
  }

  const isTerminal = ['DELIVERED', 'CANCELLED'].includes(order.status)
  const canViewRx = order.prescription_status && order.prescription_status !== 'EXPIRED'
  const historyOrdered = [...(order.status_history || [])].sort(
    (a, b) => new Date(b.created_at) - new Date(a.created_at)
  )

  return (
    <div className="max-w-4xl mx-auto px-4 md:px-6 py-6 pb-12 space-y-4">
      <div className="flex items-center justify-between gap-3">
        <button
          onClick={() => navigate(-1)}
          className="inline-flex items-center gap-1.5 text-sm font-medium text-slate-400 hover:text-slate-700 transition-colors"
        >
          <BackIcon /> Pedidos
        </button>

        <StatusBadge status={order.status} />
      </div>

      {order.customer?.is_blacklisted && (
        <BlacklistAlert
          entry={{
            severity: order.customer.blacklist_severity || 'HIGH',
            reason: order.customer.blacklist_reason || 'Cliente em lista negra',
            created_at: order.customer.blacklist_date,
          }}
        />
      )}

      {order.status === 'CONFIRMED' && order.payment_status === 'PENDING' && (
        <Alert type="warning" title="Pagamento pendente">
          Pedido confirmado mas pagamento ainda por receber. Verificar antes de despachar.
        </Alert>
      )}

      <div className="grid gap-4 md:grid-cols-2">
        <Section title="Medicamento">
          <InfoRow label="Nome" value={order.medication_name_snapshot} />
          <InfoRow label="Categoria" value={order.medication?.category} />
          {order.medication_price != null && <InfoRow label="Preço med." value={fmt(order.medication_price)} />}
          {order.delivery_fee != null && <InfoRow label="Taxa entrega" value={fmt(order.delivery_fee)} />}

          {order.total_price != null && (
            <div className="mt-3 pt-3 border-t border-slate-100 flex items-center justify-between">
              <span className="text-sm font-semibold text-slate-500">Total</span>
              <span className="text-xl font-extrabold text-teal-700">{fmt(order.total_price)}</span>
            </div>
          )}
        </Section>

        <Section
          title="Cliente"
          action={
            order.customer?.whatsapp_number && (
              <a
                href={`https://wa.me/${order.customer.whatsapp_number.replace(/\D/g, '')}`}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-1.5 text-xs font-semibold text-green-600 hover:text-green-700 transition-colors"
              >
                <WaIcon /> WhatsApp
              </a>
            )
          }
        >
          <InfoRow label="Nome" value={order.customer?.full_name} />
          <InfoRow label="WhatsApp" value={order.customer?.whatsapp_number} mono />
          <InfoRow label="Zona" value={order.zone?.name} />
          <InfoRow label="Morada" value={order.delivery_address} />

          {order.delivery_distance_km && (
            <InfoRow label="Distância" value={`${parseFloat(order.delivery_distance_km).toFixed(1)} km`} />
          )}

          <InfoRow label="Pagamento" value={PAY_LABELS[order.payment_method]} />
          <InfoRow label="Estado pgm." value={PAY_STATUS_LABELS[order.payment_status] || order.payment_status} />

          {order.payment_reference && <InfoRow label="Referência" value={order.payment_reference} mono />}

          {order.delivery_lat && order.delivery_lng && mapConfig && (
            <div className="mt-3 pt-3 border-t border-slate-100">
              <p className="text-xs font-extrabold uppercase tracking-widest text-slate-400 mb-2">Localização</p>
              <OrderMapView
                refLat={mapConfig.lat}
                refLng={mapConfig.lng}
                refLabel={mapConfig.label}
                clientLat={parseFloat(order.delivery_lat)}
                clientLng={parseFloat(order.delivery_lng)}
                distanceKm={order.delivery_distance_km}
                zoneName={order.zone?.name}
              />
            </div>
          )}
        </Section>

        {order.pharmacy && (
          <Section title="Farmácia">
            <InfoRow label="Nome" value={order.pharmacy.name} />
            <InfoRow label="Morada" value={order.pharmacy.address} />
            {order.pharmacy.contact_phone && <InfoRow label="Contacto" value={order.pharmacy.contact_phone} />}
          </Section>
        )}

        {order.motoboy && (
          <Section title="Motoboy">
            <InfoRow label="Nome" value={order.motoboy.full_name} />
            {order.motoboy.phone && <InfoRow label="Telemóvel" value={order.motoboy.phone} />}
          </Section>
        )}
      </div>

      {(order.customer_notes || order.operator_notes) && (
        <Section title="Notas">
          {order.customer_notes && <InfoRow label="Cliente" value={order.customer_notes} />}
          {order.operator_notes && <InfoRow label="Operador" value={order.operator_notes} />}
        </Section>
      )}

      {!isTerminal && (
        <Section title="Acções">
          <div className="grid gap-2 sm:grid-cols-2">
            {canViewRx && (
              <button onClick={handleViewRx} disabled={rxLoading} className="btn-secondary col-span-full w-full">
                {rxLoading ? (
                  <Spinner size="sm" />
                ) : (
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"
                    />
                  </svg>
                )}
                Ver receita médica
              </button>
            )}

            {['MPESA', 'EMOLA'].includes(order.payment_method) &&
              order.payment_status === 'PENDING' &&
              order.status !== 'CANCELLED' && (
                <button
                  onClick={() => setModal('payment')}
                  className="btn-secondary col-span-full w-full border-orange-200 text-orange-700 hover:bg-orange-50"
                >
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"
                    />
                  </svg>
                  Confirmar pagamento recebido
                </button>
              )}

            {order.status === ORDER_STATUS.IN_VALIDATION && (
              <button
                onClick={() => handleAdvance(ORDER_STATUS.AWAITING_PHARMACY, 'Validação concluída')}
                disabled={updateStatusMutation.isPending}
                className="btn-primary col-span-full w-full"
              >
                {updateStatusMutation.isPending ? (
                  <Spinner size="sm" />
                ) : (
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                  </svg>
                )}
                Avançar para confirmação de farmácia
              </button>
            )}

            {order.status === ORDER_STATUS.AWAITING_PHARMACY && (
              <button onClick={() => setModal('price')} className="btn-primary col-span-full w-full">
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M8 7V3m8 4V3M4 11h16M5 21h14a1 1 0 001-1V7a2 2 0 00-2-2H6a2 2 0 00-2 2v13a1 1 0 001 1z"
                  />
                </svg>
                Confirmar farmácia e preço
              </button>
            )}

            {order.status === ORDER_STATUS.AWAITING_CLIENT && (
              <button
                onClick={async () => {
                  try {
                    const trackingUrl = await buildTrackingUrl(order.tracking_token)
                    await sendNotification('price_confirmation', {
                      order,
                      customer: order.customer,
                      trackingUrl,
                    })
                    notify.success('Notificação reenviada ao cliente.')
                  } catch (err) {
                    notify.error(err.message)
                  }
                }}
                className="btn-secondary col-span-full w-full"
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4l16 8-16 8V4z" />
                </svg>
                Reenviar notificação ao cliente
              </button>
            )}

            {order.status === ORDER_STATUS.CONFIRMED && (
              <button onClick={() => setModal('motoboy')} className="btn-primary col-span-full w-full">
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M9 17H6a2 2 0 01-2-2V7a2 2 0 012-2h8a2 2 0 012 2v3m-6 7h5m0 0l-2-2m2 2l-2 2m5-8h2l2 3v4a2 2 0 01-2 2h-1m-13 0a2 2 0 100-4 2 2 0 000 4z"
                  />
                </svg>
                Atribuir motoboy
              </button>
            )}

            <button
              onClick={() => setModal('cancel')}
              className="col-span-full w-full inline-flex items-center justify-center gap-2 px-5 py-2.5 text-sm font-semibold text-red-500 hover:text-red-700 hover:bg-red-50 rounded-xl transition-all"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
              Cancelar pedido
            </button>
          </div>
        </Section>
      )}

      <Section title="Histórico do pedido">
        <OrderStatusTimeline history={historyOrdered} />
      </Section>

      <Modal open={modal === 'rx'} onClose={() => setModal(null)} title="Receita Médica" size="md">
        {rxUrl && (
          <div className="space-y-4">
            {rxUrl.match(/\.pdf(\?|$)/i) ? (
              <a href={rxUrl} target="_blank" rel="noopener noreferrer" className="btn-secondary w-full">
                Abrir PDF
              </a>
            ) : (
              <img
                src={rxUrl}
                alt="Receita médica"
                className="w-full rounded-xl border border-slate-100 max-h-[60vh] object-contain"
              />
            )}

            <Alert type="warning">
              Este link expira em 30 minutos. A receita é eliminada após validação.
            </Alert>

            {order.prescription_status === 'PENDING' && (
              <div className="grid grid-cols-2 gap-3">
                <button onClick={handleRejectRx} className="btn-danger">
                  Rejeitar
                </button>
                <button onClick={handleApproveRx} className="btn-primary">
                  Aprovar
                </button>
              </div>
            )}
          </div>
        )}
      </Modal>

      <Modal open={modal === 'payment'} onClose={() => setModal(null)} title="Confirmar pagamento" size="sm">
        <MarkPaymentForm order={order} onSuccess={() => setModal(null)} />
      </Modal>

      <Modal open={modal === 'price'} onClose={() => setModal(null)} title="Confirmar farmácia e preço" size="md">
        <ConfirmPriceForm order={order} onSuccess={() => setModal(null)} />
      </Modal>

      <Modal open={modal === 'motoboy'} onClose={() => setModal(null)} title="Atribuir motoboy" size="md">
        <AssignMotoboyForm order={order} onSuccess={() => setModal(null)} />
      </Modal>

      <Modal open={modal === 'cancel'} onClose={() => setModal(null)} title="Cancelar pedido" size="md">
        <CancelForm
          order={order}
          onSuccess={() => {
            setModal(null)
            navigate('/dashboard')
          }}
        />
      </Modal>
    </div>
  )
}