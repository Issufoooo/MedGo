import { useState } from 'react'
import {
  useMedications,
  useCreateMedication,
  useUpdateMedication,
  useToggleMedicationVisibility,
  useDeleteMedication,
} from '../../hooks/useMedications'
import { useNotificationStore } from '../../store/notificationStore'
import { CategoryBadge } from '../../components/ui/Badge'
import { Modal } from '../../components/ui/Modal'
import { Alert } from '../../components/ui/Alert'

const CATEGORIES = [
  { value: 'FREE',                    label: 'Livre (OTC)' },
  { value: 'PRESCRIPTION',           label: 'Receita obrigatória' },
  { value: 'RESTRICTED_MONITORED',   label: 'Restrito / Controlado' },
]

const EMPTY_FORM = {
  commercial_name: '',
  generic_name: '',
  dosage: '',
  category: 'FREE',
  requires_prescription: false,
  is_visible: true,
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

function EmptyState({ search, category, onClear }) {
  return (
    <div className="flex flex-col items-center justify-center py-16 px-4 text-center">
      <div className="w-16 h-16 rounded-2xl bg-slate-100 flex items-center justify-center mb-4">
        <svg className="w-8 h-8 text-slate-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M19.428 15.428a2 2 0 00-1.022-.547l-2.387-.477a6 6 0 00-3.86.517l-.318.158a6 6 0 01-3.86.517L6.05 15.21a2 2 0 00-1.806.547M8 4h8l-1 1v5.172a2 2 0 00.586 1.414l5 5c1.26 1.26.367 3.414-1.415 3.414H4.828c-1.782 0-2.674-2.154-1.414-3.414l5-5A2 2 0 009 10.172V5L8 4z"/>
        </svg>
      </div>
      <h3 className="text-base font-extrabold text-slate-800 mb-1">
        {search || category ? 'Nenhum medicamento encontrado' : 'Catálogo vazio'}
      </h3>
      <p className="text-sm text-slate-400 max-w-xs mb-4">
        {search || category
          ? 'Tente ajustar os filtros ou pesquisa.'
          : 'Adicione o primeiro medicamento ao catálogo para que apareça no website.'}
      </p>
      {(search || category) && (
        <button onClick={onClear} className="btn-secondary btn-sm">Limpar filtros</button>
      )}
    </div>
  )
}

// ── Medication form modal ─────────────────────────────────────

function MedicationFormModal({ medication, onClose }) {
  const notify = useNotificationStore()
  const createMutation = useCreateMedication()
  const updateMutation = useUpdateMedication()
  const isEdit = !!medication?.id

  const [form, setForm] = useState(
    isEdit
      ? {
          commercial_name: medication.commercial_name || '',
          generic_name: medication.generic_name || '',
          dosage: medication.dosage || '',
          category: medication.category || 'FREE',
          requires_prescription: medication.requires_prescription || false,
          is_visible: medication.is_visible ?? true,
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
    if (!form.commercial_name.trim()) e.commercial_name = 'Nome comercial obrigatório'
    if (!form.dosage.trim()) e.dosage = 'Dosagem obrigatória'
    return e
  }

  const handleSubmit = async () => {
    const e = validate()
    if (Object.keys(e).length) { setErrors(e); return }

    const payload = {
      ...form,
      commercial_name: form.commercial_name.trim(),
      generic_name: form.generic_name.trim() || null,
      dosage: form.dosage.trim(),
    }

    try {
      if (isEdit) {
        await updateMutation.mutateAsync({ id: medication.id, ...payload })
        notify.success('Medicamento actualizado.')
      } else {
        await createMutation.mutateAsync(payload)
        notify.success('Medicamento adicionado ao catálogo.')
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
      title={isEdit ? 'Editar medicamento' : 'Novo medicamento'}
      size="md"
    >
      <div className="space-y-4">
        <div>
          <label className="label">Nome comercial <span className="text-red-500">*</span></label>
          <input
            type="text"
            value={form.commercial_name}
            onChange={e => set('commercial_name', e.target.value)}
            placeholder="Ex: Paracetamol 500mg Bayer"
            className="input"
          />
          {errors.commercial_name && <p className="field-error">{errors.commercial_name}</p>}
        </div>

        <div>
          <label className="label">Nome genérico</label>
          <input
            type="text"
            value={form.generic_name}
            onChange={e => set('generic_name', e.target.value)}
            placeholder="Ex: Paracetamol"
            className="input"
          />
          <p className="label-hint">Princípio activo ou nome DCI.</p>
        </div>

        <div>
          <label className="label">Dosagem <span className="text-red-500">*</span></label>
          <input
            type="text"
            value={form.dosage}
            onChange={e => set('dosage', e.target.value)}
            placeholder="Ex: 500mg, 10mg/ml, 250mg/5ml"
            className="input"
          />
          {errors.dosage && <p className="field-error">{errors.dosage}</p>}
        </div>

        <div>
          <label className="label">Categoria</label>
          <select
            value={form.category}
            onChange={e => set('category', e.target.value)}
            className="input"
          >
            {CATEGORIES.map(c => (
              <option key={c.value} value={c.value}>{c.label}</option>
            ))}
          </select>
        </div>

        <div className="rounded-2xl border border-slate-100 bg-slate-50 p-4 space-y-3">
          <label className="flex items-center gap-3 cursor-pointer">
            <div className="relative">
              <input
                type="checkbox"
                checked={form.requires_prescription}
                onChange={e => set('requires_prescription', e.target.checked)}
                className="sr-only peer"
              />
              <div className="w-10 h-6 rounded-full bg-slate-200 peer-checked:bg-teal-500 transition-colors" />
              <div className="absolute top-1 left-1 w-4 h-4 rounded-full bg-white shadow transition-transform peer-checked:translate-x-4" />
            </div>
            <div>
              <p className="text-sm font-extrabold text-slate-900">Requer receita médica</p>
              <p className="text-xs text-slate-400">O cliente terá de enviar foto da receita antes de avançar.</p>
            </div>
          </label>

          <div className="border-t border-slate-200" />

          <label className="flex items-center gap-3 cursor-pointer">
            <div className="relative">
              <input
                type="checkbox"
                checked={form.is_visible}
                onChange={e => set('is_visible', e.target.checked)}
                className="sr-only peer"
              />
              <div className="w-10 h-6 rounded-full bg-slate-200 peer-checked:bg-teal-500 transition-colors" />
              <div className="absolute top-1 left-1 w-4 h-4 rounded-full bg-white shadow transition-transform peer-checked:translate-x-4" />
            </div>
            <div>
              <p className="text-sm font-extrabold text-slate-900">Visível no site</p>
              <p className="text-xs text-slate-400">Se desactivado, o medicamento não aparece no catálogo público.</p>
            </div>
          </label>
        </div>

        <div className="flex gap-3 pt-2">
          <button onClick={onClose} className="btn-secondary flex-1">Cancelar</button>
          <button onClick={handleSubmit} disabled={saving} className="btn-primary flex-1">
            {saving ? 'A guardar...' : isEdit ? 'Guardar alterações' : 'Adicionar medicamento'}
          </button>
        </div>
      </div>
    </Modal>
  )
}

// ── Main page ─────────────────────────────────────────────────

export function MedicationsCatalogPage() {
  const notify = useNotificationStore()
  const [search, setSearch] = useState('')
  const [debouncedSearch, setDebouncedSearch] = useState('')
  const [categoryFilter, setCategoryFilter] = useState('')
  const [formModal, setFormModal] = useState(null) // null | 'new' | medication object
  const [deleteConfirm, setDeleteConfirm] = useState(null)

  const { data: medications = [], isLoading } = useMedications({
    search: debouncedSearch,
    category: categoryFilter,
  })

  const toggleVisibility = useToggleMedicationVisibility()
  const deleteMutation = useDeleteMedication()

  const handleSearch = (val) => {
    setSearch(val)
    clearTimeout(window.__medSearchTimer)
    window.__medSearchTimer = setTimeout(() => setDebouncedSearch(val), 350)
  }

  const handleToggleVisibility = async (med) => {
    try {
      await toggleVisibility.mutateAsync({ id: med.id, isVisible: !med.is_visible })
      notify.success(`${med.commercial_name} ${!med.is_visible ? 'activado' : 'ocultado'} no site.`)
    } catch (err) {
      notify.error(err.message)
    }
  }

  const handleDelete = async () => {
    if (!deleteConfirm) return
    try {
      await deleteMutation.mutateAsync(deleteConfirm.id)
      notify.success('Medicamento eliminado.')
    } catch (err) {
      notify.error(err.message)
    } finally {
      setDeleteConfirm(null)
    }
  }

  return (
    <div className="page-wrap animate-fade-in">
      {/* Header */}
      <div className="relative overflow-hidden rounded-[28px] border border-white/10 bg-[linear-gradient(155deg,#0d9488_0%,#0f766e_30%,#0a192f_100%)] px-6 py-7 text-white shadow-lg mb-6">
        <div className="absolute inset-0 dot-pattern opacity-50" />
        <div className="absolute -right-8 -top-8 h-40 w-40 rounded-full bg-teal-300/10 blur-3xl" />
        <div className="relative flex items-start justify-between gap-4">
          <div>
            <p className="text-xs font-extrabold uppercase tracking-[0.22em] text-white/60 mb-1">Catálogo de produtos</p>
            <h1 className="text-2xl font-extrabold">Medicamentos</h1>
            <p className="mt-1 text-sm text-white/60">
              {isLoading ? 'A carregar...' : `${medications.length} medicamentos no catálogo`}
            </p>
          </div>
          <button
            onClick={() => setFormModal('new')}
            className="shrink-0 flex items-center gap-2 rounded-xl bg-white/15 border border-white/20 px-4 py-2 text-sm font-extrabold hover:bg-white/25 transition-colors backdrop-blur-sm"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4"/>
            </svg>
            Novo
          </button>
        </div>
      </div>

      {/* Filters */}
      <div className="flex flex-col sm:flex-row gap-3 mb-5">
        <div className="relative flex-1">
          <div className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3.5">
            <svg className="w-4 h-4 text-slate-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"/>
            </svg>
          </div>
          <input
            type="text"
            value={search}
            onChange={e => handleSearch(e.target.value)}
            placeholder="Pesquisar por nome comercial ou genérico..."
            className="input pl-10"
          />
        </div>
        <select
          value={categoryFilter}
          onChange={e => setCategoryFilter(e.target.value)}
          className="input sm:w-56"
        >
          <option value="">Todas as categorias</option>
          {CATEGORIES.map(c => (
            <option key={c.value} value={c.value}>{c.label}</option>
          ))}
        </select>
      </div>

      {/* Table */}
      <div className="card overflow-hidden">
        <div className="overflow-x-auto scroll-x">
          <table className="w-full min-w-[720px]">
            <thead>
              <tr className="table-head-row">
                <th className="table-head-cell">Nome comercial</th>
                <th className="table-head-cell">Genérico</th>
                <th className="table-head-cell">Dosagem</th>
                <th className="table-head-cell">Categoria</th>
                <th className="table-head-cell">Receita</th>
                <th className="table-head-cell">Visível</th>
                <th className="table-head-cell w-20">Acções</th>
              </tr>
            </thead>
            <tbody>
              {isLoading ? (
                Array.from({ length: 8 }).map((_, i) => <SkeletonRow key={i} />)
              ) : medications.length === 0 ? (
                <tr>
                  <td colSpan={7}>
                    <EmptyState
                      search={debouncedSearch}
                      category={categoryFilter}
                      onClear={() => { setSearch(''); setDebouncedSearch(''); setCategoryFilter('') }}
                    />
                  </td>
                </tr>
              ) : (
                medications.map(med => (
                  <tr key={med.id} className="table-body-row group animate-fade-in">
                    <td className="table-cell">
                      <p className="text-sm font-extrabold text-slate-900">{med.commercial_name}</p>
                    </td>
                    <td className="table-cell">
                      <p className="text-sm text-slate-500">{med.generic_name || '—'}</p>
                    </td>
                    <td className="table-cell">
                      <span className="inline-flex items-center rounded-lg bg-slate-100 px-2 py-0.5 text-xs font-semibold text-slate-600">
                        {med.dosage || '—'}
                      </span>
                    </td>
                    <td className="table-cell">
                      <CategoryBadge category={med.category} />
                    </td>
                    <td className="table-cell">
                      {med.requires_prescription ? (
                        <span className="inline-flex items-center gap-1.5 text-xs font-semibold text-orange-700 bg-orange-50 border border-orange-200 rounded-full px-2 py-0.5">
                          <span className="w-1.5 h-1.5 rounded-full bg-orange-400" />
                          Sim
                        </span>
                      ) : (
                        <span className="text-xs text-slate-400">Não</span>
                      )}
                    </td>
                    <td className="table-cell">
                      <button
                        onClick={() => handleToggleVisibility(med)}
                        disabled={toggleVisibility.isPending}
                        className="relative inline-flex shrink-0 cursor-pointer"
                        title={med.is_visible ? 'Ocultar do site' : 'Mostrar no site'}
                      >
                        <div className={`w-9 h-5 rounded-full transition-colors ${med.is_visible ? 'bg-teal-500' : 'bg-slate-200'}`} />
                        <div className={`absolute top-0.5 left-0.5 w-4 h-4 rounded-full bg-white shadow transition-transform ${med.is_visible ? 'translate-x-4' : ''}`} />
                      </button>
                    </td>
                    <td className="table-cell">
                      <div className="flex items-center gap-1">
                        <button
                          onClick={() => setFormModal(med)}
                          className="btn-icon-sm text-slate-400 hover:text-teal-600"
                          title="Editar"
                        >
                          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z"/>
                          </svg>
                        </button>
                        <button
                          onClick={() => setDeleteConfirm(med)}
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

      {/* Form modal */}
      {formModal !== null && (
        <MedicationFormModal
          medication={formModal === 'new' ? null : formModal}
          onClose={() => setFormModal(null)}
        />
      )}

      {/* Delete confirm modal */}
      <Modal
        open={!!deleteConfirm}
        onClose={() => setDeleteConfirm(null)}
        title="Eliminar medicamento"
        size="sm"
      >
        <Alert type="warning">
          <strong>{deleteConfirm?.commercial_name}</strong> será permanentemente eliminado do catálogo.
          Esta acção não pode ser desfeita e pode afectar pedidos existentes.
        </Alert>
        <div className="flex gap-3 mt-4">
          <button onClick={() => setDeleteConfirm(null)} className="btn-secondary flex-1">Cancelar</button>
          <button
            onClick={handleDelete}
            disabled={deleteMutation.isPending}
            className="btn-danger flex-1"
          >
            {deleteMutation.isPending ? 'A eliminar...' : 'Eliminar'}
          </button>
        </div>
      </Modal>
    </div>
  )
}
