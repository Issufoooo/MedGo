import { useState } from 'react'
import { useMyDeliveries, useConfirmPickup, useConfirmDelivery } from '../../hooks/useDeliveries'
import { useNotificationStore } from '../../store/notificationStore'
import { Modal } from '../../components/ui/Modal'
import { Spinner } from '../../components/ui/Spinner'

const fmt = (v) => (v ? new Intl.NumberFormat('pt-MZ',{style:'currency',currency:'MZN',minimumFractionDigits:0}).format(v) : null)
const PAY = { MPESA:'M-Pesa', EMOLA:'e-Mola', CASH_ON_DELIVERY:'Dinheiro na entrega', POS:'POS' }

function PinIcon(){return <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z"/><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z"/></svg>}
function UserIcon(){return <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z"/></svg>}
function MoneyIcon(){return <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z"/></svg>}
function WhatsIcon(){return <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24"><path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884"/></svg>}

function DeliveryCard({ order, onPickup, onDeliver }) {
  const isPreparation = order.status === 'IN_PREPARATION'
  return (
    <div className={`card p-5 border-l-4 ${isPreparation ? 'border-l-indigo-400' : 'border-l-teal-500'}`}>
      <div className="mb-3 flex items-center justify-between gap-3">
        <span className={`inline-flex items-center gap-2 rounded-full px-3 py-1 text-xs font-extrabold ${isPreparation ? 'bg-indigo-50 text-indigo-700' : 'bg-teal-50 text-teal-700'}`}>
          <span className={`h-2 w-2 rounded-full ${isPreparation ? 'bg-indigo-500' : 'bg-teal-500 animate-pulse2'}`} />
          {isPreparation ? 'Recolha pendente' : 'Em entrega'}
        </span>
        <span className="text-xs font-medium text-slate-400">{new Date(order.dispatched_at || order.updated_at).toLocaleTimeString('pt-MZ',{hour:'2-digit',minute:'2-digit'})}</span>
      </div>

      <h3 className="text-base font-extrabold text-slate-900">{order.medication_name_snapshot}</h3>

      <div className="mt-4 space-y-3 rounded-2xl border border-slate-100 bg-slate-50 p-4 text-sm">
        <div className="flex items-start gap-2.5 text-slate-700"><span className="mt-0.5 text-slate-400"><UserIcon /></span><span className="font-semibold">{order.customer?.full_name}</span></div>
        <div className="flex items-start gap-2.5 text-slate-600"><span className="mt-0.5 text-slate-400"><PinIcon /></span><span className="leading-snug">{order.delivery_address || '—'}</span></div>
        <div className="flex items-center gap-2.5 text-slate-600"><span className="text-slate-400"><MoneyIcon /></span><span>{PAY[order.payment_method]} {fmt(order.total_price) && <strong className="ml-2 text-teal-700">{fmt(order.total_price)}</strong>}</span></div>
      </div>

      <div className="mt-4 flex gap-2">
        {order.customer?.whatsapp_number && (
          <a href={`https://wa.me/${order.customer.whatsapp_number.replace(/\D/g,'')}`} target="_blank" rel="noopener noreferrer" className="btn-secondary flex-1 text-sm py-3">
            <WhatsIcon />
            Contactar
          </a>
        )}
        {isPreparation ? (
          <button onClick={() => onPickup(order.id)} className="btn-primary flex-1 text-sm py-3">Recolhi o pedido</button>
        ) : (
          <button onClick={() => onDeliver(order)} className="btn-primary flex-1 text-sm py-3">Confirmar entrega</button>
        )}
      </div>
    </div>
  )
}

export function MotoboyDashboard() {
  const notify = useNotificationStore()
  const { data: deliveries = [], isLoading } = useMyDeliveries()
  const pickupMutation = useConfirmPickup()
  const deliverMutation = useConfirmDelivery()
  const [deliverModal, setDeliverModal] = useState(null)
  const [notes, setNotes] = useState('')

  const handlePickup = async (orderId) => {
    try {
      await pickupMutation.mutateAsync(orderId)
      notify.success('Recolha confirmada com sucesso.')
    } catch (err) {
      notify.error(err.message)
    }
  }

  const handleDeliver = async () => {
    try {
      await deliverMutation.mutateAsync({ orderId: deliverModal.id, notes })
      notify.success('Entrega concluída com sucesso.')
      setDeliverModal(null)
      setNotes('')
    } catch (err) {
      notify.error(err.message)
    }
  }

  const toPickup = deliveries.filter((d) => d.status === 'IN_PREPARATION')
  const inDelivery = deliveries.filter((d) => d.status === 'IN_DELIVERY')

  return (
    <div className="max-w-lg mx-auto px-4 py-6 pb-safe space-y-6">
      <div>
        <h1 className="text-xl font-extrabold text-slate-900">Entregas atribuídas</h1>
        <p className="mt-1 text-sm text-slate-400">Área simples para recolher, contactar o cliente e concluir entregas.</p>
      </div>

      {isLoading ? (
        <div className="flex flex-col items-center justify-center gap-4 py-24"><Spinner size="xl" /><p className="text-sm text-slate-400">A carregar entregas...</p></div>
      ) : deliveries.length === 0 ? (
        <div className="card p-12 text-center">
          <p className="font-extrabold text-slate-700">Sem entregas activas</p>
          <p className="mt-1 text-sm text-slate-400">Assim que uma entrega for atribuída, ela aparecerá aqui.</p>
        </div>
      ) : (
        <>
          {inDelivery.length > 0 && (
            <section className="space-y-3">
              <div className="flex items-center justify-between"><h2 className="text-sm font-extrabold uppercase tracking-widest text-teal-600">Em entrega</h2><span className="text-xs text-slate-400">{inDelivery.length} activa(s)</span></div>
              <div className="space-y-3">{inDelivery.map((order) => <DeliveryCard key={order.id} order={order} onPickup={handlePickup} onDeliver={(o) => { setDeliverModal(o); setNotes('') }} />)}</div>
            </section>
          )}

          {toPickup.length > 0 && (
            <section className="space-y-3">
              <div className="flex items-center justify-between"><h2 className="text-sm font-extrabold uppercase tracking-widest text-indigo-600">Para recolher</h2><span className="text-xs text-slate-400">{toPickup.length} pendente(s)</span></div>
              <div className="space-y-3">{toPickup.map((order) => <DeliveryCard key={order.id} order={order} onPickup={handlePickup} onDeliver={(o) => { setDeliverModal(o); setNotes('') }} />)}</div>
            </section>
          )}
        </>
      )}

      <Modal open={!!deliverModal} onClose={() => setDeliverModal(null)} title="Confirmar entrega">
        {deliverModal && (
          <div className="space-y-4">
            <div className="rounded-2xl border border-teal-100 bg-teal-50 p-4">
              <p className="font-extrabold text-teal-900">{deliverModal.medication_name_snapshot}</p>
              <p className="mt-1 text-sm text-teal-700">Confirme que o cliente recebeu o pedido corretamente antes de concluir.</p>
            </div>
            <div>
              <label className="label">Notas da entrega <span className="text-slate-400 font-normal">(opcional)</span></label>
              <textarea rows={2} value={notes} onChange={(e) => setNotes(e.target.value)} className="input resize-none" placeholder="Ex.: entregue ao cliente, entregue ao segurança, sem observações..." />
            </div>
            <button onClick={handleDeliver} disabled={deliverMutation.isPending} className="btn-primary-lg w-full">
              {deliverMutation.isPending ? <><Spinner size="sm" /> A confirmar...</> : 'Concluir entrega'}
            </button>
          </div>
        )}
      </Modal>
    </div>
  )
}
