import { useNotificationStore } from '../../store/notificationStore'

const CFG = {
  success: { bg:'bg-slate-900 border-teal-500',   dot:'bg-teal-400' },
  error:   { bg:'bg-slate-900 border-red-500',    dot:'bg-red-400'  },
  warning: { bg:'bg-slate-900 border-amber-500',  dot:'bg-amber-400'},
  info:    { bg:'bg-slate-900 border-teal-400',   dot:'bg-teal-300' },
}

export function ToastContainer() {
  const { notifications, remove } = useNotificationStore()
  if (!notifications.length) return null
  return (
    <div className="fixed bottom-6 right-4 sm:right-6 z-[60] flex flex-col gap-2 w-full max-w-sm pointer-events-none">
      {notifications.map(n => {
        const { bg, dot } = CFG[n.type] || CFG.info
        return (
          <div
            key={n.id}
            onClick={() => remove(n.id)}
            className={`
              flex items-start gap-3 px-4 py-3.5 rounded-2xl border-l-4 shadow-card-lg
              pointer-events-auto cursor-pointer animate-slide-left
              text-white ${bg}
            `}
            role="alert"
          >
            <span className={`w-2 h-2 rounded-full shrink-0 mt-1.5 ${dot}`} />
            <p className="text-sm font-semibold flex-1 leading-snug">{n.message}</p>
            <button className="text-white/40 hover:text-white/80 transition-colors shrink-0">
              <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12"/>
              </svg>
            </button>
          </div>
        )
      })}
    </div>
  )
}
