import { useState } from 'react'
import {
  useZones,
  useCreateZone,
  useUpdateZone,
  useToggleZone,
  useDeleteZone,
} from '../../hooks/useZones'
import { useMapConfig } from '../../hooks/useMapConfig'
import { useNotificationStore } from '../../store/notificationStore'
import { Modal } from '../../components/ui/Modal'
import { Alert } from '../../components/ui/Alert'
import { ZonesMapEditor } from '../../components/dashboard/ZonesMapEditor'

const fmt = v => v != null
  ? new Intl.NumberFormat('pt-MZ', { style: 'currency', currency: 'MZN', minimumFractionDigits: 0 }).format(v)
  : '—'

const COLOR_PRESETS = [
  '#14b8a6', '#0d9488', '#0f766e',
  '#f97316', '#ea580c', '#c2410c',
  '#6366f1', '#8b5cf6', '#ef4444',
  '#22c55e', '#eab308', '#64748b',
]

const EMPTY_FORM = {
  name: '',
  delivery_fee: '',
  min_km: '',
  max_km: '',
  color: '#14b8a6',
  is_active: true,
}

// ── Skeleton ──────────────────────────────────────────────────

function SkeletonRow() {
  return (
    <tr className="table-body-row">
      {[1,2,3,4,5,6].map(i => (
        <td key={i} className="table-cell">
          <div className="skeleton h-4 rounded w-full" />
        </td>
      ))}
    </tr>
  )
}

// ── Empty state ───────────────────────────────────────────────

function EmptyState({ onNew }) {
  return (
    <div className="flex flex-col items-center justify-center py-16 px-4 text-center">
      <div className="w-16 h-16 rounded-2xl bg-slate-100 flex items-center justify-center mb-4">
        <svg className="w-8 h-8 text-slate-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 20l-5.447-2.724A1 1 0 013 16.382V5.618a1 1 0 011.447-.894L9 7m0 13l6-3m-6 3V7m6 10l4.553 2.276A1 1 0 0021 18.382V7.618a1 1 0 00-.553-.894L15 4m0 13V4m0 0L9 7"/>
        </svg>
      </div>
      <h3 className="text-base font-extrabold text-slate-800 mb-1">Sem zonas de entrega</h3>
      <p className="text-sm text-slate-400 max-w-xs mb-4">
        Crie as zonas para definir a área de cobertura e as taxas de entrega por distância.
      </p>
      <button onClick={onNew} className="btn-primary">
        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4"/>
        </svg>
        Criar primeira zona
      </button>
    </div>
  )
}

// ── Zone form modal ───────────────────────────────────────────

