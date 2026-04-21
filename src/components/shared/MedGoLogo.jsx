/**
 * MedGoLogo — Faithful to the official brand guide
 *
 * Brand palette:
 *   Medical Teal : #14b8a6
 *   Accent Orange: #f97316
 *   Dark Navy    : #0a192f
 *
 * Mark anatomy:
 *   1. Oval pill/capsule body (teal, slightly rotated)
 *   2. G letterform cut into the pill (white stroke)
 *   3. Circular arrow wrapping around (orange)
 *   4. Orange dot accent on wordmark
 */

export function MedGoLogo({ size = 32, showText = true, inverted = false, className = '' }) {
  const textColor = inverted ? '#ffffff' : '#0a192f'
  return (
    <div
      className={`inline-flex items-center select-none ${className}`}
      style={{ gap: Math.round(size * 0.22), lineHeight: 1 }}
    >
      <MedGoMark size={size} />
      {showText && (
        <span style={{
          fontFamily: "'Plus Jakarta Sans', system-ui, sans-serif",
          fontWeight: 800,
          fontSize: Math.round(size * 0.68),
          lineHeight: 1,
          letterSpacing: '-0.022em',
          color: textColor,
        }}>
          {'Med'}
          <span style={{ color: '#14b8a6' }}>{'Go'}</span>
          {/* Brand orange dot */}
          <span style={{
            display: 'inline-block',
            width: Math.round(size * 0.09),
            height: Math.round(size * 0.09),
            borderRadius: '50%',
            background: '#f97316',
            marginLeft: 2,
            verticalAlign: 'super',
            flexShrink: 0,
          }} />
        </span>
      )}
    </div>
  )
}

/**
 * The standalone icon mark — pill + G + circular arrow
 */
export function MedGoMark({ size = 32, className = '' }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 56 56"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={className}
      aria-label="MedGo"
    >
      {/* ── Pill/capsule body ── */}
      {/* Rotated oval — the core of the mark */}
      <ellipse
        cx="24" cy="28"
        rx="14" ry="9"
        fill="#14b8a6"
        transform="rotate(-8 24 28)"
      />

      {/* ── G letterform ── */}
      {/* Arc of the G — goes from top-right, around bottom, stops at middle-right */}
      <path
        d="M28 20 C34 20 38 23.5 38 28 C38 32.5 34 36 28 36 L28 30.5 L32 30.5"
        stroke="white"
        strokeWidth="2.8"
        strokeLinecap="round"
        strokeLinejoin="round"
        fill="none"
      />

      {/* ── Circular arrow (orange) ── */}
      {/* Large arc sweeping around the mark */}
      <path
        d="M42 18 A16 16 0 1 1 26 44"
        stroke="#f97316"
        strokeWidth="3"
        strokeLinecap="round"
        fill="none"
      />
      {/* Arrow head */}
      <path
        d="M38 14.5 L42 18 L38 21.5"
        stroke="#f97316"
        strokeWidth="3"
        strokeLinecap="round"
        strokeLinejoin="round"
        fill="none"
      />
    </svg>
  )
}

/**
 * Square icon — for sidebar, favicon, app icon contexts
 * Dark navy background, mark centred
 */
export function MedGoIcon({ size = 32, className = '' }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 40 40"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      aria-label="MedGo"
      className={className}
    >
      <rect width="40" height="40" rx="10" fill="#0a192f" />

      {/* Pill */}
      <ellipse
        cx="17.5" cy="20"
        rx="9.5" ry="6"
        fill="#14b8a6"
        transform="rotate(-8 17.5 20)"
      />

      {/* G */}
      <path
        d="M19.5 14.5 C23.5 14.5 26.5 16.8 26.5 20 C26.5 23.2 23.5 25.5 19.5 25.5 L19.5 21.8 L22.5 21.8"
        stroke="white"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
        fill="none"
      />

      {/* Circular arrow */}
      <path
        d="M30 12.5 A11.5 11.5 0 1 1 19 31.5"
        stroke="#f97316"
        strokeWidth="2.2"
        strokeLinecap="round"
        fill="none"
      />
      <path
        d="M27 10 L30 12.5 L27 15"
        stroke="#f97316"
        strokeWidth="2.2"
        strokeLinecap="round"
        strokeLinejoin="round"
        fill="none"
      />
    </svg>
  )
}
