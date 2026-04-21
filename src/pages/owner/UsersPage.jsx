import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { supabase } from '../../lib/supabase'
import { useNotificationStore } from '../../store/notificationStore'
import { Modal } from '../../components/ui/Modal'
import { Alert } from '../../components/ui/Alert'
import { Spinner } from '../../components/ui/Spinner'

const ROLE_META = {
  owner:    { label: 'Proprietário', dot: 'bg-violet-500', badge: 'bg-violet-50 text-violet-700' },
  operator: { label: 'Operador',     dot: 'bg-teal-500',   badge: 'bg-teal-50 text-teal-700' },
  motoboy:  { label: 'Motoboy',      dot: 'bg-orange-500', badge: 'bg-orange-50 text-orange-700' },
}

function IPlus() { return <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4"/></svg> }
function IEdit() { return <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z"/></svg> }

const EMPTY_FORM = { full_name: '', phone: '', role: 'operator', is_active: true }

function UserForm({ initial, onSave, onCancel, loading }) {
  const [form, setForm] = useState(initial || EMPTY_FORM)
  const [errors, setErrors] = useState({})
  const set = (k, v) => setForm(f => ({ ...f, [k]: v }))

  const validate = () => {
    const e = {}
    if (!form.full_name.trim()) e.full_name = 'Campo obrigatório'
    if (!form.role) e.role = 'Seleccione um papel'
    return e
  }

  const handleSubmit = () => {
    const e = validate()
    if (Object.keys(e).length) { setErrors(e); return }
    onSave(form)
  }

  return (
    <div className="space-y-4">
      <Alert type="info">
        A criação de utilizadores requer acesso à consola do Supabase para definir credenciais de email/senha. Aqui pode editar os dados de perfil.
      </Alert>
      <div>
        <label className="label">Nome completo <span className="text-red-500">*</span></label>
        <input value={form.full_name} onChange={e => set('full_name', e.target.value)} placeholder="Nome do membro da equipa" className={`input ${errors.full_name ? 'border-red-300' : ''}`} />
        {errors.full_name && <p className="field-error">{errors.full_name}</p>}
      </div>
      <div>
        <label className="label">Telemóvel</label>
        <input value={form.phone || ''} onChange={e => set('phone', e.target.value)} placeholder="+258 8X XXX XXXX" className="input" type="tel" />
      </div>
      <div>
        <label className="label">Papel <span className="text-red-500">*</span></label>
        <select value={form.role} onChange={e => set('role', e.target.value)} className="input">
          <option value="operator">Operador</option>
          <option value="motoboy">Motoboy</option>
          <option value="owner">Proprietário</option>
        </select>
        {errors.role && <p className="field-error">{errors.role}</p>}
      </div>
      <div className="flex items-center gap-3">
        <button
          type="button"
          onClick={() => set('is_active', !form.is_active)}
          className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${form.is_active ? 'bg-teal-500' : 'bg-slate-200'}`}
        >
          <span className={`inline-block h-4 w-4 transform rounded-full bg-white shadow-sm transition-transform ${form.is_active ? 'translate-x-6' : 'translate-x-1'}`} />
        </button>
        <span className="text-sm font-medium text-slate-700">{form.is_active ? 'Activo' : 'Inactivo'}</span>
      </div>
      <div className="flex gap-3 pt-2">
        <button onClick={onCancel} className="btn-secondary flex-1">Cancelar</button>
        <button onClick={handleSubmit} disabled={loading} className="btn-primary flex-1">
          {loading && <Spinner size="sm" />}
          Guardar
        </button>
      </div>
    </div>
  )
}

function UserCard({ user, onEdit, onToggle }) {
  const meta = ROLE_META[user.role] || {}
  const initials = (user.full_name || 'U').split(' ').slice(0, 2).map(n => n[0]).join('').toUpperCase()

  return (
    <div className={`card p-5 transition-all hover:shadow-card-md ${!user.is_active ? 'opacity-55' : ''}`}>
      <div className="flex items-start justify-between gap-3">
        <div className="flex items-center gap-3 flex-1 min-w-0">
          <div className={`w-11 h-11 rounded-2xl ${meta.dot || 'bg-slate-400'} flex items-center justify-center text-white font-extrabold text-sm shrink-0`}>
            {initials}
          </div>
          <div className="min-w-0">
            <p className="font-extrabold text-slate-900 truncate">{user.full_name}</p>
            <div className="flex items-center gap-2 mt-0.5">
              <span className={`inline-flex items-center rounded-full px-2 py-0.5 text-[10px] font-extrabold uppercase tracking-wide ${meta.badge || 'bg-slate-100 text-slate-500'}`}>
                {meta.label || user.role}
              </span>
              {!user.is_active && (
                <span className="text-[10px] text-slate-400 font-semibold">INACTIVO</span>
              )}
            </div>
          </div>
        </div>
        <button onClick={() => onEdit(user)} className="btn-icon shrink-0" title="Editar"><IEdit /></button>
      </div>

      {user.phone && (
        <div className="mt-3 pt-3 border-t border-slate-50 flex items-center gap-2 text-sm text-slate-500">
          <svg className="w-3.5 h-3.5 text-slate-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.949V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z"/>
          </svg>
          {user.phone}
        </div>
      )}

      <div className="mt-3 pt-3 border-t border-slate-50 flex justify-end">
        <button
          onClick={() => onToggle(user)}
          className={`text-xs font-semibold transition-colors ${user.is_active ? 'text-slate-400 hover:text-red-500' : 'text-teal-600 hover:text-teal-700'}`}
        >
          {user.is_active ? 'Desactivar' : 'Activar'}
        </button>
      </div>
    </div>
  )
}

export function UsersPage() {
  const notify = useNotificationStore()
  const qc = useQueryClient()
  const [modal, setModal] = useState(null) // null | 'create' | user_obj
  const [roleFilter, setRoleFilter] = useState('ALL')

  const { data: users = [], isLoading } = useQuery({
    queryKey: ['team-users'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('profiles')
        .select('id, full_name, phone, role, is_active, created_at')
        .order('role')
        .order('full_name')
      if (error) throw error
      return data || []
    },
    staleTime: 30_000,
  })

  const updateMutation = useMutation({
    mutationFn: async ({ id, payload }) => {
      const { error } = await supabase.from('profiles').update(payload).eq('id', id)
      if (error) throw error
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['team-users'] }),
  })

  const handleSaveEdit = async (form) => {
    try {
      await updateMutation.mutateAsync({ id: modal.id, payload: { full_name: form.full_name, phone: form.phone || null, role: form.role, is_active: form.is_active } })
      notify.success('Utilizador actualizado.')
      setModal(null)
    } catch (err) { notify.error(err.message) }
  }

  const handleToggle = async (user) => {
    try {
      await updateMutation.mutateAsync({ id: user.id, payload: { is_active: !user.is_active } })
      notify.success(user.is_active ? 'Utilizador desactivado.' : 'Utilizador activado.')
    } catch (err) { notify.error(err.message) }
  }

  const filtered = roleFilter === 'ALL' ? users : users.filter(u => u.role === roleFilter)
  const counts = users.reduce((acc, u) => { acc[u.role] = (acc[u.role] || 0) + 1; return acc }, {})

  return (
    <div className="max-w-5xl mx-auto px-4 md:px-6 py-6 pb-10 space-y-6">

      {/* Header */}
      <div className="relative overflow-hidden rounded-[28px] border border-white/10 bg-[linear-gradient(155deg,#0d9488_0%,#0f766e_25%,#0a192f_100%)] px-6 py-7 text-white shadow-lg">
        <div className="absolute inset-0 dot-pattern opacity-60" />
        <div className="absolute -right-10 -top-10 h-40 w-40 rounded-full bg-violet-300/10 blur-3xl" />
        <div className="relative flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <p className="text-xs font-extrabold uppercase tracking-[0.22em] text-white/70">Sistema</p>
            <h1 className="mt-2 text-2xl font-extrabold">Equipa</h1>
            <p className="mt-1.5 text-sm text-white/70">
              {users.filter(u => u.is_active).length} activos · {counts.operator || 0} operadores · {counts.motoboy || 0} motoboys
            </p>
          </div>
          <div className="flex gap-2 flex-wrap">
            {Object.entries(ROLE_META).map(([role, meta]) => (
              <div key={role} className="rounded-2xl border border-white/10 bg-white/10 px-4 py-2.5 backdrop-blur-sm text-center">
                <p className="text-xl font-extrabold">{counts[role] || 0}</p>
                <p className="text-[11px] font-semibold uppercase tracking-wide text-white/65 mt-0.5">{meta.label}</p>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Info note */}
      <Alert type="info" title="Gestão de acesso">
        Para criar novos utilizadores com email/senha, aceda à consola do Supabase → Authentication → Users. Após criar, o perfil fica disponível aqui para editar o nome, telefone e papel.
      </Alert>

      {/* Role filter tabs */}
      <div className="flex gap-2 flex-wrap">
        {[
          { value: 'ALL', label: 'Todos' },
          { value: 'operator', label: 'Operadores' },
          { value: 'motoboy', label: 'Motoboys' },
          { value: 'owner', label: 'Proprietários' },
        ].map(tab => (
          <button
            key={tab.value}
            onClick={() => setRoleFilter(tab.value)}
            className={`px-4 py-2 rounded-xl text-sm font-semibold transition-all ${
              roleFilter === tab.value
                ? 'bg-teal-500 text-white shadow-sm'
                : 'bg-white border border-slate-200 text-slate-600 hover:border-teal-200'
            }`}
          >
            {tab.label}
            {tab.value !== 'ALL' && counts[tab.value] > 0 && (
              <span className={`ml-1.5 text-xs ${roleFilter === tab.value ? 'text-white/70' : 'text-slate-400'}`}>
                {counts[tab.value]}
              </span>
            )}
          </button>
        ))}
      </div>

      {/* List */}
      {isLoading ? (
        <div className="flex justify-center py-16"><Spinner size="lg" /></div>
      ) : filtered.length === 0 ? (
        <div className="card p-14 text-center">
          <div className="text-5xl mb-4">👥</div>
          <p className="font-extrabold text-slate-700 mb-1">Sem utilizadores nesta categoria</p>
          <p className="text-sm text-slate-400">Crie utilizadores via Supabase e edite os perfis aqui.</p>
        </div>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {filtered.map(user => (
            <UserCard key={user.id} user={user} onEdit={setModal} onToggle={handleToggle} />
          ))}
        </div>
      )}

      {/* Edit modal */}
      <Modal open={!!modal} onClose={() => setModal(null)} title="Editar perfil" size="sm">
        {modal && (
          <UserForm
            initial={modal}
            onSave={handleSaveEdit}
            onCancel={() => setModal(null)}
            loading={updateMutation.isPending}
          />
        )}
      </Modal>
    </div>
  )
}