function ZoneFormModal({ zone, onClose }) {
  const notify = useNotificationStore()
  const createMutation = useCreateZone()
  const updateMutation = useUpdateZone()
  const isEdit = !!zone?.id

  const [form, setForm] = useState(
    isEdit
      ? {
          name: zone.name || '',
          delivery_fee: zone.delivery_fee?.toString() || '',
          min_km: zone.min_km?.toString() || '0',
          max_km: zone.max_km?.toString() || '',
          color: zone.color || '#14b8a6',
          is_active: zone.is_active ?? true,
        }
      : { ...EMPTY_FORM }
  )
  const [errors, setErrors] = useState({})

  const set = (field, val) => {
    setForm(f => ({ ...f, [field]: val }))
    setErrors(e => ({ ...e, [field]: '' }))
  }

  const validate = () => {
    const e = {}
    if (!form.name.trim()) e.name = 'Nome obrigatório'
    if (!form.delivery_fee || isNaN(parseFloat(form.delivery_fee))) e.delivery_fee = 'Taxa inválida'
    if (form.min_km === '' || isNaN(parseFloat(form.min_km))) e.min_km = 'Km mínimo obrigatório'
    if (!form.max_km || isNaN(parseFloat(form.max_km))) e.max_km = 'Km máximo obrigatório'
    if (!e.min_km && !e.max_km && parseFloat(form.min_km) >= parseFloat(form.max_km)) {
      e.max_km = 'Km máximo deve ser maior que o mínimo'
    }
    return e
  }

  const handleSubmit = async () => {
    const e = validate()
    if (Object.keys(e).length) { setErrors(e); return }

    const payload = {
      name: form.name.trim(),
      delivery_fee: parseFloat(form.delivery_fee),
      min_km: parseFloat(form.min_km),
      max_km: parseFloat(form.max_km),
      color: form.color,
      is_active: form.is_active,
    }

    try {
      if (isEdit) {
        await updateMutation.mutateAsync({ id: zone.id, ...payload })
        notify.success('Zona actualizada.')
      } else {
        await createMutation.mutateAsync(payload)
        notify.success('Zona criada com sucesso.')
      }
      onClose()
    } catch (err) {
      notify.error(err.message)
    }
  }

  const saving = createMutation.isPending || updateMutation.isPending

  return (
    <Modal
      open
      onClose={onClose}
      title={isEdit ? 'Editar zona' : 'Nova zona de entrega'}
      size="md"
    >
      <div className="space-y-4">
        <div>
          <label className="label">Nome da zona <span className="text-red-500">*</span></label>
          <input
            type="text"
            value={form.name}
            onChange={e => set('name', e.target.value)}
            placeholder="Ex: Zona Centro, Zona Matola"
            className="input"
          />
          {errors.name && <p className="field-error">{errors.name}</p>}
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="label">A partir de (km) <span className="text-red-500">*</span></label>
            <input
              type="number"
              value={form.min_km}
              onChange={e => set('min_km', e.target.value)}
              min="0"
              step="0.5"
              placeholder="0"
              className="input"
            />
            {errors.min_km && <p className="field-error">{errors.min_km}</p>}
          </div>
          <div>
            <label className="label">Até (km) <span className="text-red-500">*</span></label>
            <input
              type="number"
              value={form.max_km}
              onChange={e => set('max_km', e.target.value)}
              min="0"
              step="0.5"
              placeholder="999"
              className="input"
            />
            {errors.max_km && <p className="field-error">{errors.max_km}</p>}
          </div>
        </div>

        <div>
          <label className="label">Taxa de entrega (MZN) <span className="text-red-500">*</span></label>
          <input
            type="number"
            value={form.delivery_fee}
            onChange={e => set('delivery_fee', e.target.value)}
            min="0"
            step="10"
            placeholder="100"
            className="input"
          />
          {errors.delivery_fee && <p className="field-error">{errors.delivery_fee}</p>}
        </div>

        <div>
          <label className="label">Cor no mapa</label>
          <div className="flex flex-wrap gap-2 mt-1">
            {COLOR_PRESETS.map(c => (
              <button
                key={c}
                type="button"
                onClick={() => set('color', c)}
                className={`w-8 h-8 rounded-lg transition-transform hover:scale-110 ${form.color === c ? 'ring-2 ring-offset-1 ring-slate-400 scale-110' : ''}`}
                style={{ background: c }}
                title={c}
              />
            ))}
          </div>
          <div className="mt-2 flex items-center gap-2">
            <div className="w-5 h-5 rounded" style={{ background: form.color }} />
            <input
              type="text"
              value={form.color}
              onChange={e => set('color', e.target.value)}
              className="input input-sm font-mono w-28"
              placeholder="#14b8a6"
            />
          </div>
        </div>

        <label className="flex items-center gap-3 cursor-pointer bg-slate-50 border border-slate-100 rounded-xl px-4 py-3">
          <div className="relative">
            <input
              type="checkbox"
              checked={form.is_active}
              onChange={e => set('is_active', e.target.checked)}
              className="sr-only peer"
            />
            <div className="w-10 h-6 rounded-full bg-slate-200 peer-checked:bg-teal-500 transition-colors" />
            <div className="absolute top-1 left-1 w-4 h-4 rounded-full bg-white shadow transition-transform peer-checked:translate-x-4" />
          </div>
          <div>
            <p className="text-sm font-extrabold text-slate-900">Zona activa</p>
            <p className="text-xs text-slate-400">Zonas inactivas não são consideradas no cálculo de taxa.</p>
          </div>
        </label>

        <div className="flex gap-3 pt-2">
          <button onClick={onClose} className="btn-secondary flex-1">Cancelar</button>
          <button onClick={handleSubmit} disabled={saving} className="btn-primary flex-1">
            {saving ? 'A guardar...' : isEdit ? 'Guardar alterações' : 'Criar zona'}
          </button>
        </div>
      </div>
    </Modal>
  )
}

// ── Main page ─────────────────────────────────────────────────

