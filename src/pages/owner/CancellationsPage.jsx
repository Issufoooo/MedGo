import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { useAuthStore } from '../../store/authStore'
import { useNotificationStore } from '../../store/notificationStore'
import { getPendingCancellations, reviewCancellationRequest } from '../../services/cancellationService'
import { Modal } from '../../components/ui/Modal'
import { Alert } from '../../components/ui/Alert'
import { Spinner } from '../../components/ui/Spinner'
import { StatusBadge } from '../../components/ui/Badge'

const fmtTs = (iso) => iso ? new Date(iso).toLocaleString('pt-MZ', { day:'2-digit', month:'short', hour:'2-digit', minute:'2-digit' }) : '—'

export function CancellationsPage() {
  const { profile } = useAuthStore()
  const notify = useNotificationStore()
  const qc = useQueryClient()
  const [selected, setSelected] = useState(null)
  const [notes, setNotes] = useState('')

  const { data: requests = [], isLoading } = useQuery({
    queryKey: ['cancellation-requests'],
    queryFn: getPendingCancellations,
    refetchInterval: 30000,
  })

  const reviewMutation = useMutation({
    mutationFn: ({ decision }) => reviewCancellationRequest({
      requestId: selected.id,
      reviewedBy: profile.id,
      decision,
      reviewNotes: notes,
    }),
    onSuccess: (_, { decision }) => {
      notify.success(decision === 'APPROVED' ? 'Cancelamento aprovado.' : 'Cancelamento rejeitado.')
      setSelected(null)
      setNotes('')
      qc.invalidateQueries({ queryKey: ['cancellation-requests'] })
      qc.invalidateQueries({ queryKey: ['orders'] })
      qc.invalidateQueries({ queryKey: ['dashboard-stats'] })
    },
    onError: (err) => notify.error(err.message),
  })

  return (
    <div className="max-w-4xl mx-auto px-4 md:px-6 py-6 md:py-8 space-y-6">
      <div className="relative overflow-hidden rounded-[28px] border border-white/10 bg-[linear-gradient(155deg,#0d9488_0%,#0f766e_25%,#0a192f_100%)] px-6 py-7 text-white shadow-lg">
        <div className="absolute inset-0 dot-pattern opacity-60" />
        <div className="relative flex flex-col gap-2 md:flex-row md:items-end md:justify-between">
          <div>
            <p className="text-xs font-extrabold uppercase tracking-[0.22em] text-white/70">Decisões pendentes</p>
            <h1 className="mt-2 text-2xl font-extrabold">Cancelamentos</h1>
            <p className="mt-2 max-w-2xl text-sm text-white/70">Analise os pedidos de cancelamento, leia o motivo enviado pela equipa e aprove ou rejeite com contexto.</p>
          </div>
          <div className="rounded-2xl border border-white/10 bg-white/10 px-4 py-3 backdrop-blur-sm">
            <p className="text-2xl font-extrabold">{requests.length}</p>
            <p className="text-[11px] font-semibold uppercase tracking-wide text-white/65">Pendentes</p>
          </div>
        </div>
      </div>

      {isLoading ? (
        <div className="flex justify-center py-16"><Spinner size="lg" /></div>
      ) : requests.length === 0 ? (
        <div className="card p-14 text-center">
          <p className="font-extrabold text-slate-700">Sem pedidos pendentes</p>
          <p className="mt-1 text-sm text-slate-400">Todos os cancelamentos foram analisados.</p>
        </div>
      ) : (
        <div className="space-y-3">
          {requests.map((req) => (
            <div key={req.id} className="card overflow-hidden">
              <div className="border-l-4 border-orange-400 px-5 py-5">
                <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-center gap-2 mb-2">
                      <p className="font-extrabold text-slate-900">{req.order?.medication_name_snapshot}</p>
                      {req.order?.status && <StatusBadge status={req.order.status} />}
                    </div>
                    <p className="text-sm text-slate-500">Solicitado por <span className="font-semibold text-slate-700">{req.requested_by_profile?.full_name}</span> · {fmtTs(req.created_at)}</p>
                    <div className="mt-3 rounded-2xl border border-slate-100 bg-slate-50 p-4">
                      <p className="text-xs font-extrabold uppercase tracking-widest text-slate-400 mb-1.5">Motivo</p>
                      <p className="text-sm leading-relaxed text-slate-700">{req.reason}</p>
                    </div>
                  </div>
                  <button onClick={() => { setSelected(req); setNotes('') }} className="btn-sm bg-teal-500 text-white hover:bg-teal-600 shrink-0">Rever pedido</button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      <Modal open={!!selected} onClose={() => setSelected(null)} title="Rever cancelamento">
        {selected && (
          <div className="space-y-4">
            <div className="rounded-2xl border border-slate-100 bg-slate-50 p-4">
              <p className="font-extrabold text-slate-900">{selected.order?.medication_name_snapshot}</p>
              <p className="mt-1 text-sm text-slate-500">Pedido por <span className="font-semibold">{selected.requested_by_profile?.full_name}</span></p>
              <div className="mt-3 rounded-xl border border-slate-100 bg-white p-3">
                <p className="text-xs font-semibold text-slate-500 mb-1">Motivo apresentado</p>
                <p className="text-sm text-slate-700">{selected.reason}</p>
              </div>
            </div>

            <Alert type="warning" title="Antes de decidir">
              Aprovar irá cancelar o pedido e enviar a devida atualização ao cliente. Rejeitar mantém o pedido activo para a equipa operacional.
            </Alert>

            <div>
              <label className="label">Nota para a equipa <span className="text-slate-400 font-normal">(opcional)</span></label>
              <textarea rows={2} value={notes} onChange={(e) => setNotes(e.target.value)} className="input resize-none" placeholder="Ex.: aprovar por indisponibilidade, rejeitar e continuar o processamento..." />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <button onClick={() => reviewMutation.mutate({ decision: 'REJECTED' })} disabled={reviewMutation.isPending} className="btn-secondary">
                {reviewMutation.isPending ? <Spinner size="sm" /> : 'Rejeitar'}
              </button>
              <button onClick={() => reviewMutation.mutate({ decision: 'APPROVED' })} disabled={reviewMutation.isPending} className="btn-danger">
                {reviewMutation.isPending ? <Spinner size="sm" /> : 'Aprovar cancelamento'}
              </button>
            </div>
          </div>
        )}
      </Modal>
    </div>
  )
}
