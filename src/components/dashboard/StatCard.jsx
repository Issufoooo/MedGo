const COLORS = {
  slate:  { icon: 'bg-slate-100 text-slate-500',   val: 'text-slate-800'   },
  teal:   { icon: 'bg-teal-50   text-teal-600',    val: 'text-teal-700'    },
  green:  { icon: 'bg-green-50  text-green-600',   val: 'text-green-700'   },
  red:    { icon: 'bg-red-50    text-red-500',     val: 'text-red-600'     },
  orange: { icon: 'bg-orange-50 text-orange-500',  val: 'text-orange-700'  },
  blue:   { icon: 'bg-blue-50   text-blue-600',    val: 'text-blue-700'    },
  violet: { icon: 'bg-violet-50 text-violet-600',  val: 'text-violet-700'  },
}

export function StatCard({ icon, label, value, sub, color = 'teal', loading = false }) {
  const c = COLORS[color] || COLORS.teal
  return (
    <div className="stat-card">
      <div className={`stat-icon ${c.icon}`}>{icon}</div>
      <div className="min-w-0">
        <p className="text-xs font-semibold text-slate-400 mb-0.5 leading-tight">{label}</p>
        {loading
          ? <div className="skeleton h-7 w-14 rounded-lg" />
          : <p className={`text-2xl font-extrabold leading-none ${c.val}`}>{value ?? '—'}</p>
        }
        {sub && <p className="text-xs text-slate-400 mt-1 font-medium">{sub}</p>}
      </div>
    </div>
  )
}
