import { useState } from 'react'
import { Link } from 'react-router-dom'
import { useCustomers, useCustomerOrders } from '../../hooks/useCustomers'
import { useNotificationStore } from '../../store/notificationStore'
import { addToBlacklist, removeFromBlacklist } from '../../services/blacklistService'
import { useAuthStore } from '../../store/authStore'
import { supabase } from '../../lib/supabase'
import { StatusBadge } from '../../components/ui/Badge'
import { Modal } from '../../components/ui/Modal'
import { Alert } from '../../components/ui/Alert'
import { useQueryClient } from '@tanstack/react-query'

const fmt = v => v != null
  ? new Intl.NumberFormat('pt-MZ', { style: 'currency', currency: 'MZN', minimumFractionDigits: 0 }).format(v)
  : '—'

const fmtDate = iso => iso
  ? new Date(iso).toLocaleString('pt-MZ', { day: '2-digit', month: 'short', year: 'numeric' })
  : '—'

const fmtDateTime = iso => iso
  ? new Date(iso).toLocaleString('pt-MZ', { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' })
  : '—'

// ── Skeleton row ──────────────────────────────────────────────

function SkeletonRow() {
  return (
    <tr className="table-body-row">
      {[1,2,3,4,5].map(i => (
        <td key={i} className="table-cell">
          <div className="skeleton h-4 rounded-lg w-full" />
        </td>
      ))}
    </tr>
  )
}

// ── Empty state ───────────────────────────────────────────────

function EmptyState({ search }) {
  return (
    <div className="flex flex-col items-center justify-center py-16 px-4 text-center">
      <div className="w-16 h-16 rounded-2xl bg-slate-100 flex items-center justify-center mb-4">
        <svg className="w-8 h-8 text-slate-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z"/>
        </svg>
      </div>
      <h3 className="text-base font-extrabold text-slate-800 mb-1">
        {search ? 'Nenhum cliente encontrado' : 'Ainda sem clientes'}
      </h3>
      <p className="text-sm text-slate-400 max-w-xs">
        {search
          ? `Nenhum resultado para "${search}". Tente pesquisar por nome ou número WhatsApp.`
          : 'Os clientes aparecerão aqui assim que fizerem os primeiros pedidos na plataforma.'}
      </p>
    </div>
  )
}

// ── Customer orders modal ─────────────────────────────────────

function CustomerOrdersModal({ customer, onClose }) {
  const { data: orders = [], isLoading } = useCustomerOrders(customer?.id)

  if (!customer) return null

  return (
    <Modal open onClose={onClose} title={`Histórico — ${customer.full_name}`} size="lg">
      <div className="space-y-4">
        {/* Customer info */}
        <div className="rounded-2xl bg-slate-50 border border-slate-100 p-4 flex flex-wrap gap-4">
          <div>
            <p className="text-xs text-slate-400 font-medium">WhatsApp</p>
            <p className="text-sm font-extrabold text-slate-800">{customer.whatsapp_number}</p>
          </div>
          <div>
            <p className="text-xs text-slate-400 font-medium">Zona</p>
            <p className="text-sm font-extrabold text-slate-800">{customer.zone?.name || '—'}</p>
          </div>
          <div>
            <p className="text-xs text-slate-400 font-medium">Primeiro pedido</p>
            <p className="text-sm font-extrabold text-slate-800">{fmtDate(customer.created_at)}</p>
          </div>
          <div>
            <p className="text-xs text-slate-400 font-medium">Último pedido</p>
            <p className="text-sm font-extrabold text-slate-800">{fmtDate(customer.last_order_at)}</p>
          </div>
          {customer.address_notes && (
            <div className="w-full">
              <p className="text-xs text-slate-400 font-medium">Morada habitual</p>
              <p className="text-sm text-slate-700">{customer.address_notes}</p>
            </div>
          )}
        </div>

        {customer.is_blacklisted && (
          <Alert type="warning">
            Este cliente está na lista negra. Os pedidos são aceites mas a equipa é alertada automaticamente.
          </Alert>
        )}

        {/* Orders list */}
        <div>
          <h4 className="text-xs font-extrabold uppercase tracking-widest text-slate-400 mb-3">
            Pedidos ({orders.length})
          </h4>

          {isLoading ? (
            <div className="space-y-2">
              {[1,2,3].map(i => <div key={i} className="skeleton h-14 rounded-xl" />)}
            </div>
          ) : orders.length === 0 ? (
            <p className="text-sm text-slate-400 text-center py-6">Sem pedidos registados.</p>
          ) : (
            <div className="space-y-2 max-h-64 overflow-y-auto pr-1">
              {orders.map(order => (
                <Link
                  key={order.id}
                  to={`/dashboard/pedido/${order.id}`}
                  onClick={onClose}
                  className="flex items-center justify-between gap-3 rounded-xl border border-slate-100 bg-white px-4 py-3 hover:border-teal-200 hover:bg-teal-50/40 transition-colors"
                >
                  <div className="min-w-0 flex-1">
                    <p className="text-sm font-extrabold text-slate-900 truncate">{order.medication_name_snapshot}</p>
                    <p className="text-xs text-slate-400 mt-0.5">{fmtDateTime(order.created_at)}</p>
                  </div>
                  <div className="flex items-center gap-3 shrink-0">
                    {order.total_price && (
                      <span className="text-sm font-semibold text-slate-700">{fmt(order.total_price)}</span>
                    )}
                    <StatusBadge status={order.status} />
                  </div>
                </Link>
              ))}
            </div>
          )}
        </div>

        <div className="flex justify-end">
          <button onClick={onClose} className="btn-secondary">Fechar</button>
        </div>
      </div>
    </Modal>
  )
}

// ── Main page ─────────────────────────────────────────────────

export function CustomerListPage() {
  const [search, setSearch] = useState('')
  const [debouncedSearch, setDebouncedSearch] = useState('')
  const [page, setPage] = useState(1)
  const [selectedCustomer, setSelectedCustomer] = useState(null)
  const [blacklistConfirm, setBlacklistConfirm] = useState(null)
  const notify = useNotificationStore()
  const qc = useQueryClient()

  const pageSize = 25

  const { data, isLoading } = useCustomers({
    page,
    pageSize,
    search: debouncedSearch,
  })

  const customers = data?.customers || []
  const total = data?.total || 0
  const totalPages = Math.ceil(total / pageSize)

  const handleSearch = (val) => {
    setSearch(val)
    clearTimeout(window.__customerSearchTimer)
    window.__customerSearchTimer = setTimeout(() => {
      setDebouncedSearch(val)
      setPage(1)
    }, 350)
  }

  const { profile } = useAuthStore()

  const handleBlacklistToggle = async () => {
    if (!blacklistConfirm) return
    const { customer, action } = blacklistConfirm
    try {
      if (action === 'add') {
        await addToBlacklist({
          customerId: customer.id,
          whatsappNumber: customer.whatsapp_number,
          severity: 'LOW',
          reason: 'Adicionado manualmente pelo operador',
          addedBy: profile?.id,
          addedByRole: profile?.role,
        })
      } else {
        // Find active entry then call service to get proper audit log
        const { data: entries } = await supabase
          .from('blacklist')
          .select('id')
          .eq('whatsapp_number', customer.whatsapp_number)
          .eq('is_active', true)
          .limit(1)

        if (entries?.length) {
          await removeFromBlacklist({
            blacklistId: entries[0].id,
            removedBy: profile?.id,
            removedByRole: profile?.role,
          })
          // Unflag customer record
          await supabase.from('customers')
            .update({ is_blacklisted: false })
            .eq('id', customer.id)
        }
      }
      notify.success(action === 'add' ? 'Cliente adicionado à lista negra.' : 'Cliente removido da lista negra.')
      qc.invalidateQueries({ queryKey: ['customers'] })
    } catch (err) {
      notify.error(err.message)
    } finally {
      setBlacklistConfirm(null)
    }
  }

  return (
    <div className="page-wrap animate-fade-in">
      {/* Header */}
      <div className="relative overflow-hidden rounded-[28px] border border-white/10 bg-[linear-gradient(155deg,#0a192f_0%,#0d2a3e_60%,#0f3460_100%)] px-6 py-7 text-white shadow-lg mb-6">
        <div className="absolute inset-0 dot-pattern opacity-40" />
        <div className="absolute -right-8 -top-8 h-40 w-40 rounded-full bg-teal-400/10 blur-3xl" />
        <div className="relative flex items-start justify-between gap-4">
          <div>
            <p className="text-xs font-extrabold uppercase tracking-[0.22em] text-white/60 mb-1">Gestão de clientes</p>
            <h1 className="text-2xl font-extrabold">Clientes</h1>
            <p className="mt-1 text-sm text-white/60">
              {total > 0 ? `${total} clientes registados na plataforma` : 'Histórico de clientes e pedidos'}
            </p>
          </div>
          <div className="shrink-0 w-12 h-12 rounded-2xl bg-white/10 flex items-center justify-center">
            <svg className="w-6 h-6 text-teal-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z"/>
            </svg>
          </div>
        </div>
      </div>

      {/* Search */}
      <div className="relative mb-5">
        <div className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3.5">
          <svg className="w-4 h-4 text-slate-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"/>
          </svg>
        </div>
        <input
          type="text"
          value={search}
          onChange={e => handleSearch(e.target.value)}
          placeholder="Pesquisar por nome ou WhatsApp..."
          className="input pl-10"
        />
      </div>

      {/* Table */}
      <div className="card overflow-hidden">
        <div className="overflow-x-auto scroll-x">
          <table className="w-full min-w-[640px]">
            <thead>
              <tr className="table-head-row">
                <th className="table-head-cell">Cliente</th>
                <th className="table-head-cell">WhatsApp</th>
                <th className="table-head-cell">Zona</th>
                <th className="table-head-cell">Pedidos</th>
                <th className="table-head-cell">Último pedido</th>
                <th className="table-head-cell w-10" />
              </tr>
            </thead>
            <tbody>
              {isLoading ? (
                Array.from({ length: 8 }).map((_, i) => <SkeletonRow key={i} />)
              ) : customers.length === 0 ? (
                <tr>
                  <td colSpan={6}>
                    <EmptyState search={debouncedSearch} />
                  </td>
                </tr>
              ) : (
                customers.map(c => (
                  <tr
                    key={c.id}
                    className="table-body-row cursor-pointer hover:bg-teal-50/40 transition-colors"
                    onClick={() => setSelectedCustomer(c)}
                  >
                    <td className="table-cell">
                      <div className="flex items-center gap-2.5">
                        <div className={`w-8 h-8 rounded-full flex items-center justify-center text-xs font-extrabold shrink-0 ${
                          c.is_blacklisted ? 'bg-red-100 text-red-700' : 'bg-teal-100 text-teal-700'
                        }`}>
                          {c.full_name?.charAt(0)?.toUpperCase() || '?'}
                        </div>
                        <div className="min-w-0">
                          <p className="text-sm font-extrabold text-slate-900 truncate">{c.full_name || '—'}</p>
                          {c.is_blacklisted && (
                            <span className="inline-flex items-center gap-1 text-[10px] font-bold text-red-600 bg-red-50 rounded-full px-1.5 py-0.5 border border-red-200">
                              <span className="w-1 h-1 rounded-full bg-red-500" />
                              Lista negra
                            </span>
                          )}
                        </div>
                      </div>
                    </td>
                    <td className="table-cell">
                      <span className="text-sm font-mono text-slate-600">{c.whatsapp_number}</span>
                    </td>
                    <td className="table-cell">
                      <span className="text-sm text-slate-600">{c.zone?.name || '—'}</span>
                    </td>
                    <td className="table-cell">
                      <span className="inline-flex items-center justify-center w-7 h-7 rounded-full bg-teal-50 text-teal-700 text-xs font-extrabold">
                        {c.orders?.[0]?.count ?? 0}
                      </span>
                    </td>
                    <td className="table-cell">
                      <span className="text-sm text-slate-500">{fmtDate(c.last_order_at)}</span>
                    </td>
                    <td className="table-cell" onClick={e => e.stopPropagation()}>
                      <button
                        onClick={e => {
                          e.stopPropagation()
                          setBlacklistConfirm({
                            customer: c,
                            action: c.is_blacklisted ? 'remove' : 'add',
                          })
                        }}
                        className="btn-icon-sm text-slate-400 hover:text-red-500"
                        title={c.is_blacklisted ? 'Remover da lista negra' : 'Adicionar à lista negra'}
                      >
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M18.364 18.364A9 9 0 005.636 5.636m12.728 12.728A9 9 0 015.636 5.636m12.728 12.728L5.636 5.636"/>
                        </svg>
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        {/* Pagination */}
        {totalPages > 1 && (
          <div className="flex items-center justify-between gap-4 px-5 py-4 border-t border-slate-100">
            <p className="text-xs text-slate-400">
              {(page - 1) * pageSize + 1}–{Math.min(page * pageSize, total)} de {total} clientes
            </p>
            <div className="flex gap-2">
              <button
                onClick={() => setPage(p => Math.max(1, p - 1))}
                disabled={page === 1}
                className="btn-secondary btn-sm"
              >
                ← Anterior
              </button>
              <button
                onClick={() => setPage(p => Math.min(totalPages, p + 1))}
                disabled={page === totalPages}
                className="btn-secondary btn-sm"
              >
                Seguinte →
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Customer orders modal */}
      {selectedCustomer && (
        <CustomerOrdersModal
          customer={selectedCustomer}
          onClose={() => setSelectedCustomer(null)}
        />
      )}

      {/* Blacklist confirm modal */}
      <Modal
        open={!!blacklistConfirm}
        onClose={() => setBlacklistConfirm(null)}
        title={blacklistConfirm?.action === 'add' ? 'Adicionar à lista negra' : 'Remover da lista negra'}
        size="sm"
      >
        <Alert type="warning">
          {blacklistConfirm?.action === 'add'
            ? `${blacklistConfirm?.customer?.full_name} será marcado como lista negra. Os pedidos continuarão a ser aceites mas a equipa será alertada.`
            : `${blacklistConfirm?.customer?.full_name} será removido da lista negra.`}
        </Alert>
        <div className="flex gap-3 mt-4">
          <button onClick={() => setBlacklistConfirm(null)} className="btn-secondary flex-1">
            Cancelar
          </button>
          <button
            onClick={handleBlacklistToggle}
            className={blacklistConfirm?.action === 'add' ? 'btn-danger flex-1' : 'btn-primary flex-1'}
          >
            {blacklistConfirm?.action === 'add' ? 'Adicionar' : 'Remover'}
          </button>
        </div>
      </Modal>
    </div>
  )
}
