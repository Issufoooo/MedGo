const SEVERITY_CFG = {
  LOW:     { cls: 'bg-yellow-50 border-yellow-300', title: 'text-yellow-800', dot: 'bg-yellow-400', label: 'Nível Baixo'    },
  MEDIUM:  { cls: 'bg-orange-50 border-orange-300', title: 'text-orange-800', dot: 'bg-orange-400', label: 'Nível Médio'    },
  HIGH:    { cls: 'bg-red-50    border-red-300',    title: 'text-red-800',    dot: 'bg-red-500',    label: 'Nível Alto'     },
  BLOCKED: { cls: 'bg-red-100   border-red-500',    title: 'text-red-900',    dot: 'bg-red-600',    label: 'BLOQUEADO'    },
}

export function BlacklistAlert({ entry }) {
  if (!entry) return null
  const cfg = SEVERITY_CFG[entry.severity] || SEVERITY_CFG.MEDIUM
  return (
    <div className={`flex items-start gap-3 p-4 rounded-xl border-2 ${cfg.cls}`}>
      <span className={`w-2.5 h-2.5 rounded-full ${cfg.dot} shrink-0 mt-1.5`} />
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2 mb-1">
          <p className={`font-extrabold text-sm ${cfg.title}`}>Cliente em Lista Negra</p>
          <span className={`text-xs font-bold px-1.5 py-0.5 rounded-full bg-white/60 ${cfg.title}`}>
            {cfg.label}
          </span>
        </div>
        <p className={`text-sm ${cfg.title} opacity-80`}>
          <span className="font-semibold">Motivo:</span> {entry.reason}
        </p>
        {entry.notes && (
          <p className={`text-xs mt-1 ${cfg.title} opacity-60`}>{entry.notes}</p>
        )}
        <p className={`text-xs mt-1 ${cfg.title} opacity-50`}>
          Registado em {new Date(entry.created_at).toLocaleDateString('pt-MZ')}
        </p>
      </div>
    </div>
  )
}
