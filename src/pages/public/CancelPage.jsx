import { useState } from 'react'
import { useParams, useNavigate, Link } from 'react-router-dom'
import { useQuery } from '@tanstack/react-query'
import { supabase } from '../../lib/supabase'
import { Spinner } from '../../components/ui/Spinner'
import { Alert } from '../../components/ui/Alert'
import { CUSTOMER_CANCELLABLE_STATES } from '../../lib/constants'
import { auditLog } from '../../services/auditService'
import { sendNotification } from '../../services/notificationService'
import { useWhatsAppUrl } from '../../hooks/useSystemConfig'

function WarningIcon() {
  return (
    <svg className="w-10 h-10 text-orange-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"/>
    </svg>
  )
}

export function CancelPage() {
  const { token } = useParams()
  const navigate = useNavigate()
  const [cancelling, setCancelling] = useState(false)
  const [error, setError] = useState('')
  const waUrl = useWhatsAppUrl()

  const { data: order, isLoading } = useQuery({
    queryKey: ['cancel-tracking', token],
    queryFn: async () => {
      const { data, error } = await supabase.rpc('get_order_by_token', { p_token: token })
      if (error) throw error
      const row = Array.isArray(data) ? data[0] : data
      if (!row) throw new Error('not_found')
      return row
    },
    retry: 1,
  })

  const handleCancel = async () => {
    setCancelling(true); setError('')
    try {
      const { data: fullOrder } = await supabase
        .from('orders')
        .select('id, status, customer:customers(full_name, whatsapp_number)')
        .eq('tracking_token', token).single()

      if (!fullOrder) throw new Error('Pedido não encontrado.')
      if (!CUSTOMER_CANCELLABLE_STATES.includes(fullOrder.status)) {
        setError('Este pedido já não pode ser cancelado — está em processamento.')
        return
      }

      const reason = 'Cancelado pelo cliente'
      await supabase.from('orders').update({ status:'CANCELLED', cancellation_reason: reason }).eq('tracking_token', token)
      await supabase.from('order_status_history').insert({ order_id: fullOrder.id, from_status: fullOrder.status, to_status:'CANCELLED', notes: reason })
      await auditLog({ action:'ORDER_CANCELLED_BY_CUSTOMER', entityType:'order', entityId: fullOrder.id, metadata:{ reason } })
      await sendNotification('order_cancelled', { order:{ ...fullOrder, cancellation_reason: reason }, customer: fullOrder.customer })
      navigate(`/acompanhar/${token}`)
    } catch (err) {
      setError(err.message || 'Não foi possível cancelar o pedido. Tente novamente.')
    } finally { setCancelling(false) }
  }

  if (isLoading) return <div className="flex justify-center py-24"><Spinner size="lg" /></div>

  const canCancel = order && CUSTOMER_CANCELLABLE_STATES.includes(order.status)

  return (
    <div className="page-wrap-sm py-16">
      <div className="card p-8 max-w-sm mx-auto">
        <div className="text-center mb-6">
          <div className="w-16 h-16 rounded-2xl bg-orange-50 flex items-center justify-center mx-auto mb-3">
            <WarningIcon />
          </div>
          <h1 className="text-xl font-extrabold text-slate-900">Cancelar pedido</h1>
        </div>

        {error && <Alert type="error" className="mb-4">{error}</Alert>}

        {!canCancel ? (
          <div className="space-y-4">
            <Alert type="warning" title="Não é possível cancelar">
              Este pedido já está em processamento avançado e não pode ser cancelado pelo cliente. Contacte-nos via WhatsApp.
            </Alert>
            {waUrl && (
              <a href={waUrl} target="_blank" rel="noopener noreferrer"
                className="w-full inline-flex items-center justify-center gap-2 rounded-xl bg-green-500 px-5 py-3 text-white font-semibold hover:bg-green-600 transition-colors">
                Falar no WhatsApp
              </a>
            )}
            <Link to={`/acompanhar/${token}`} className="btn-secondary w-full py-3 flex justify-center">← Voltar</Link>
          </div>
        ) : (
          <div className="space-y-4">
            <div className="p-4 bg-slate-50 rounded-xl text-sm text-slate-600">
              <p className="font-bold text-slate-800 mb-1">{order?.medication_name_snapshot}</p>
              <p>Tem a certeza que deseja cancelar este pedido? Esta acção não pode ser desfeita.</p>
            </div>
            <Alert type="warning">O pedido será cancelado permanentemente.</Alert>
            <button onClick={handleCancel} disabled={cancelling} className="btn-danger-lg w-full">
              {cancelling ? <><Spinner size="sm" /> A cancelar...</> : 'Sim, cancelar pedido'}
            </button>
            <Link to={`/acompanhar/${token}`} className="flex justify-center w-full py-3 text-slate-500 text-sm hover:text-slate-800 font-medium transition-colors">
              ← Voltar sem cancelar
            </Link>
          </div>
        )}
      </div>
    </div>
  )
}
