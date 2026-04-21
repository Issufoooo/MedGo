import { useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { usePharmacies, useCreatePharmacy, useUpdatePharmacy, useTogglePharmacy } from '../../hooks/usePharmacies'
import { getPharmacyOrderCounts } from '../../services/pharmacyService'
import { useNotificationStore } from '../../store/notificationStore'
import { Modal } from '../../components/ui/Modal'
import { Alert } from '../../components/ui/Alert'
import { Spinner } from '../../components/ui/Spinner'

// ── Icons ─────────────────────────────────────────────────────
function IPlus()  { return <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4"/></svg> }
function IEdit()  { return <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z"/></svg> }
function IPhone() { return <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.949V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z"/></svg> }
function IMap()   { return <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z"/><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z"/></svg> }
function IWa()    { return <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24"><path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z"/></svg> }

// ── Form ──────────────────────────────────────────────────────
const EMPTY_FORM = { name: '', address: '', contact_phone: '', contact_email: '', whatsapp_number: '', notes: '', is_active: true }

function PharmacyForm({ initial, onSave, onCancel, loading }) {
  const [form, setForm] = useState(initial || EMPTY_FORM)
  const set = (k, v) => setForm(f => ({ ...f, [k]: v }))
  const [errors, setErrors] = useState({})

  const validate = () => {
    const e = {}
    if (!form.name.trim()) e.name = 'Campo obrigatório'
    return e
  }

  const handleSubmit = () => {
    const e = validate()
    if (Object.keys(e).length) { setErrors(e); return }
    onSave(form)
  }

  return (
    <div className="space-y-4">
      <div>
        <label className="label">Nome da farmácia <span className="text-red-500">*</span></label>
        <input value={form.name} onChange={e => set('name', e.target.value)} placeholder="Ex: Farmácia Central" className={`input ${errors.name ? 'border-red-300' : ''}`} />
        {errors.name && <p className="field-error">{errors.name}</p>}
      </div>
      <div>
        <label className="label">Morada</label>
        <input value={form.address} onChange={e => set('address', e.target.value)} placeholder="Ex: Av. Eduardo Mondlane, 1234, Maputo" className="input" />
      </div>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div>
          <label className="label">Telefone de contacto</label>
          <input value={form.contact_phone} onChange={e => set('contact_phone', e.target.value)} placeholder="+258 21 XXX XXX" className="input" type="tel" />
        </div>
        <div>
          <label className="label">WhatsApp</label>
          <input value={form.whatsapp_number} onChange={e => set('whatsapp_number', e.target.value)} placeholder="+258 8X XXX XXXX" className="input" type="tel" />
        </div>
      </div>
      <div>
        <label className="label">Email</label>
        <input value={form.contact_email} onChange={e => set('contact_email', e.target.value)} placeholder="farmacia@exemplo.co.mz" className="input" type="email" />
      </div>
      <div>
        <label className="label">Notas internas</label>
        <textarea value={form.notes} onChange={e => set('notes', e.target.value)} rows={2} placeholder="Notas operacionais, horário, responsável..." className="input resize-none" />
      </div>
      <div className="flex items-center gap-3">
        <button
          type="button"
          onClick={() => set('is_active', !form.is_active)}
          className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${form.is_active ? 'bg-teal-500' : 'bg-slate-200'}`}
        >
          <span className={`inline-block h-4 w-4 transform rounded-full bg-white shadow-sm transition-transform ${form.is_active ? 'translate-x-6' : 'translate-x-1'}`} />
        </button>
        <span className="text-sm font-medium text-slate-700">{form.is_active ? 'Activa' : 'Inactiva'}</span>
      </div>
      <div className="flex gap-3 pt-2">
        <button onClick={onCancel} className="btn-secondary flex-1">Cancelar</button>
        <button onClick={handleSubmit} disabled={loading} className="btn-primary flex-1">
          {loading ? <Spinner size="sm" /> : null}
          {initial ? 'Guardar alterações' : 'Criar farmácia'}
        </button>
      </div>
    </div>
  )
}

// ── Card ──────────────────────────────────────────────────────
function PharmacyCard({ pharmacy, orderCount, onEdit, onToggle }) {
  return (
    <div className={`card p-5 transition-all hover:shadow-card-md ${!pharmacy.is_active ? 'opacity-60' : ''}`}>
      <div className="flex items-start justify-between gap-3 mb-3">
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-1">
            <h3 className="font-extrabold text-slate-900 truncate">{pharmacy.name}</h3>
            <span className={`inline-flex items-center rounded-full px-2 py-0.5 text-[10px] font-extrabold uppercase tracking-wide ${pharmacy.is_active ? 'bg-green-50 text-green-700' : 'bg-slate-100 text-slate-500'}`}>
              {pharmacy.is_active ? 'Activa' : 'Inactiva'}
            </span>
          </div>
          {orderCount > 0 && (
            <span className="inline-flex items-center gap-1 text-xs font-semibold text-teal-600">
              <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 104 0M9 5a2 2 0 012 2h2a2 2 0 012-2"/></svg>
              {orderCount} pedido{orderCount > 1 ? 's' : ''} activo{orderCount > 1 ? 's' : ''}
            </span>
          )}
        </div>
        <div className="flex items-center gap-1 shrink-0">
          <button onClick={() => onEdit(pharmacy)} className="btn-icon" title="Editar"><IEdit /></button>
        </div>
      </div>

      <div className="space-y-2 text-sm">
        {pharmacy.address && (
          <div className="flex items-start gap-2 text-slate-500">
            <span className="mt-0.5 text-slate-400 shrink-0"><IMap /></span>
            <span className="leading-snug">{pharmacy.address}</span>
          </div>
        )}
        {pharmacy.contact_phone && (
          <div className="flex items-center gap-2 text-slate-500">
            <span className="text-slate-400 shrink-0"><IPhone /></span>
            <a href={`tel:${pharmacy.contact_phone}`} className="hover:text-teal-600 transition-colors">{pharmacy.contact_phone}</a>
          </div>
        )}
        {pharmacy.whatsapp_number && (
          <div className="flex items-center gap-2 text-slate-500">
            <span className="text-green-500 shrink-0"><IWa /></span>
            <a href={`https://wa.me/${pharmacy.whatsapp_number.replace(/\D/g, '')}`} target="_blank" rel="noopener noreferrer" className="hover:text-green-600 transition-colors">{pharmacy.whatsapp_number}</a>
          </div>
        )}
        {pharmacy.notes && (
          <p className="text-xs text-slate-400 italic border-t border-slate-50 pt-2 mt-2">{pharmacy.notes}</p>
        )}
      </div>

      <div className="mt-4 pt-3 border-t border-slate-50 flex items-center justify-between">
        <span className="text-xs text-slate-400">
          Desde {new Date(pharmacy.created_at).toLocaleDateString('pt-MZ', { month: 'short', year: 'numeric' })}
        </span>
        <button
          onClick={() => onToggle(pharmacy)}
          className={`text-xs font-semibold transition-colors ${pharmacy.is_active ? 'text-slate-400 hover:text-red-500' : 'text-teal-600 hover:text-teal-700'}`}
        >
          {pharmacy.is_active ? 'Desactivar' : 'Activar'}
        </button>
      </div>
    </div>
  )
}

// ── MAIN PAGE ─────────────────────────────────────────────────
export function PharmaciesPage() {
  const notify = useNotificationStore()
  const [showInactive, setShowInactive] = useState(false)
  const [modal, setModal] = useState(null) // null | 'create' | pharmacy_obj
  const [search, setSearch] = useState('')

  const { data: pharmacies = [], isLoading } = usePharmacies({ includeInactive: showInactive })
  const { data: orderCounts = {} } = useQuery({
    queryKey: ['pharmacy-order-counts'],
    queryFn: getPharmacyOrderCounts,
    refetchInterval: 60_000,
  })

  const createMutation = useCreatePharmacy()
  const updateMutation = useUpdatePharmacy()
  const toggleMutation = useTogglePharmacy()

  const filtered = search
    ? pharmacies.filter(p =>
        p.name.toLowerCase().includes(search.toLowerCase()) ||
        p.address?.toLowerCase().includes(search.toLowerCase())
      )
    : pharmacies

  const activeCount   = pharmacies.filter(p => p.is_active).length
  const inactiveCount = pharmacies.filter(p => !p.is_active).length

  const handleSaveNew = async (form) => {
    try {
      await createMutation.mutateAsync(form)
      notify.success('Farmácia criada com sucesso.')
      setModal(null)
    } catch (err) { notify.error(err.message) }
  }

  const handleSaveEdit = async (form) => {
    try {
      await updateMutation.mutateAsync({ id: modal.id, payload: form })
      notify.success('Farmácia actualizada.')
      setModal(null)
    } catch (err) { notify.error(err.message) }
  }

  const handleToggle = async (pharmacy) => {
    try {
      await toggleMutation.mutateAsync({ id: pharmacy.id, isActive: !pharmacy.is_active })
      notify.success(pharmacy.is_active ? 'Farmácia desactivada.' : 'Farmácia activada.')
    } catch (err) { notify.error(err.message) }
  }

  return (
    <div className="max-w-5xl mx-auto px-4 md:px-6 py-6 pb-10 space-y-6">

      {/* Header */}
      <div className="relative overflow-hidden rounded-[28px] border border-white/10 bg-[linear-gradient(155deg,#0d9488_0%,#0f766e_25%,#0a192f_100%)] px-6 py-7 text-white shadow-lg">
        <div className="absolute inset-0 dot-pattern opacity-60" />
        <div className="absolute -right-10 -top-10 h-40 w-40 rounded-full bg-teal-300/10 blur-3xl" />
        <div className="relative flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <p className="text-xs font-extrabold uppercase tracking-[0.22em] text-white/70">Gestão</p>
            <h1 className="mt-2 text-2xl font-extrabold">Farmácias parceiras</h1>
            <p className="mt-1.5 text-sm text-white/70">
              {activeCount} activa{activeCount !== 1 ? 's' : ''}
              {inactiveCount > 0 && ` · ${inactiveCount} inactiva${inactiveCount !== 1 ? 's' : ''}`}
            </p>
          </div>
          <button onClick={() => setModal('create')} className="inline-flex items-center gap-2 rounded-2xl bg-white/15 border border-white/20 px-5 py-2.5 text-sm font-semibold text-white hover:bg-white/25 transition-colors backdrop-blur-sm shrink-0">
            <IPlus /> Nova farmácia
          </button>
        </div>
      </div>

      {/* Controls */}
      <div className="flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1">
          <svg className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 pointer-events-none" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-4.35-4.35M17 11A6 6 0 115 11a6 6 0 0112 0z"/></svg>
          <input
            type="text" value={search} onChange={e => setSearch(e.target.value)}
            placeholder="Pesquisar farmácia..." className="input pl-10"
          />
        </div>
        <button
          onClick={() => setShowInactive(!showInactive)}
          className={`btn-secondary shrink-0 ${showInactive ? 'border-teal-400 text-teal-700 bg-teal-50' : ''}`}
        >
          {showInactive ? 'Ocultar inactivas' : `Mostrar inactivas${inactiveCount > 0 ? ` (${inactiveCount})` : ''}`}
        </button>
      </div>

      {/* List */}
      {isLoading ? (
        <div className="flex justify-center py-16"><Spinner size="lg" /></div>
      ) : filtered.length === 0 ? (
        <div className="card p-14 text-center">
          <div className="text-5xl mb-4">🏥</div>
          <p className="font-extrabold text-slate-700 mb-1">
            {search ? 'Nenhuma farmácia encontrada' : 'Sem farmácias registadas'}
          </p>
          <p className="text-sm text-slate-400 mb-5">
            {search ? 'Tente outro termo de pesquisa.' : 'Adicione a primeira farmácia parceira.'}
          </p>
          {!search && (
            <button onClick={() => setModal('create')} className="btn-primary inline-flex">
              <IPlus /> Adicionar farmácia
            </button>
          )}
        </div>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
          {filtered.map(pharmacy => (
            <PharmacyCard
              key={pharmacy.id}
              pharmacy={pharmacy}
              orderCount={orderCounts[pharmacy.id] || 0}
              onEdit={setModal}
              onToggle={handleToggle}
            />
          ))}
        </div>
      )}

      {/* Create modal */}
      <Modal open={modal === 'create'} onClose={() => setModal(null)} title="Nova farmácia parceira" size="md">
        <PharmacyForm
          onSave={handleSaveNew}
          onCancel={() => setModal(null)}
          loading={createMutation.isPending}
        />
      </Modal>

      {/* Edit modal */}
      <Modal open={!!modal && modal !== 'create'} onClose={() => setModal(null)} title="Editar farmácia" size="md">
        {modal && modal !== 'create' && (
          <PharmacyForm
            initial={modal}
            onSave={handleSaveEdit}
            onCancel={() => setModal(null)}
            loading={updateMutation.isPending}
          />
        )}
      </Modal>
    </div>
  )
}
