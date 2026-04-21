import { useState } from 'react'
import { useParams, useNavigate, Link } from 'react-router-dom'
import { useQuery } from '@tanstack/react-query'
import { supabase } from '../../lib/supabase'
import { ZoneSelector } from '../../components/public/ZoneSelector'
import { PrescriptionUpload } from '../../components/public/PrescriptionUpload'
import { CategoryBadge } from '../../components/ui/Badge'
import { Alert } from '../../components/ui/Alert'
import { Spinner } from '../../components/ui/Spinner'
import { upsertCustomer } from '../../services/customerService'
import { uploadPrescription } from '../../services/prescriptionService'
import { sendNotification, buildTrackingUrl } from '../../services/notificationService'
import { auditLog } from '../../services/auditService'
import { PAYMENT_METHOD, ORDER_STATUS } from '../../lib/constants'

const PAYMENT_OPTIONS = [
  { value: PAYMENT_METHOD.CASH_ON_DELIVERY, label: 'Dinheiro na entrega', desc: 'O pagamento é feito no momento da entrega.' },
  { value: PAYMENT_METHOD.MPESA, label: 'M-Pesa', desc: 'Pagamento móvel através do M-Pesa.' },
  { value: PAYMENT_METHOD.EMOLA, label: 'e-Mola', desc: 'Pagamento móvel através do e-Mola.' },
]

const fmt = (v) =>
  new Intl.NumberFormat('pt-MZ', {
    style: 'currency',
    currency: 'MZN',
    minimumFractionDigits: 0,
  }).format(v || 0)

function Field({ label, required, error, hint, children }) {
  return (
    <div>
      <label className="label">
        {label}
        {required && <span className="text-red-500 ml-0.5">*</span>}
      </label>
      {children}
      {hint && !error && <p className="label-hint">{hint}</p>}
      {error && (
        <p className="field-error">
          <svg className="w-3 h-3 shrink-0" fill="currentColor" viewBox="0 0 20 20" aria-hidden="true">
            <path
              fillRule="evenodd"
              d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7 4a1 1 0 11-2 0 1 1 0 012 0zm-1-9a1 1 0 00-1 1v4a1 1 0 102 0V6a1 1 0 00-1-1z"
              clipRule="evenodd"
            />
          </svg>
          {error}
        </p>
      )}
    </div>
  )
}

function ClipboardIcon() {
  return (
    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
    </svg>
  )
}