export function ZonesPage() {
  const notify = useNotificationStore()
  const [tab, setTab] = useState('list') // 'list' | 'map'
  const [formModal, setFormModal] = useState(null)
  const [deleteConfirm, setDeleteConfirm] = useState(null)

  const { data: zones = [], isLoading } = useZones()
  const { data: mapConfig } = useMapConfig()
  const toggleMutation = useToggleZone()
  const deleteMutation = useDeleteZone()

  const handleToggle = async (zone) => {
    try {
      await toggleMutation.mutateAsync({ id: zone.id, isActive: !zone.is_active })
      notify.success(`Zona "${zone.name}" ${!zone.is_active ? 'activada' : 'desactivada'}.`)
    } catch (err) {
      notify.error(err.message)
    }
  }

  const handleDelete = async () => {
    if (!deleteConfirm) return
    try {
      await deleteMutation.mutateAsync(deleteConfirm.id)
      notify.success('Zona eliminada.')
    } catch (err) {
      notify.error(err.message)
    } finally {
      setDeleteConfirm(null)
    }
  }

  const activeZones = zones.filter(z => z.is_active)
  const totalPedidos = zones.reduce((sum, z) => sum + (z.order_count || 0), 0)

  return (
    <div className="page-wrap animate-fade-in">
      {/* Header */}
      <div className="relative overflow-hidden rounded-[28px] border border-white/10 bg-[linear-gradient(155deg,#0a192f_0%,#134e4a_60%,#0f766e_100%)] px-6 py-7 text-white shadow-lg mb-6">
        <div className="absolute inset-0 dot-pattern opacity-40" />
        <div className="absolute -right-8 -top-8 h-40 w-40 rounded-full bg-teal-400/10 blur-3xl" />
        <div className="relative flex items-start justify-between gap-4">
          <div>
            <p className="text-xs font-extrabold uppercase tracking-[0.22em] text-white/60 mb-1">Cobertura de entrega</p>
            <h1 className="text-2xl font-extrabold">Zonas e taxas</h1>
            <div className="mt-2 flex items-center gap-4 text-sm text-white/70">
              <span>{zones.length} zonas configuradas</span>
              <span className="w-1 h-1 rounded-full bg-white/30" />
              <span>{activeZones.length} activas</span>
              <span className="w-1 h-1 rounded-full bg-white/30" />
              <span>{totalPedidos} pedidos</span>
            </div>
          </div>
          <button
            onClick={() => { setTab('list'); setFormModal('new') }}
            className="shrink-0 flex items-center gap-2 rounded-xl bg-white/15 border border-white/20 px-4 py-2 text-sm font-extrabold hover:bg-white/25 transition-colors backdrop-blur-sm"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4"/>
            </svg>
            Nova zona
          </button>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex gap-1 bg-slate-100 rounded-xl p-1 mb-5 w-fit">
        <button
          onClick={() => setTab('list')}
          className={`px-4 py-2 rounded-lg text-sm font-extrabold transition-all ${tab === 'list' ? 'bg-white shadow text-slate-900' : 'text-slate-500 hover:text-slate-700'}`}
        >
          <span className="flex items-center gap-2">
            <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 10h16M4 14h16M4 18h16"/>
            </svg>
            Lista
          </span>
        </button>
        <button
          onClick={() => setTab('map')}
          className={`px-4 py-2 rounded-lg text-sm font-extrabold transition-all ${tab === 'map' ? 'bg-white shadow text-slate-900' : 'text-slate-500 hover:text-slate-700'}`}
        >
          <span className="flex items-center gap-2">
            <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 20l-5.447-2.724A1 1 0 013 16.382V5.618a1 1 0 011.447-.894L9 7m0 13l6-3m-6 3V7m6 10l4.553 2.276A1 1 0 0021 18.382V7.618a1 1 0 00-.553-.894L15 4m0 13V4m0 0L9 7"/>
            </svg>
            Mapa
          </span>
        </button>
      </div>

      {/* List tab */}
      {tab === 'list' && (
        <div className="card overflow-hidden">
          <div className="overflow-x-auto scroll-x">
            <table className="w-full min-w-[640px]">
              <thead>
                <tr className="table-head-row">
                  <th className="table-head-cell">Zona</th>
                  <th className="table-head-cell">Distância</th>
                  <th className="table-head-cell">Taxa</th>
                  <th className="table-head-cell">Pedidos</th>
                  <th className="table-head-cell">Estado</th>
                  <th className="table-head-cell w-20">Acções</th>
                </tr>
              </thead>
              <tbody>
                {isLoading ? (
                  Array.from({ length: 5 }).map((_, i) => <SkeletonRow key={i} />)
                ) : zones.length === 0 ? (
                  <tr>
                    <td colSpan={6}>
                      <EmptyState onNew={() => setFormModal('new')} />
                    </td>
                  </tr>
                ) : (
                  zones.map(zone => (
                    <tr key={zone.id} className="table-body-row animate-fade-in">
                      <td className="table-cell">
                        <div className="flex items-center gap-2.5">
                          <div
                            className="w-3 h-3 rounded-full shrink-0"
                            style={{ background: zone.color || '#14b8a6' }}
                          />
                          <p className="text-sm font-extrabold text-slate-900">{zone.name}</p>
                        </div>
                      </td>
                      <td className="table-cell">
                        <span className="text-sm font-mono text-slate-600">
                          {zone.min_km ?? 0} – {zone.max_km ?? '∞'} km
                        </span>
                      </td>
                      <td className="table-cell">
                        <span className="text-sm font-extrabold text-teal-700">{fmt(zone.delivery_fee)}</span>
                      </td>
                      <td className="table-cell">
                        <span className="inline-flex items-center justify-center w-7 h-7 rounded-full bg-slate-100 text-slate-600 text-xs font-extrabold">
                          {zone.order_count ?? 0}
                        </span>
                      </td>
                      <td className="table-cell">
                        <button
                          onClick={() => handleToggle(zone)}
                          disabled={toggleMutation.isPending}
                          className="relative inline-flex cursor-pointer"
                          title={zone.is_active ? 'Desactivar zona' : 'Activar zona'}
                        >
                          <div className={`w-9 h-5 rounded-full transition-colors ${zone.is_active ? 'bg-teal-500' : 'bg-slate-200'}`} />
                          <div className={`absolute top-0.5 left-0.5 w-4 h-4 rounded-full bg-white shadow transition-transform ${zone.is_active ? 'translate-x-4' : ''}`} />
                        </button>
                      </td>
                      <td className="table-cell">
                        <div className="flex items-center gap-1">
                          <button
                            onClick={() => setFormModal(zone)}
                            className="btn-icon-sm text-slate-400 hover:text-teal-600"
                            title="Editar"
                          >
                            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z"/>
                            </svg>
                          </button>
                          <button
                            onClick={() => setDeleteConfirm(zone)}
                            className="btn-icon-sm text-slate-400 hover:text-red-500"
                            title="Eliminar"
                          >
                            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"/>
                            </svg>
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Map tab */}
      {tab === 'map' && (
        <div className="space-y-4">
          <div className="card p-5">
            <h3 className="text-sm font-extrabold text-slate-800 mb-1">Editor de zonas geográficas</h3>
            <p className="text-xs text-slate-500 mb-4">
              Visualização dos anéis de cobertura centrados no ponto de referência da MedGo.
              Arraste o marcador central para reposicionar a sede.
            </p>
            <ZonesMapEditor
              referencePoint={mapConfig}
              zones={zones}
              onZoneClick={(zone) => setFormModal(zone)}
            />
          </div>
        </div>
      )}

      {/* Form modal */}
      {formModal !== null && (
        <ZoneFormModal
          zone={formModal === 'new' ? null : formModal}
          onClose={() => setFormModal(null)}
        />
      )}

      {/* Delete confirm modal */}
      <Modal
        open={!!deleteConfirm}
        onClose={() => setDeleteConfirm(null)}
        title="Eliminar zona"
        size="sm"
      >
        <Alert type="warning">
          A zona <strong>{deleteConfirm?.name}</strong> será permanentemente eliminada.
          Pedidos existentes associados a esta zona não serão afectados, mas novos pedidos não poderão usar esta zona.
        </Alert>
        <div className="flex gap-3 mt-4">
          <button onClick={() => setDeleteConfirm(null)} className="btn-secondary flex-1">Cancelar</button>
          <button
            onClick={handleDelete}
            disabled={deleteMutation.isPending}
            className="btn-danger flex-1"
          >
            {deleteMutation.isPending ? 'A eliminar...' : 'Eliminar zona'}
          </button>
        </div>
      </Modal>
    </div>
  )
}
