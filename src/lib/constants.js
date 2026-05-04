// ─────────────────────────────────────────────────────────────
// MedGo — System Constants
// Single source of truth for all enums, rules, and mappings.
// ─────────────────────────────────────────────────────────────

// ── ORDER STATUS ──────────────────────────────────────────────
export const ORDER_STATUS = {
  NEW:                  'NEW',
  PRESCRIPTION_PENDING: 'PRESCRIPTION_PENDING',
  IN_VALIDATION:        'IN_VALIDATION',
  AWAITING_PHARMACY:    'AWAITING_PHARMACY',
  AWAITING_CLIENT:      'AWAITING_CLIENT',
  CONFIRMED:            'CONFIRMED',
  IN_PREPARATION:       'IN_PREPARATION',
  IN_DELIVERY:          'IN_DELIVERY',
  DELIVERED:            'DELIVERED',
  CANCELLED:            'CANCELLED',
}

// Timeline order (excludes CANCELLED — it's a terminal side-state)
export const ORDER_STATUS_TIMELINE = [
  'NEW',
  'PRESCRIPTION_PENDING',
  'IN_VALIDATION',
  'AWAITING_PHARMACY',
  'AWAITING_CLIENT',
  'CONFIRMED',
  'IN_PREPARATION',
  'IN_DELIVERY',
  'DELIVERED',
]

// Valid forward transitions — enforced client-side AND server-side
export const VALID_TRANSITIONS = {
  NEW:                  ['PRESCRIPTION_PENDING', 'IN_VALIDATION', 'CANCELLED'],
  PRESCRIPTION_PENDING: ['IN_VALIDATION', 'CANCELLED'],
  IN_VALIDATION:        ['AWAITING_PHARMACY', 'PRESCRIPTION_PENDING', 'CANCELLED'],
  AWAITING_PHARMACY:    ['AWAITING_CLIENT', 'CANCELLED'],
  AWAITING_CLIENT:      ['CONFIRMED', 'CANCELLED'],
  CONFIRMED:            ['IN_PREPARATION', 'CANCELLED'],
  IN_PREPARATION:       ['IN_DELIVERY'],
  IN_DELIVERY:          ['DELIVERED'],
  DELIVERED:            [],
  CANCELLED:            [],
}

// States where operator cancellation requires owner approval
export const REQUIRES_OWNER_APPROVAL = [
  'CONFIRMED', 'IN_PREPARATION',
]

// States where customer can self-cancel
export const CUSTOMER_CANCELLABLE_STATES = [
  'NEW', 'PRESCRIPTION_PENDING',
]

// States where operator can directly action
export const OPERATOR_CANCELLABLE_STATES = [
  'NEW', 'PRESCRIPTION_PENDING', 'IN_VALIDATION',
  'AWAITING_PHARMACY', 'AWAITING_CLIENT',
  'CONFIRMED', 'IN_PREPARATION',
]

// Active (non-terminal) states
export const ACTIVE_STATES = [
  'NEW', 'PRESCRIPTION_PENDING', 'IN_VALIDATION',
  'AWAITING_PHARMACY', 'AWAITING_CLIENT',
  'CONFIRMED', 'IN_PREPARATION', 'IN_DELIVERY',
]

// ── BADGE CSS CLASS MAP ───────────────────────────────────────
export const STATUS_BADGE_CLASS = {
  NEW:                  'badge-NEW',
  PRESCRIPTION_PENDING: 'badge-PRESCRIPTION_PENDING',
  IN_VALIDATION:        'badge-IN_VALIDATION',
  AWAITING_PHARMACY:    'badge-AWAITING_PHARMACY',
  AWAITING_CLIENT:      'badge-AWAITING_CLIENT',
  CONFIRMED:            'badge-CONFIRMED',
  IN_PREPARATION:       'badge-IN_PREPARATION',
  IN_DELIVERY:          'badge-IN_DELIVERY',
  DELIVERED:            'badge-DELIVERED',
  CANCELLED:            'badge-CANCELLED',
}

