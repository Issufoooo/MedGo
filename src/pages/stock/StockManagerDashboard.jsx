import { useState, useRef } from 'react'
import { useQuery } from '@tanstack/react-query'
import { supabase } from '../../lib/supabase'
import {
  useInventoryOverview,
  usePharmacyInventory,
  useStockSummary,
  useInventoryMovements,
  useUpsertInventoryItem,
  useAdjustInventory,
  useRemoveInventoryItem,
} from '../../hooks/useInventory'
import { usePharmacies } from '../../hooks/usePharmacies'
import { useNotificationStore } from '../../store/notificationStore'
import { Modal } from '../../components/ui/Modal'
import { Alert } from '../../components/ui/Alert'
import { Spinner } from '../../components/ui/Spinner'
import { STOCK_STATUS_LABEL } from '../../lib/constants'

// ── Helpers ───────────────────────────────────────────────────
const fmt = v => v != null ? new Intl.NumberFormat('pt-MZ', { style: 'currency', currency: 'MZN', minimumFractionDigits: 2 }).format(v) : '—'
const fmtDate = iso => iso ? new Date(iso).toLocaleString('pt-MZ', { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' }) : '—'

function stockDot(status) {
  if (status === 'IN_STOCK')    return 'stock-dot-green'
  if (status === 'LOW_STOCK')   return 'stock-dot-amber'
  return 'stock-dot-red'
}
function stockText(status) {
  if (status === 'IN_STOCK')    return 'text-green-700'
  if (status === 'LOW_STOCK')   return 'text-amber-600'
  return 'text-red-600'
}
function stockBg(status) {
  if (status === 'IN_STOCK')    return 'bg-green-50 border-green-200'
  if (status === 'LOW_STOCK')   return 'bg-amber-50 border-amber-200'
  return 'bg-red-50 border-red-200'
}

// ── Icons ─────────────────────────────────────────────────────
function ISearch() { return <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-4.35-4.35M17 11A6 6 0 115 11a6 6 0 0112 0z"/></svg> }
function IPlus()   { return <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4"/></svg> }
function IEdit()   { return <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z"/></svg> }
function ITrash()  { return <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"/></svg> }
function IHistory(){ return <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z"/></svg> }
function IUpload() { return <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12"/></svg> }

// ── Summary KPI row ───────────────────────────────────────────
function SummaryBar({ stats, loading }) {
  const cards = [
    { label: 'Total de registos', value: stats?.total ?? 0, color: 'text-slate-700' },
    { label: 'Em stock', value: stats?.in_stock ?? 0, color: 'text-green-600' },
    { label: 'Stock baixo', value: stats?.low_stock ?? 0, color: 'text-amber-600' },
    { label: 'Sem stock', value: stats?.out_of_stock ?? 0, color: 'text-red-600' },
    { label: 'Farmácias', value: stats?.pharmacies ?? 0, color: 'text-teal-600' },
  ]
  return (
    <div className="grid grid-cols-2 sm:grid-cols-5 gap-3">
      {cards.map(c => (
        <div key={c.label} className="card p-4">
          {loading
            ? <div className="skeleton h-7 w-10 rounded mb-1" />
            : <p className={`text-2xl font-extrabold ${c.color}`}>{c.value}</p>
          }
          <p className="text-xs text-slate-400 font-medium mt-0.5">{c.label}</p>
        </div>
      ))}
    </div>
  )
}

// ── Add / Edit item form ──────────────────────────────────────
function ItemForm({ initial, pharmacyId, onSave, onCancel, loading }) {
  const [medicationId, setMedicationId] = useState(initial?.medication_id || '')
  const [quantity, setQuantity]         = useState(initial?.quantity ?? '')
  const [unitPrice, setUnitPrice]       = useState(initial?.unit_price ?? '')
  const [notes, setNotes]               = useState(initial?.notes ?? '')
  const [errors, setErrors]             = useState({})

  const { data: medications = [], isLoading: medsLoading } = useQuery({
    queryKey: ['medications-list'],
    queryFn: async () => {
      const { data } = await supabase
        .from('medications')
        .select('id, commercial_name, generic_name, dosage')
        .eq('is_visible', true)
        .order('commercial_name')
      return data || []
    },
    staleTime: 120_000,
  })

  const validate = () => {
    const e = {}
    if (!medicationId) e.medicationId = 'Seleccione o medicamento'
    if (quantity === '' || isNaN(parseInt(quantity))) e.quantity = 'Quantidade inválida'
    if (parseInt(quantity) < 0) e.quantity = 'Quantidade não pode ser negativa'
    return e
  }

  const handleSubmit = () => {
    const e = validate()
    if (Object.keys(e).length) { setErrors(e); return }
    onSave({
      pharmacyId,
      medicationId,
      quantity: parseInt(quantity),
      unitPrice: unitPrice ? parseFloat(unitPrice) : null,
      notes: notes || null,
    })
  }

  return (
    <div className="space-y-4">
      <div>
        <label className="label">Medicamento <span className="text-red-500">*</span></label>
        {medsLoading
          ? <div className="skeleton h-11 w-full rounded-xl" />
          : <select
              value={medicationId}
              onChange={e => { setMedicationId(e.target.value); setErrors(v => ({ ...v, medicationId: '' })) }}
              className="input"
              disabled={!!initial}
            >
              <option value="">Seleccionar medicamento...</option>
              {medications.map(m => (
                <option key={m.id} value={m.id}>
                  {m.commercial_name}{m.dosage ? ` — ${m.dosage}` : ''}{m.generic_name ? ` (${m.generic_name})` : ''}
                </option>
              ))}
            </select>
        }
        {errors.medicationId && <p className="field-error">{errors.medicationId}</p>}
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div>
          <label className="label">Quantidade em stock <span className="text-red-500">*</span></label>
          <input
            type="number" min="0" step="1"
            value={quantity}
            onChange={e => { setQuantity(e.target.value); setErrors(v => ({ ...v, quantity: '' })) }}
            placeholder="0"
            className="input"
          />
          {errors.quantity && <p className="field-error">{errors.quantity}</p>}
        </div>
        <div>
          <label className="label">Preço unitário (MZN)</label>
          <input
            type="number" min="0" step="0.01"
            value={unitPrice}
            onChange={e => setUnitPrice(e.target.value)}
            placeholder="0.00"
            className="input"
          />
          <p className="label-hint">Preço nesta farmácia</p>
        </div>
      </div>

      <div>
        <label className="label">Notas</label>
        <textarea
          rows={2} value={notes}
          onChange={e => setNotes(e.target.value)}
          placeholder="Validade, lote, condições especiais..."
          className="input resize-none"
        />
      </div>

      <div className="flex gap-3 pt-2">
        <button onClick={onCancel} className="btn-secondary flex-1">Cancelar</button>
        <button onClick={handleSubmit} disabled={loading} className="btn-primary flex-1">
          {loading && <Spinner size="sm" />}
          {initial ? 'Actualizar' : 'Adicionar'}
        </button>
      </div>
    </div>
  )
}

// ── Adjustment form ───────────────────────────────────────────
function AdjustForm({ item, onSave, onCancel, loading }) {
  const [delta, setDelta]   = useState('')
  const [reason, setReason] = useState('')
  const [error, setError]   = useState('')

  const parsedDelta = parseInt(delta)
  const preview     = !isNaN(parsedDelta) ? Math.max(0, item.quantity + parsedDelta) : null

  const handleSubmit = () => {
    if (!delta || isNaN(parsedDelta)) { setError('Introduza um valor de ajuste'); return }
    if (!reason.trim()) { setError('Indique o motivo do ajuste'); return }
    onSave({ inventoryId: item.id, adjustmentQty: parsedDelta, reason })
  }

  return (
    <div className="space-y-4">
      <div className="p-4 bg-slate-50 rounded-xl border border-slate-100">
        <p className="text-xs text-slate-400 mb-0.5">Medicamento</p>
        <p className="font-semibold text-slate-900">{item.medication_name}</p>
        <p className="text-sm text-slate-500 mt-1">
          Stock actual: <strong className="text-slate-800">{item.quantity} unidades</strong>
        </p>
      </div>

      <div>
        <label className="label">Ajuste (positivo para adicionar, negativo para remover)</label>
        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={() => setDelta(d => String((parseInt(d) || 0) - 1))}
            className="btn-icon border border-slate-200 w-10 h-10 text-lg"
          >
            −
          </button>
          <input
            type="number" step="1"
            value={delta}
            onChange={e => { setDelta(e.target.value); setError('') }}
            placeholder="0"
            className="input text-center text-lg font-bold flex-1"
          />
          <button
            type="button"
            onClick={() => setDelta(d => String((parseInt(d) || 0) + 1))}
            className="btn-icon border border-slate-200 w-10 h-10 text-lg"
          >
            +
          </button>
        </div>
        {preview !== null && (
          <p className="label-hint">
            Novo stock: <strong className="text-slate-800">{preview} unidades</strong>
          </p>
        )}
      </div>

      <div>
        <label className="label">Motivo do ajuste <span className="text-red-500">*</span></label>
        <textarea
          rows={2} value={reason}
          onChange={e => { setReason(e.target.value); setError('') }}
          placeholder="Ex: Contagem física, devolução, expirado..."
          className="input resize-none"
        />
      </div>

      {error && <p className="field-error">{error}</p>}

      <div className="flex gap-3 pt-2">
        <button onClick={onCancel} className="btn-secondary flex-1">Cancelar</button>
        <button onClick={handleSubmit} disabled={loading} className="btn-primary flex-1">
          {loading && <Spinner size="sm" />}
          Aplicar ajuste
        </button>
      </div>
    </div>
  )
}

// ── Inventory table for one pharmacy ─────────────────────────
function PharmacyInventoryTable({ pharmacyId, pharmacyName, onAdd, onEdit, onAdjust, onHistory }) {
  const { data: items = [], isLoading } = usePharmacyInventory(pharmacyId)
  const removeMutation = useRemoveInventoryItem()
  const notify = useNotificationStore()
  const [confirmDelete, setConfirmDelete] = useState(null)

  const handleDelete = async (item) => {
    try {
      await removeMutation.mutateAsync(item.id)
      notify.success('Medicamento removido do inventário.')
      setConfirmDelete(null)
    } catch (err) {
      notify.error(err.message)
    }
  }

  if (isLoading) return (
    <div className="flex justify-center py-8"><Spinner size="md" /></div>
  )

  return (
    <div>
      <div className="overflow-x-auto rounded-xl border border-slate-100">
        <table className="w-full text-sm">
          <thead>
            <tr className="bg-slate-50 border-b border-slate-100">
              <th className="text-left px-4 py-3 text-xs font-extrabold text-slate-400 uppercase tracking-wide">Medicamento</th>
              <th className="text-left px-4 py-3 text-xs font-extrabold text-slate-400 uppercase tracking-wide">Estado</th>
              <th className="text-right px-4 py-3 text-xs font-extrabold text-slate-400 uppercase tracking-wide">Stock</th>
              <th className="text-right px-4 py-3 text-xs font-extrabold text-slate-400 uppercase tracking-wide">Preço unit.</th>
              <th className="text-left px-4 py-3 text-xs font-extrabold text-slate-400 uppercase tracking-wide">Actualizado</th>
              <th className="px-4 py-3 w-28"></th>
            </tr>
          </thead>
          <tbody>
            {items.length === 0 ? (
              <tr>
                <td colSpan={6} className="px-4 py-10 text-center text-slate-400 text-sm">
                  Sem medicamentos registados nesta farmácia.
                  <button onClick={onAdd} className="ml-2 text-teal-600 font-semibold hover:text-teal-700">Adicionar →</button>
                </td>
              </tr>
            ) : items.map((item, i) => (
              <tr
                key={item.id}
                className={`border-b border-slate-50 last:border-0 hover:bg-slate-50/60 transition-colors ${
                  item.status === 'OUT_OF_STOCK' ? 'opacity-60' : ''
                }`}
              >
                <td className="px-4 py-3">
                  <p className="font-semibold text-slate-900 leading-tight">{item.medication_name}</p>
                  {item.generic_name && (
                    <p className="text-xs text-slate-400 mt-0.5">{item.generic_name}{item.dosage ? ` · ${item.dosage}` : ''}</p>
                  )}
                </td>
                <td className="px-4 py-3">
                  <div className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full border text-xs font-semibold ${stockBg(item.status)}`}>
                    <span className={stockDot(item.status)} />
                    <span className={stockText(item.status)}>{STOCK_STATUS_LABEL[item.status] || item.status}</span>
                  </div>
                </td>
                <td className="px-4 py-3 text-right">
                  <span className={`text-lg font-extrabold ${stockText(item.status)}`}>{item.quantity}</span>
                  <span className="text-xs text-slate-400 ml-1">un.</span>
                </td>
                <td className="px-4 py-3 text-right text-slate-600 font-medium">
                  {fmt(item.unit_price)}
                </td>
                <td className="px-4 py-3 text-xs text-slate-400">
                  {fmtDate(item.updated_at)}
                  {item.last_updated_by_name && (
                    <p className="text-slate-300">por {item.last_updated_by_name}</p>
                  )}
                </td>
                <td className="px-4 py-3">
                  <div className="flex items-center justify-end gap-1">
                    <button onClick={() => onAdjust(item)} className="btn-icon-sm" title="Ajustar stock">
                      <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4"/>
                      </svg>
                    </button>
                    <button onClick={() => onEdit(item)} className="btn-icon-sm" title="Editar">
                      <IEdit />
                    </button>
                    <button
                      onClick={() => setConfirmDelete(item)}
                      className="btn-icon-sm text-red-400 hover:text-red-600 hover:bg-red-50"
                      title="Remover"
                    >
                      <ITrash />
                    </button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Delete confirm */}
      <Modal open={!!confirmDelete} onClose={() => setConfirmDelete(null)} title="Remover medicamento" size="sm">
        {confirmDelete && (
          <div className="space-y-4">
            <Alert type="warning">
              Vai remover <strong>{confirmDelete.medication_name}</strong> do inventário de {pharmacyName}. Esta acção não pode ser desfeita.
            </Alert>
            <div className="flex gap-3">
              <button onClick={() => setConfirmDelete(null)} className="btn-secondary flex-1">Cancelar</button>
              <button
                onClick={() => handleDelete(confirmDelete)}
                disabled={removeMutation.isPending}
                className="btn-danger flex-1"
              >
                {removeMutation.isPending && <Spinner size="sm" />}
                Remover
              </button>
            </div>
          </div>
        )}
      </Modal>
    </div>
  )
}

// ── Movement history ─────────────────────────────────────────
function MovementHistory({ pharmacyId }) {
  const { data: movements = [], isLoading } = useInventoryMovements(pharmacyId)

  const TYPE_LABEL = {
    SYNC:          'Sincronização',
    ADJUSTMENT:    'Ajuste manual',
    ORDER_RESERVE: 'Reserva (pedido)',
    ORDER_RELEASE: 'Liberação (cancelamento)',
    ORDER_FULFILL: 'Consumo (entrega)',
  }
  const TYPE_COLOR = {
    SYNC:          'text-teal-600',
    ADJUSTMENT:    'text-slate-600',
    ORDER_RESERVE: 'text-blue-600',
    ORDER_RELEASE: 'text-amber-600',
    ORDER_FULFILL: 'text-green-600',
  }

  if (isLoading) return <div className="flex justify-center py-8"><Spinner size="md" /></div>

  return (
    <div className="overflow-x-auto rounded-xl border border-slate-100">
      <table className="w-full text-sm">
        <thead>
          <tr className="bg-slate-50 border-b border-slate-100">
            <th className="text-left px-4 py-3 text-xs font-extrabold text-slate-400 uppercase tracking-wide">Medicamento</th>
            <th className="text-left px-4 py-3 text-xs font-extrabold text-slate-400 uppercase tracking-wide">Tipo</th>
            <th className="text-right px-4 py-3 text-xs font-extrabold text-slate-400 uppercase tracking-wide">Antes</th>
            <th className="text-right px-4 py-3 text-xs font-extrabold text-slate-400 uppercase tracking-wide">Alteração</th>
            <th className="text-right px-4 py-3 text-xs font-extrabold text-slate-400 uppercase tracking-wide">Depois</th>
            <th className="text-left px-4 py-3 text-xs font-extrabold text-slate-400 uppercase tracking-wide">Data</th>
          </tr>
        </thead>
        <tbody>
          {movements.length === 0 ? (
            <tr><td colSpan={6} className="px-4 py-8 text-center text-slate-400 text-sm">Sem movimentos registados.</td></tr>
          ) : movements.map(m => (
            <tr key={m.id} className="border-b border-slate-50 last:border-0 hover:bg-slate-50/60 transition-colors">
              <td className="px-4 py-3 font-medium text-slate-800">{m.medication?.commercial_name || '—'}</td>
              <td className={`px-4 py-3 text-xs font-semibold ${TYPE_COLOR[m.movement_type] || 'text-slate-500'}`}>
                {TYPE_LABEL[m.movement_type] || m.movement_type}
              </td>
              <td className="px-4 py-3 text-right text-slate-500">{m.quantity_before}</td>
              <td className={`px-4 py-3 text-right font-bold ${m.quantity_change >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                {m.quantity_change >= 0 ? '+' : ''}{m.quantity_change}
              </td>
              <td className="px-4 py-3 text-right font-semibold text-slate-800">{m.quantity_after}</td>
              <td className="px-4 py-3 text-xs text-slate-400">
                {fmtDate(m.created_at)}
                {m.performed_by_profile?.full_name && (
                  <p className="text-slate-300">{m.performed_by_profile.full_name}</p>
                )}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}

// ── Global search view ────────────────────────────────────────
function GlobalInventorySearch({ search, statusFilter }) {
  const { data: items = [], isLoading } = useInventoryOverview({ search, statusFilter })

  if (isLoading) return <div className="flex justify-center py-12"><Spinner size="lg" /></div>
  if (!items.length) return (
    <div className="card p-12 text-center">
      <p className="font-semibold text-slate-700 mb-1">Nenhum resultado</p>
      <p className="text-sm text-slate-400">Tente outro termo ou filtro.</p>
    </div>
  )

  return (
    <div className="overflow-x-auto rounded-xl border border-slate-100">
      <table className="w-full text-sm">
        <thead>
          <tr className="bg-slate-50 border-b border-slate-100">
            <th className="text-left px-4 py-3 text-xs font-extrabold text-slate-400 uppercase tracking-wide">Medicamento</th>
            <th className="text-left px-4 py-3 text-xs font-extrabold text-slate-400 uppercase tracking-wide">Farmácia</th>
            <th className="text-left px-4 py-3 text-xs font-extrabold text-slate-400 uppercase tracking-wide">Estado</th>
            <th className="text-right px-4 py-3 text-xs font-extrabold text-slate-400 uppercase tracking-wide">Stock</th>
            <th className="text-right px-4 py-3 text-xs font-extrabold text-slate-400 uppercase tracking-wide">Preço</th>
          </tr>
        </thead>
        <tbody>
          {items.map((item, i) => (
            <tr key={item.id} className={`border-b border-slate-50 last:border-0 hover:bg-slate-50/60 transition-colors ${item.status === 'OUT_OF_STOCK' ? 'opacity-60' : ''}`}>
              <td className="px-4 py-3">
                <p className="font-semibold text-slate-900">{item.medication_name}</p>
                {item.generic_name && <p className="text-xs text-slate-400">{item.generic_name}</p>}
              </td>
              <td className="px-4 py-3 text-slate-600">{item.pharmacy_name}</td>
              <td className="px-4 py-3">
                <div className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full border text-xs font-semibold ${stockBg(item.status)}`}>
                  <span className={stockDot(item.status)} />
                  <span className={stockText(item.status)}>{STOCK_STATUS_LABEL[item.status]}</span>
                </div>
              </td>
              <td className={`px-4 py-3 text-right text-base font-extrabold ${stockText(item.status)}`}>{item.quantity}</td>
              <td className="px-4 py-3 text-right text-slate-600">{fmt(item.unit_price)}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}

// ── MAIN DASHBOARD ────────────────────────────────────────────
export function StockManagerDashboard() {
  const notify = useNotificationStore()
  const [activePharmacy, setActivePharmacy] = useState(null)
  const [tab, setTab] = useState('inventory') // 'inventory' | 'history'
  const [search, setSearch] = useState('')
  const [statusFilter, setStatusFilter] = useState('ALL')
  const [modal, setModal] = useState(null) // null | 'add' | item_obj | {type:'adjust',item}

  const { data: pharmacies = [], isLoading: pharmsLoading } = usePharmacies({ includeInactive: false })
  const { data: summaryStats, isLoading: summaryLoading } = useStockSummary()
  const upsertMutation  = useUpsertInventoryItem()
  const adjustMutation  = useAdjustInventory()

  // Auto-select first pharmacy
  if (!activePharmacy && pharmacies.length > 0) setActivePharmacy(pharmacies[0].id)

  const activePharmacyName = pharmacies.find(p => p.id === activePharmacy)?.name || ''
  const isSearching = search.length > 1 || statusFilter !== 'ALL'

  const handleSaveItem = async (form) => {
    try {
      await upsertMutation.mutateAsync(form)
      notify.success(modal?.id ? 'Stock actualizado.' : 'Medicamento adicionado ao inventário.')
      setModal(null)
    } catch (err) { notify.error(err.message) }
  }

  const handleAdjust = async (form) => {
    try {
      await adjustMutation.mutateAsync(form)
      notify.success('Ajuste de stock aplicado.')
      setModal(null)
    } catch (err) { notify.error(err.message) }
  }

  return (
    <div className="max-w-7xl mx-auto px-4 md:px-6 py-6 pb-10 space-y-6">

      {/* ── Header ──────────────────────────────────────── */}
      <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-4">
        <div>
          <p className="section-label mb-1">Inventário</p>
          <h1 className="text-2xl font-extrabold text-slate-900">Gestão de Stock</h1>
          <p className="text-sm text-slate-500 mt-1">
            Sincronize, actualize e monitorize o inventário de todas as farmácias parceiras.
          </p>
        </div>
      </div>

      {/* ── Summary stats ────────────────────────────────── */}
      <SummaryBar stats={summaryStats} loading={summaryLoading} />

      {/* ── Search bar ───────────────────────────────────── */}
      <div className="flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1">
          <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none"><ISearch /></span>
          <input
            type="text" value={search}
            onChange={e => setSearch(e.target.value)}
            placeholder="Pesquisar medicamento em todas as farmácias..."
            className="input pl-10"
          />
          {search && (
            <button onClick={() => setSearch('')} className="absolute right-3 top-1/2 -translate-y-1/2 btn-icon-sm">
              <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12"/></svg>
            </button>
          )}
        </div>
        <select
          value={statusFilter}
          onChange={e => setStatusFilter(e.target.value)}
          className="input sm:w-48 shrink-0"
        >
          <option value="ALL">Todos os estados</option>
          <option value="IN_STOCK">Em stock</option>
          <option value="LOW_STOCK">Stock baixo</option>
          <option value="OUT_OF_STOCK">Sem stock</option>
        </select>
      </div>

      {/* ── Search results overlay ───────────────────────── */}
      {isSearching ? (
        <div>
          <p className="text-sm text-slate-500 mb-3">
            {search ? `Resultados para "${search}"` : 'Filtrado por estado'}
          </p>
          <GlobalInventorySearch search={search} statusFilter={statusFilter} />
        </div>
      ) : (
        /* ── Pharmacy tabs + table ─────────────────────── */
        <div className="flex flex-col lg:flex-row gap-5">

          {/* Sidebar — pharmacy list */}
          <aside className="lg:w-60 shrink-0 space-y-1">
            <p className="text-xs font-extrabold text-slate-400 uppercase tracking-widest px-1 mb-2">
              Farmácias
            </p>
            {pharmsLoading ? (
              <div className="space-y-2">
                {[1,2,3].map(i => <div key={i} className="skeleton h-12 rounded-xl" />)}
              </div>
            ) : pharmacies.length === 0 ? (
              <div className="card p-4 text-center text-sm text-slate-400">
                Sem farmácias activas.
              </div>
            ) : pharmacies.map(p => (
              <button
                key={p.id}
                onClick={() => { setActivePharmacy(p.id); setTab('inventory') }}
                className={`w-full text-left px-3 py-2.5 rounded-xl transition-colors text-sm font-medium ${
                  activePharmacy === p.id
                    ? 'bg-teal-50 border border-teal-200 text-teal-700'
                    : 'text-slate-600 hover:bg-slate-50 border border-transparent'
                }`}
              >
                <p className="font-semibold truncate">{p.name}</p>
                {p.address && <p className="text-xs text-slate-400 truncate mt-0.5">{p.address}</p>}
              </button>
            ))}
          </aside>

          {/* Main content */}
          {activePharmacy ? (
            <div className="flex-1 min-w-0 space-y-4">
              {/* Pharmacy header + actions */}
              <div className="flex items-center justify-between gap-3">
                <div>
                  <h2 className="font-extrabold text-slate-900 text-lg leading-tight">{activePharmacyName}</h2>
                  <div className="flex gap-2 mt-2">
                    <button
                      onClick={() => setTab('inventory')}
                      className={`text-sm font-semibold px-3 py-1.5 rounded-lg transition-colors ${
                        tab === 'inventory'
                          ? 'bg-teal-500 text-white'
                          : 'text-slate-500 hover:text-slate-800 hover:bg-slate-100'
                      }`}
                    >
                      Inventário
                    </button>
                    <button
                      onClick={() => setTab('history')}
                      className={`inline-flex items-center gap-1.5 text-sm font-semibold px-3 py-1.5 rounded-lg transition-colors ${
                        tab === 'history'
                          ? 'bg-teal-500 text-white'
                          : 'text-slate-500 hover:text-slate-800 hover:bg-slate-100'
                      }`}
                    >
                      <IHistory /> Histórico
                    </button>
                  </div>
                </div>
                {tab === 'inventory' && (
                  <button
                    onClick={() => setModal('add')}
                    className="btn-primary"
                  >
                    <IPlus /> Adicionar medicamento
                  </button>
                )}
              </div>

              {tab === 'inventory' ? (
                <PharmacyInventoryTable
                  pharmacyId={activePharmacy}
                  pharmacyName={activePharmacyName}
                  onAdd={() => setModal('add')}
                  onEdit={item => setModal({ ...item, _type: 'edit' })}
                  onAdjust={item => setModal({ ...item, _type: 'adjust' })}
                  onHistory={() => setTab('history')}
                />
              ) : (
                <MovementHistory pharmacyId={activePharmacy} />
              )}
            </div>
          ) : (
            <div className="flex-1 card p-12 text-center">
              <p className="text-slate-400 text-sm">Seleccione uma farmácia para gerir o stock.</p>
            </div>
          )}
        </div>
      )}

      {/* ── Modals ──────────────────────────────────────── */}

      {/* Add item */}
      <Modal open={modal === 'add'} onClose={() => setModal(null)} title="Adicionar medicamento ao inventário" size="md">
        <ItemForm
          pharmacyId={activePharmacy}
          onSave={handleSaveItem}
          onCancel={() => setModal(null)}
          loading={upsertMutation.isPending}
        />
      </Modal>

      {/* Edit item */}
      <Modal open={!!modal && modal !== 'add' && modal?._type === 'edit'} onClose={() => setModal(null)} title="Editar stock" size="md">
        {modal && modal._type === 'edit' && (
          <ItemForm
            initial={modal}
            pharmacyId={activePharmacy}
            onSave={handleSaveItem}
            onCancel={() => setModal(null)}
            loading={upsertMutation.isPending}
          />
        )}
      </Modal>

      {/* Adjust */}
      <Modal open={!!modal && modal?._type === 'adjust'} onClose={() => setModal(null)} title="Ajustar stock" size="sm">
        {modal && modal._type === 'adjust' && (
          <AdjustForm
            item={modal}
            onSave={handleAdjust}
            onCancel={() => setModal(null)}
            loading={adjustMutation.isPending}
          />
        )}
      </Modal>
    </div>
  )
}
