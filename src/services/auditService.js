import { supabase } from '../lib/supabase'

/**
 * Write an immutable audit log entry.
 * Errors are intentionally swallowed — never block business logic.
 *
 * @param {object} opts
 * @param {string} opts.action       - e.g. 'ORDER_CREATED', 'PRESCRIPTION_APPROVED'
 * @param {string} opts.entityType   - e.g. 'order', 'customer', 'blacklist'
 * @param {string} [opts.entityId]   - UUID of the affected entity
 * @param {string} [opts.actorId]    - UUID of the user performing the action (null = system)
 * @param {string} [opts.actorRole]  - 'owner' | 'operator' | 'motoboy' | null
 * @param {object} [opts.metadata]   - Any additional context
 */
export async function auditLog({
  action,
  entityType,
  entityId = null,
  actorId = null,
  actorRole = null,
  metadata = {},
}) {
  try {
    await supabase.from('action_logs').insert({
      actor_id: actorId,
      actor_role: actorRole,
      action,
      entity_type: entityType,
      entity_id: entityId,
      metadata,
    })
  } catch (err) {
    // Silent fail — audit log must never break the main flow
    console.warn('[AuditLog] Failed to write log:', action, err?.message)
  }
}