// Order card left-border class by status group
export const ORDER_CARD_CLASS = {
  NEW:                  'border-l-slate-300',
  PRESCRIPTION_PENDING: 'border-l-amber-400',
  IN_VALIDATION:        'border-l-violet-400',
  AWAITING_PHARMACY:    'border-l-blue-400',
  AWAITING_CLIENT:      'border-l-orange-400',
  CONFIRMED:            'border-l-teal-500',
  IN_PREPARATION:       'border-l-indigo-500',
  IN_DELIVERY:          'border-l-cyan-500',
  DELIVERED:            'border-l-green-500',
  CANCELLED:            'border-l-red-300',
}

// ── MEDICATION ────────────────────────────────────────────────
export const MEDICATION_CATEGORY = {
  FREE:                 'FREE',
  PRESCRIPTION:         'PRESCRIPTION',
  RESTRICTED_MONITORED: 'RESTRICTED_MONITORED',
}

export const CATEGORY_BADGE_CLASS = {
  FREE:                 'badge-FREE',
  PRESCRIPTION:         'badge-PRESCRIPTION',
  RESTRICTED_MONITORED: 'badge-RESTRICTED_MONITORED',
}

// ── PAYMENT ───────────────────────────────────────────────────
export const PAYMENT_METHOD = {
  MPESA:            'MPESA',
  EMOLA:            'EMOLA',
  CASH_ON_DELIVERY: 'CASH_ON_DELIVERY',
  POS:              'POS',
}

export const PAYMENT_METHOD_LABELS = {
  MPESA:            'M-Pesa',
  EMOLA:            'e-Mola',
  CASH_ON_DELIVERY: 'Dinheiro na entrega',
  POS:              'POS',
}


// ── ROLES ─────────────────────────────────────────────────────
export const USER_ROLE = {
  OWNER:         'owner',
  OPERATOR:      'operator',
  MOTOBOY:       'motoboy',
  STOCK_MANAGER: 'stock_manager',
}

// ── BLACKLIST ─────────────────────────────────────────────────
export const BLACKLIST_SEVERITY = {
  LOW:     'LOW',
  MEDIUM:  'MEDIUM',
  HIGH:    'HIGH',
  BLOCKED: 'BLOCKED',
}

export const BLACKLIST_SEVERITY_CLASS = {
  LOW:     'badge bg-yellow-100 text-yellow-700',
  MEDIUM:  'badge bg-orange-100 text-orange-700',
  HIGH:    'badge bg-red-100 text-red-700',
  BLOCKED: 'badge bg-red-600 text-white',
}

// ── PRESCRIPTION ──────────────────────────────────────────────
export const PRESCRIPTION_STATUS = {
  PENDING:              'PENDING',
  APPROVED:             'APPROVED',
  REJECTED_UNREADABLE:  'REJECTED_UNREADABLE',
  REJECTED_INVALID:     'REJECTED_INVALID',
  EXPIRED:              'EXPIRED',
}

export const PRESCRIPTION_ALLOWED_TYPES = [
  'image/jpeg', 'image/png', 'image/webp', 'application/pdf',
]
export const PRESCRIPTION_MAX_SIZE = 10 * 1024 * 1024 // 10MB

// ── CANCELLATION ──────────────────────────────────────────────
export const CANCELLATION_STATUS = {
  PENDING:  'PENDING',
  APPROVED: 'APPROVED',
  REJECTED: 'REJECTED',
}

// ── INVENTORY / STOCK ─────────────────────────────────────────
export const STOCK_STATUS = {
  IN_STOCK:     'IN_STOCK',
  LOW_STOCK:    'LOW_STOCK',
  OUT_OF_STOCK: 'OUT_OF_STOCK',
}

export const LOW_STOCK_THRESHOLD = 5 // units below this = LOW_STOCK

export const STOCK_STATUS_CLASS = {
  IN_STOCK:     'badge-IN_STOCK',
  LOW_STOCK:    'badge-LOW_STOCK',
  OUT_OF_STOCK: 'badge-OUT_OF_STOCK',
}

export const STOCK_STATUS_LABEL = {
  IN_STOCK:     'Em stock',
  LOW_STOCK:    'Stock baixo',
  OUT_OF_STOCK: 'Sem stock',
}
