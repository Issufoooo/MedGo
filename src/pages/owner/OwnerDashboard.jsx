import { useQuery } from '@tanstack/react-query'
import { Link } from 'react-router-dom'
import { supabase } from '../../lib/supabase'
import { StatusBadge } from '../../components/ui/Badge'
import { Spinner } from '../../components/ui/Spinner'

const fmt = (v) => (v != null ? new Intl.NumberFormat('pt-MZ', { style: 'currency', currency: 'MZN', minimumFractionDigits: 0 }).format(v) : '—')
const fmtTs = (iso) => iso ? new Date(iso).toLocaleString('pt-MZ', { day:'2-digit', month:'short', hour:'2-digit', minute:'2-digit' }) : '—'

function IconKpi({ children, tone = 'teal' }) {
  const map = {
    slate: 'bg-slate-100 text-slate-700',
    teal: 'bg-teal-100 text-teal-700',
    green: 'bg-green-100 text-green-700',
    orange: 'bg-orange-100 text-orange-700',
    red: 'bg-red-100 text-red-700',
  }
  return <div className={`flex h-11 w-11 items-center justify-center rounded-2xl ${map[tone]}`}>{children}</div>
}

function IconChart(){return <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 12l3-3 3 3 4-4M5 19h14"/></svg>}
function IconOrders(){return <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 104 0M9 5a2 2 0 012 2h2a2 2 0 012-2"/></svg>}
function IconCheck(){return <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M5 13l4 4L19 7"/></svg>}
function IconCancel(){return <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12"/></svg>}
function IconRevenue(){return <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z"/></svg>}
function IconClock(){return <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3M12 22a10 10 0 100-20 10 10 0 000 20z"/></svg>}
function IconMedicine(){return <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10.5 6.5l7 7a3.536 3.536 0 11-5 5l-7-7a3.536 3.536 0 115-5z"/><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 9l7 7"/></svg>}
function IconMap(){return <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 20l-5.447-2.724A1 1 0 013 16.382V5.618a1 1 0 011.447-.894L9 7m0 13l6-3m-6 3V7m6 10l5.553 2.776A1 1 0 0021 18.382V7.618a1 1 0 00-.553-.894L15 4m0 13V4m-6 3l6-3"/></svg>}
function IconPharmacy(){return <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3M4 11h16M5 21h14a1 1 0 001-1V7a2 2 0 00-2-2H6a2 2 0 00-2 2v13a1 1 0 001 1z"/></svg>}
function IconUsers(){return <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-1a4 4 0 00-5.356-3.77M9 20H4v-1a4 4 0 015.356-3.77M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z"/></svg>}
function IconSettings(){return <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.427 1.756 2.925 0 3.352a1.724 1.724 0 00-1.066 2.572c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.427 1.756-2.925 1.756-3.352 0a1.724 1.724 0 00-2.572-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.427-1.756-2.925 0-3.352a1.724 1.724 0 001.066-2.572c-.94-1.543.826-3.31 2.37-2.37.996.607 2.296.07 2.572-1.065z"/><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z"/></svg>}
function IconDelivery(){return <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 17h6m-6 0a2 2 0 11-4 0m4 0a2 2 0 104 0m2 0h2a2 2 0 100 0m0 0h1a1 1 0 001-1v-3.586a1 1 0 00-.293-.707l-2.414-2.414A1 1 0 0016.586 9H15V6a1 1 0 00-1-1H5a1 1 0 00-1 1v10a1 1 0 001 1h2"/></svg>}

const KPI_CARDS = [
  { key:'total_orders', label:'Total pedidos', tone:'slate', Icon:IconOrders },
  { key:'active_orders', label:'Pedidos activos', tone:'teal', Icon:IconChart },
  { key:'delivered_today', label:'Entregues hoje', tone:'green', Icon:IconCheck },
  { key:'cancelled_today', label:'Cancelados hoje', tone:'red', Icon:IconCancel },
  { key:'pending_cancellations', label:'A aprovar', tone:'orange', Icon:IconClock },
  { key:'receita_estimada', label:'Receita estimada', tone:'teal', Icon:IconRevenue, currency:true },
]

const MANAGEMENT_AREAS = [
  { to:'/dono/cancelamentos', title:'Cancelamentos', desc:'Pedidos que exigem aprovação do dono.', state:'Pronto', tone:'orange', Icon:IconCancel },
  { to:'/dono/medicamentos', title:'Medicamentos', desc:'Catálogo, categorias e visibilidade.', state:'Pronto', tone:'teal', Icon:IconMedicine },
  { to:'/dono/farmacias', title:'Farmácias', desc:'Parceiros, contactos e notas operacionais.', state:'Pronto', tone:'blue', Icon:IconPharmacy },
  { to:'/dono/zonas', title:'Zonas e taxas', desc:'Cobertura e regras de entrega por distância.', state:'Pronto', tone:'green', Icon:IconMap },
  { to:'/dono/utilizadores', title:'Utilizadores', desc:'Gestão de acessos da equipa.', state:'Em preparação', tone:'violet', Icon:IconUsers },
  { to:'/dono/configuracoes', title:'Configurações', desc:'WhatsApp templates, números e parâmetros globais.', state:'Pronto', tone:'slate', Icon:IconSettings },
  { to:'/dashboard', title:'Operação', desc:'Ver o painel do operador e pedidos activos.', state:'Pronto', tone:'indigo', Icon:IconOrders },
  { to:'/stock',     title:'Stock',    desc:'Inventário das farmácias e disponibilidade de medicamentos.', state:'Pronto', tone:'blue',   Icon:IconPharmacy },
  { to:'/motoboy', title:'Entregas', desc:'Ver a experiência da equipa de entrega.', state:'Pronto', tone:'cyan', Icon:IconDelivery },
]

const TONE_STYLES = {
  slate: 'bg-slate-50 border-slate-200 text-slate-700',
  teal: 'bg-teal-50 border-teal-200 text-teal-700',
  green: 'bg-green-50 border-green-200 text-green-700',
  orange: 'bg-orange-50 border-orange-200 text-orange-700',
  red: 'bg-red-50 border-red-200 text-red-700',
  violet: 'bg-violet-50 border-violet-200 text-violet-700',
  blue: 'bg-blue-50 border-blue-200 text-blue-700',
  indigo: 'bg-indigo-50 border-indigo-200 text-indigo-700',
  cyan: 'bg-cyan-50 border-cyan-200 text-cyan-700',
}

function StatePill({ state }) {
  const map = {
    'Pronto': 'bg-green-50 text-green-700 border-green-200',
    'Parcial': 'bg-amber-50 text-amber-700 border-amber-200',
    'Em preparação': 'bg-slate-50 text-slate-600 border-slate-200',
  }
  return <span className={`inline-flex items-center rounded-full border px-2.5 py-1 text-[11px] font-semibold ${map[state]}`}>{state}</span>
}

export function OwnerDashboard() {
  const { data: stats, isLoading: statsLoading } = useQuery({
    queryKey: ['dashboard-stats'],
    queryFn: async () => {
      const { data } = await supabase.rpc('get_dashboard_stats')
      return Array.isArray(data) ? data[0] : data
    },
    refetchInterval: 30000,
  })

  const { data: recentOrders = [], isLoading: recentLoading } = useQuery({
    queryKey: ['recent-orders'],
    queryFn: async () => {
      const { data } = await supabase
        .from('orders')
        .select('id,status,medication_name_snapshot,total_price,created_at,customer:customers(full_name)')
        .order('created_at', { ascending: false })
        .limit(8)
      return data || []
    },
    refetchInterval: 20000,
  })

  const { data: pendingCancels = [] } = useQuery({
    queryKey: ['pending-cancellation-requests'],
    queryFn: async () => {
      const { data } = await supabase
        .from('cancellation_requests')
        .select('id,reason,created_at,order:orders(medication_name_snapshot),requested_by_profile:profiles!cancellation_requests_requested_by_fkey(full_name)')
        .eq('status', 'PENDING')
        .order('created_at', { ascending: false })
      return data || []
    },
    refetchInterval: 30000,
  })

  const { data: liveSummary = [] } = useQuery({
    queryKey: ['owner-live-summary'],
    queryFn: async () => {
      const { data } = await supabase
        .from('orders')
        .select('status')
        .in('status', ['NEW', 'PRESCRIPTION_PENDING', 'IN_VALIDATION', 'AWAITING_CLIENT', 'IN_DELIVERY'])
      return data || []
    },
    refetchInterval: 15000,
  })

  // Estimated revenue from delivered orders today
  const { data: revenueData } = useQuery({
    queryKey: ['owner-revenue-today'],
    queryFn: async () => {
      const today = new Date()
      today.setHours(0, 0, 0, 0)
      const { data } = await supabase
        .from('orders')
        .select('total_price')
        .eq('status', 'DELIVERED')
        .gte('delivered_at', today.toISOString())   // use delivered_at — accurate delivery date
        .not('total_price', 'is', null)
      return (data || []).reduce((sum, row) => sum + (parseFloat(row.total_price) || 0), 0)
    },
    refetchInterval: 60000,
  })

  const liveCounts = liveSummary.reduce((acc, row) => {
    acc[row.status] = (acc[row.status] || 0) + 1
    return acc
  }, {})

  // Merge revenue into stats object for KPI display
  const statsWithRevenue = stats ? { ...stats, receita_estimada: revenueData ?? 0 } : undefined

  return (
    <div className="max-w-7xl mx-auto px-4 md:px-6 lg:px-8 py-6 md:py-8 space-y-8">
      <section className="relative overflow-hidden rounded-[28px] border border-white/10 bg-[linear-gradient(155deg,#0d9488_0%,#0f766e_25%,#0a192f_100%)] px-6 py-7 text-white shadow-lg">
        <div className="absolute inset-0 dot-pattern opacity-60" />
        <div className="absolute -right-12 -top-12 h-44 w-44 rounded-full bg-teal-300/10 blur-3xl" />
        <div className="absolute -left-10 bottom-0 h-32 w-32 rounded-full bg-orange-400/10 blur-3xl" />
        <div className="relative flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
          <div>
            <p className="text-xs font-extrabold uppercase tracking-[0.22em] text-white/70">Visão do negócio</p>
            <h1 className="mt-2 text-2xl md:text-3xl font-extrabold leading-tight">Painel do proprietário</h1>
            <p className="mt-2 max-w-2xl text-sm text-white/70">
              Acompanhe o estado da operação, identifique bloqueios e entre rapidamente nas áreas de gestão da plataforma.
            </p>
          </div>
          <div className="grid grid-cols-2 gap-2 sm:grid-cols-4 lg:w-[420px]">
            {[
              { label:'Novos', value: liveCounts.NEW || 0 },
              { label:'Receitas', value: liveCounts.PRESCRIPTION_PENDING || 0 },
              { label:'Validação', value: liveCounts.IN_VALIDATION || 0 },
              { label:'Em rota', value: liveCounts.IN_DELIVERY || 0 },
            ].map((item) => (
              <div key={item.label} className="rounded-2xl border border-white/10 bg-white/10 px-3 py-3 backdrop-blur-sm">
                <p className="text-lg font-extrabold">{item.value}</p>
                <p className="mt-0.5 text-[11px] font-semibold uppercase tracking-wide text-white/65">{item.label}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className="grid grid-cols-2 gap-3 lg:grid-cols-3 xl:grid-cols-6">
        {KPI_CARDS.map(({ key, label, tone, Icon, currency }) => {
          const rawValue = statsWithRevenue?.[key]
          const displayValue = statsLoading
            ? null
            : currency && rawValue != null
              ? fmt(rawValue)
              : (rawValue ?? 0)
          return (
            <div key={key} className="card p-4">
              <div className="flex items-start justify-between gap-2 mb-2">
                <IconKpi tone={tone}><Icon /></IconKpi>
              </div>
              {statsLoading
                ? <div className="skeleton h-7 w-16 rounded-lg mb-1" />
                : <p className={`font-extrabold text-slate-900 leading-tight ${currency ? 'text-lg' : 'text-2xl'}`}>{displayValue}</p>
              }
              <p className="mt-1 text-xs text-slate-500 font-medium leading-tight">{label}</p>
            </div>
          )
        })}
      </section>

      {pendingCancels.length > 0 && (
        <section className="card overflow-hidden border-orange-200">
          <div className="flex items-center justify-between border-b border-orange-100 bg-orange-50 px-5 py-4">
            <div>
              <p className="text-sm font-extrabold text-orange-900">Atenção imediata</p>
              <p className="text-xs text-orange-700/80 mt-0.5">Existem pedidos de cancelamento à espera de decisão.</p>
            </div>
            <Link to="/dono/cancelamentos" className="btn-accent-sm">Rever agora</Link>
          </div>
          <div className="divide-y divide-slate-100">
            {pendingCancels.slice(0, 3).map((item) => (
              <div key={item.id} className="px-5 py-4">
                <div className="flex flex-col gap-1 md:flex-row md:items-center md:justify-between">
                  <div>
                    <p className="font-semibold text-slate-900">{item.order?.medication_name_snapshot}</p>
                    <p className="text-sm text-slate-500">Pedido por {item.requested_by_profile?.full_name || 'Equipa'} · {fmtTs(item.created_at)}</p>
                  </div>
                  <p className="text-sm text-slate-600 md:max-w-[420px]">{item.reason}</p>
                </div>
              </div>
            ))}
          </div>
        </section>
      )}

      <section>
        <div className="mb-4 flex items-center justify-between gap-3">
          <div>
            <h2 className="text-xl font-extrabold text-slate-900">Áreas de gestão</h2>
            <p className="text-sm text-slate-500 mt-0.5">Mantivemos todas as áreas previstas e demos contexto claro ao que já está pronto e ao que continua em evolução.</p>
          </div>
        </div>
        <div className="grid grid-cols-1 gap-3 md:grid-cols-2 xl:grid-cols-4">
          {MANAGEMENT_AREAS.map(({ to, title, desc, state, tone, Icon }) => (
            <Link key={to} to={to} className="group card p-5 transition-all hover:-translate-y-0.5 hover:shadow-md">
              <div className="flex items-start justify-between gap-3">
                <div className={`flex h-12 w-12 items-center justify-center rounded-2xl border ${TONE_STYLES[tone] || TONE_STYLES.slate}`}>
                  <Icon />
                </div>
                <StatePill state={state} />
              </div>
              <h3 className="mt-4 font-extrabold text-slate-900 group-hover:text-teal-700 transition-colors">{title}</h3>
              <p className="mt-2 text-sm leading-relaxed text-slate-500">{desc}</p>
              <div className="mt-4 inline-flex items-center gap-1.5 text-sm font-semibold text-teal-600">
                Abrir área
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7"/></svg>
              </div>
            </Link>
          ))}
        </div>
      </section>

      <section>
        <div className="mb-4 flex items-center justify-between gap-3">
          <div>
            <h2 className="text-xl font-extrabold text-slate-900">Pedidos recentes</h2>
            <p className="text-sm text-slate-500 mt-0.5">Últimos pedidos criados na plataforma.</p>
          </div>
          <Link to="/dashboard" className="text-sm font-semibold text-teal-600 hover:text-teal-800">Ir para operação →</Link>
        </div>

        {recentLoading ? (
          <div className="card p-10 flex justify-center"><Spinner size="md" /></div>
        ) : recentOrders.length === 0 ? (
          <div className="card p-12 text-center">
            <p className="font-extrabold text-slate-700">Ainda não há pedidos registados</p>
            <p className="mt-1 text-sm text-slate-400">Assim que a operação começar, os pedidos aparecerão aqui.</p>
          </div>
        ) : (
          <div className="card overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-slate-100 bg-slate-50/70">
                    {['Medicamento', 'Cliente', 'Estado', 'Valor', 'Data'].map((head) => (
                      <th key={head} className="px-4 py-3 text-left text-[11px] font-extrabold uppercase tracking-widest text-slate-400">{head}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {recentOrders.map((order, index) => (
                    <tr key={order.id} className={`border-b border-slate-50 last:border-0 ${index % 2 === 1 ? 'bg-slate-50/30' : ''}`}>
                      <td className="px-4 py-3 font-semibold text-slate-800">{order.medication_name_snapshot}</td>
                      <td className="px-4 py-3 text-slate-500">{order.customer?.full_name || '—'}</td>
                      <td className="px-4 py-3"><StatusBadge status={order.status} /></td>
                      <td className="px-4 py-3 font-extrabold text-teal-700">{fmt(order.total_price)}</td>
                      <td className="px-4 py-3 text-xs font-medium text-slate-400">{fmtTs(order.created_at)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </section>
    </div>
  )
}