export function OrderPage() {
  const { medicationId } = useParams()
  const navigate = useNavigate()

  const [form, setForm] = useState({
    fullName: '',
    whatsapp: '',
    zoneId: '',
    deliveryFee: 0,
    address: '',
    notes: '',
    paymentMethod: PAYMENT_METHOD.CASH_ON_DELIVERY,
  })

  const [prescriptionFile, setPrescriptionFile] = useState(null)
  const [errors, setErrors] = useState({})
  const [submitting, setSubmitting] = useState(false)
  const [submitError, setSubmitError] = useState('')

  const { data: medication, isLoading, isError } = useQuery({
    queryKey: ['medication', medicationId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('medications')
        .select('*')
        .eq('id', medicationId)
        .eq('is_visible', true)
        .single()

      if (error) throw error
      return data
    },
  })

  const set = (field, val) => {
    setForm((f) => ({ ...f, [field]: val }))
    setErrors((e) => ({ ...e, [field]: '' }))
  }

  const validate = () => {
    const e = {}

    if (!form.fullName.trim()) e.fullName = 'Campo obrigatório'
    if (!form.whatsapp.trim()) e.whatsapp = 'Campo obrigatório'
    else if (!/^[\d\s+\-()]{8,}$/.test(form.whatsapp)) e.whatsapp = 'Número inválido'
    if (!form.zoneId) e.zoneId = 'Seleccione a zona de entrega'
    if (!form.address.trim()) e.address = 'Campo obrigatório'
    if (medication?.requires_prescription && !prescriptionFile) {
      e.prescription = 'A receita médica é obrigatória para este medicamento'
    }

    return e
  }

  const handleSubmit = async (evt) => {
    evt.preventDefault()

    const errs = validate()
    if (Object.keys(errs).length) {
      setErrors(errs)
      window.scrollTo({ top: 0, behavior: 'smooth' })
      return
    }

    setSubmitting(true)
    setSubmitError('')

    try {
      const { customer } = await upsertCustomer({
        fullName: form.fullName,
        whatsappNumber: form.whatsapp,
        addressNotes: form.address,
        zoneId: form.zoneId,
      })

      const needsRx = medication.requires_prescription
      const initialStatus = needsRx ? ORDER_STATUS.PRESCRIPTION_PENDING : ORDER_STATUS.IN_VALIDATION

      const { data: order, error: orderErr } = await supabase
        .from('orders')
        .insert({
          customer_id: customer.id,
          medication_id: medicationId,
          medication_name_snapshot: medication.commercial_name,
          zone_id: form.zoneId,
          delivery_address: form.address,
          delivery_fee: form.deliveryFee,
          payment_method: form.paymentMethod,
          status: initialStatus,
          customer_notes: form.notes || null,
          prescription_status: needsRx ? 'PENDING' : null,
        })
        .select()
        .single()

      if (orderErr) throw orderErr

      const { error: historyErr } = await supabase.from('order_status_history').insert({
        order_id: order.id,
        from_status: null,
        to_status: initialStatus,
        notes: 'Pedido criado pelo cliente',
      })

      if (historyErr) throw historyErr

      if (prescriptionFile && needsRx) await uploadPrescription(order.id, prescriptionFile)

      await auditLog({
        action: 'ORDER_CREATED',
        entityType: 'order',
        entityId: order.id,
        metadata: { medicationId, zoneId: form.zoneId, needsRx },
      })

      const trackingUrl = await buildTrackingUrl(order.tracking_token)
      await sendNotification('order_created', { order, customer, trackingUrl })

      navigate('/obrigado?token=' + order.tracking_token)
    } catch (err) {
      console.error('ERRO REAL DO PEDIDO:', err)
      setSubmitError(
        err?.message ||
          err?.error_description ||
          err?.details ||
          'Ocorreu um erro ao enviar o pedido. Por favor tente novamente.'
      )
      window.scrollTo({ top: 0, behavior: 'smooth' })
    } finally {
      setSubmitting(false)
    }
  }

  if (isLoading) {
    return (
      <div className="flex justify-center py-24">
        <Spinner size="xl" />
      </div>
    )
  }

  if (isError || !medication) {
    return (
      <div className="page-wrap-sm py-16 text-center">
        <div className="w-20 h-20 rounded-[1.75rem] bg-slate-100 flex items-center justify-center mx-auto mb-4">
          <ClipboardIcon />
        </div>
        <p className="text-slate-500 mb-6">Medicamento não encontrado ou indisponível.</p>
        <Link to="/medicamentos" className="btn-primary inline-flex">
          Ver medicamentos
        </Link>
      </div>
    )
  }

  return (
    <div className="min-h-[82svh] bg-[linear-gradient(180deg,#f8fffe_0%,#ffffff_28%,#ffffff_100%)]">
      <div className="page-wrap-sm py-8 pb-safe">
        <Link to="/medicamentos" className="inline-flex items-center gap-1.5 text-sm text-slate-400 hover:text-slate-700 mb-6 transition-colors">
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
          </svg>
          Medicamentos
        </Link>

        <div className="mb-8">
          <p className="section-label mb-2">Pedido</p>
          <h1 className="text-3xl font-extrabold text-slate-950 tracking-tight mb-2">Solicitar medicamento</h1>
          <p className="text-slate-500 text-sm md:text-base max-w-xl leading-relaxed">
            Preencha os seus dados e envie o pedido. A equipa confirma disponibilidade, receita quando aplicável e o valor final antes do avanço.
          </p>
        </div>

        {submitError && <Alert type="error" className="mb-6">{submitError}</Alert>}

        <form onSubmit={handleSubmit} noValidate className="space-y-8">
          <div className="card-lg p-5 md:p-6 border border-teal-100 bg-[linear-gradient(180deg,#f4fffd_0%,#ffffff_100%)]">
            <p className="text-xs font-extrabold text-teal-600 uppercase tracking-widest mb-3">Medicamento solicitado</p>
            <div className="flex items-start justify-between gap-3">
              <div className="flex-1 min-w-0">
                <h3 className="font-extrabold text-slate-950 text-lg leading-tight">{medication.commercial_name}</h3>
                {medication.generic_name && <p className="text-sm text-slate-500 mt-1">{medication.generic_name}</p>}
                <div className="flex flex-wrap gap-2 mt-3">
                  <CategoryBadge category={medication.category} />
                  {medication.dosage && <span className="badge bg-slate-100 text-slate-600">{medication.dosage}</span>}
                </div>
              </div>
              <div className="w-12 h-12 rounded-2xl bg-teal-100 text-teal-700 flex items-center justify-center shrink-0">
                <ClipboardIcon />
              </div>
            </div>
          </div>

          {medication.requires_prescription && (
            <section className="space-y-3">
              <div>
                <h2 className="text-base font-extrabold text-slate-950">Receita médica</h2>
                <p className="text-sm text-slate-500 mt-1">
                  Este medicamento exige receita médica válida. Anexe o documento antes de continuar.
                </p>
              </div>
              <PrescriptionUpload onChange={setPrescriptionFile} />
              {errors.prescription && <p className="field-error">{errors.prescription}</p>}
            </section>
          )}

          <section className="space-y-4">
            <h2 className="text-base font-extrabold text-slate-950">Os seus dados</h2>
            <Field label="Nome completo" required error={errors.fullName}>
              <input type="text" className="input" placeholder="O seu nome completo" value={form.fullName} onChange={(e) => set('fullName', e.target.value)} autoComplete="name" />
            </Field>
            <Field label="Número de WhatsApp" required error={errors.whatsapp} hint="Usaremos este número para confirmar o pedido e manter o acompanhamento.">
              <input type="tel" className="input" placeholder="+258 8X XXX XXXX" value={form.whatsapp} onChange={(e) => set('whatsapp', e.target.value)} autoComplete="tel" inputMode="tel" />
            </Field>
          </section>

          <section className="space-y-4">
            <h2 className="text-base font-extrabold text-slate-950">Entrega</h2>
            <div>
              <label className="label">
                Zona de entrega <span className="text-red-500">*</span>
              </label>
              <ZoneSelector
                value={form.zoneId}
                onChange={(id, fee) => {
                  setForm((f) => ({ ...f, zoneId: id, deliveryFee: fee }))
                  setErrors((e) => ({ ...e, zoneId: '' }))
                }}
                error={errors.zoneId}
              />
            </div>
            <Field label="Referência de morada" required error={errors.address} hint="Inclua pontos de referência que facilitem a entrega.">
              <textarea rows={3} className="input resize-none" placeholder="Ex.: Bairro X, perto de Y, portão azul..." value={form.address} onChange={(e) => set('address', e.target.value)} />
            </Field>
            <Field label="Observações" error={errors.notes}>
              <textarea rows={2} className="input resize-none" placeholder="Informação adicional sobre o pedido (opcional)." value={form.notes} onChange={(e) => set('notes', e.target.value)} />
            </Field>
          </section>

          <section className="space-y-3">
            <h2 className="text-base font-extrabold text-slate-950">Forma de pagamento</h2>
            {PAYMENT_OPTIONS.map((opt) => (
              <label
                key={opt.value}
                className={`flex items-center gap-4 p-4 rounded-2xl border-2 cursor-pointer transition-all ${
                  form.paymentMethod === opt.value
                    ? 'border-teal-500 bg-teal-50/40'
                    : 'border-slate-200 hover:border-teal-200 hover:bg-slate-50'
                }`}
              >
                <div className={`w-5 h-5 rounded-full border-2 flex items-center justify-center shrink-0 ${form.paymentMethod === opt.value ? 'border-teal-500' : 'border-slate-300'}`}>
                  {form.paymentMethod === opt.value && <div className="w-2.5 h-2.5 rounded-full bg-teal-500" />}
                </div>
                <div className="flex-1">
                  <p className="font-semibold text-slate-900 text-sm">{opt.label}</p>
                  <p className="text-xs text-slate-500 mt-0.5">{opt.desc}</p>
                </div>
                <input type="radio" name="payment" value={opt.value} checked={form.paymentMethod === opt.value} onChange={() => set('paymentMethod', opt.value)} className="sr-only" />
              </label>
            ))}
          </section>

          {form.zoneId && (
            <div className="card p-5 bg-slate-50 border border-slate-200">
              <p className="text-xs font-extrabold uppercase tracking-widest text-slate-400 mb-3">Resumo do pedido</p>
              <div className="space-y-2 text-sm">
                <div className="flex justify-between text-slate-600">
                  <span>Medicamento</span>
                  <span className="text-slate-400 italic text-xs">A confirmar</span>
                </div>
                <div className="flex justify-between text-slate-600">
                  <span>Taxa de entrega</span>
                  <span className="font-semibold text-slate-800">{fmt(form.deliveryFee)}</span>
                </div>
                <div className="border-t border-slate-200 pt-2 flex justify-between">
                  <span className="font-semibold text-slate-700">Total</span>
                  <span className="text-xs text-slate-400 italic">Confirmado após verificação</span>
                </div>
              </div>
            </div>
          )}

          <button type="submit" disabled={submitting} className="btn-primary-lg w-full">
            {submitting ? (
              <>
                <Spinner size="sm" /> A enviar pedido...
              </>
            ) : (
              'Enviar pedido'
            )}
          </button>

          <p className="text-xs text-center text-slate-400 leading-relaxed">
            Ao enviar, confirma que os dados estão correctos. A equipa contacta-o por WhatsApp para confirmar disponibilidade e os próximos passos.
          </p>
        </form>
      </div>
    </div>
  )
}
