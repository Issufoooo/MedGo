import { create } from 'zustand'

let _id = 0

export const useNotificationStore = create((set, get) => ({
  notifications: [],

  /**
   * Add a notification. Auto-removes after `duration` ms (default 4s).
   * type: 'success' | 'error' | 'warning' | 'info'
   */
  add: (message, type = 'info', duration = 4000) => {
    const id = ++_id
    set(state => ({
      notifications: [...state.notifications, { id, message, type }]
    }))
    if (duration > 0) {
      setTimeout(() => get().remove(id), duration)
    }
    return id
  },

  success: (msg, duration) => get().add(msg, 'success', duration),
  error:   (msg, duration) => get().add(msg, 'error', duration ?? 6000),
  warning: (msg, duration) => get().add(msg, 'warning', duration),
  info:    (msg, duration) => get().add(msg, 'info', duration),

  remove: (id) => set(state => ({
    notifications: state.notifications.filter(n => n.id !== id)
  })),

  clear: () => set({ notifications: [] }),
}))
