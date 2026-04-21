import { useState } from 'react'
import { useOrders, useOrderCounts } from '../../hooks/useOrders'
import { OrderCard } from '../../components/dashboard/OrderCard'
import { Spinner } from '../../components/ui/Spinner'

function IconGrid(){return <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16"/></svg>}
function IconNew(){return <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4"/></svg>}
function IconRx(){return <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19.428 15.428a4 4 0 00-5.656-5.656L6 17.544V20h2.456l7.772-7.772z"/></svg>}
function IconSearch(){return <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-4.35-4.35M17 11A6 6 0 115 11a6 6 0 0112 0z"/></svg>}
function IconClient(){return <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 8h2a2 2 0 012 2v8a2 2 0 01-2 2h-2M9 8h6M7 21h10M9 12h6"/></svg>}
function IconCheck(){return <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M5 13l4 4L19 7"/></svg>}
function IconDelivery(){return <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 17h6m-6 0a2 2 0 11-4 0m4 0a2 2 0 104 0m2 0h2a2 2 0 100 0m0 0h1a1 1 0 001-1v-3.586a1 1 0 00-.293-.707l-2.414-2.414A1 1 0 0016.586 9H15V6a1 1 0 00-1-1H5a1 1 0 00-1 1v10a1 1 0 001 1h2"/></svg>}

const FILTERS = [
  { value:'ALL', label:'Todos', Icon:IconGrid },
  { value:'NEW', label:'Novos', Icon:IconNew },
  { value:'PRESCRIPTION_PENDING', label:'Receita', Icon:IconRx },
  { value:'IN_VALIDATION', label:'Validação', Icon:IconSearch },
  { value:'AWAITING_CLIENT', label:'Cliente', Icon:IconClient },
  { value:'CONFIRMED', label:'Confirmados', Icon:IconCheck },
  { value:'IN_DELIVERY', label:'Em entrega', Icon:IconDelivery },
]

const STAT_PILLS = [
  { key:'NEW', label:'Novos', style:'bg-blue-50 text-blue-700 ring-blue-200' },
  { key:'IN_VALIDATION', label:'Validação', style:'bg-violet-50 text-violet-700 ring-violet-200' },
  { key:'CONFIRMED', label:'Confirmados', style:'bg-teal-50 text-teal-700 ring-teal-200' },
  { key:'IN_DELIVERY', label:'Em entrega', style:'bg-cyan-50 text-cyan-700 ring-cyan-200' },
]

function EmptyOrders({ filter }) {
  return (
    <div className="flex flex-col items-center justify-center px-6 py-24 text-center">
      <div className="flex h-20 w-20 items-center justify-center rounded-3xl bg-slate-100 mb-5 text-slate-500">
        {filter === 'ALL' ? <IconGrid /> : <IconCheck />}
      </div>
      <p className="font-extrabold text-slate-700 mb-1">{filter === 'ALL' ? 'Sem pedidos activos' : 'Nenhum pedido neste estado'}</p>
      <p className="max-w-[240px] text-sm text-slate-400">{filter === 'ALL' ? 'Novos pedidos aparecerão aqui em tempo real assim que forem criados pelos clientes.' : 'Escolha outro filtro para continuar a acompanhar a operação.'}</p>
    </div>
  )
}

export function OperatorDashboard() {
  const [filter, setFilter] = useState('ALL')
  const [search, setSearch] = useState('')

  const { data: orders = [], isLoading, isFetching } = useOrders({ statusFilter: filter, search })
  const { data: counts = {} } = useOrderCounts()

  const urgent = (counts.NEW || 0) + (counts.PRESCRIPTION_PENDING || 0)

  return (
    <div className="flex h-full flex-col bg-slate-50">
      <div className="border-b border-slate-100 bg-white px-4 py-4 md:px-6 shrink-0 space-y-4">
        <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
          <div>
            <h1 className="text-xl font-extrabold text-slate-900">Operação de pedidos</h1>
            <p className="mt-1 text-sm text-slate-400">Visualize entradas recentes, confirme pendências e avance rapidamente cada pedido.</p>
          </div>
          <div className="flex items-center gap-3">
            <span className="text-xs font-medium text-slate-400 flex items-center gap-1.5">
              {counts._total ?? 0} activos
              {isFetching && <span className="h-3 w-3 rounded-full border border-teal-400 border-t-transparent animate-spin" />}
            </span>
            {urgent > 0 && (
              <div className="inline-flex items-center gap-2 rounded-xl border border-orange-200 bg-orange-50 px-3 py-1.5 text-sm font-extrabold text-orange-700">
                <span className="h-2 w-2 rounded-full bg-orange-500 animate-pulse2" />
                {urgent} prioridade{urgent > 1 ? 's' : ''}
              </div>
            )}
          </div>
        </div>

        <div className="grid grid-cols-2 gap-2 md:grid-cols-4">
          {STAT_PILLS.map((pill) => (
            <button
              key={pill.key}
              onClick={() => setFilter(pill.key)}
              className={`rounded-2xl p-3 text-left ring-1 transition-all hover:opacity-95 ${pill.style} ${filter === pill.key ? 'shadow-sm' : ''}`}
            >
              <p className="text-xl font-extrabold">{counts[pill.key] || 0}</p>
              <p className="mt-0.5 text-xs font-semibold opacity-75">{pill.label}</p>
            </button>
          ))}
        </div>

        <div className="relative">
          <span className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400"><IconSearch /></span>
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Pesquisar por medicamento ou cliente..."
            className="input pl-10 text-sm"
          />
          {search && (
            <button onClick={() => setSearch('')} className="absolute right-3.5 top-1/2 -translate-y-1/2 btn-icon-sm">
              <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12"/></svg>
            </button>
          )}
        </div>

        <div className="scroll-x flex gap-2 pb-0.5">
          {FILTERS.map(({ value, label, Icon }) => {
            const count = value === 'ALL' ? counts._total : counts[value]
            const active = filter === value
            return (
              <button
                key={value}
                onClick={() => setFilter(value)}
                className={`inline-flex items-center gap-2 rounded-xl px-3 py-2 text-xs font-semibold whitespace-nowrap transition-all ${active ? 'bg-teal-500 text-white shadow-sm' : 'bg-slate-100 text-slate-600 hover:bg-slate-200'}`}
              >
                <Icon />
                {label}
                {count > 0 && <span className={`rounded-full px-1.5 py-0.5 text-[10px] font-bold ${active ? 'bg-white/20 text-white' : 'bg-white border border-slate-200 text-slate-600'}`}>{count}</span>}
              </button>
            )
          })}
        </div>
      </div>

      <div className="flex-1 overflow-y-auto">
        {isLoading ? (
          <div className="flex flex-col items-center justify-center py-20 gap-3">
            <Spinner size="lg" />
            <p className="text-sm text-slate-400">A carregar pedidos...</p>
          </div>
        ) : orders.length === 0 ? (
          <EmptyOrders filter={filter} />
        ) : (
          <div className="space-y-2 p-3">
            {orders.map((order) => <OrderCard key={order.id} order={order} />)}
          </div>
        )}
      </div>
    </div>
  )
}
