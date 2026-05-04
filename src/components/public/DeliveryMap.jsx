import { useState, useCallback, useRef, useEffect } from 'react'
import { MapContainer, TileLayer, Marker, Circle, useMapEvents, Popup } from 'react-leaflet'
import L from 'leaflet'
import { haversineDistance, getZoneByDistance, geocodeAddress, reverseGeocode } from '../../services/mapService'

// ── Custom Leaflet icons ──────────────────────────────────────

const refIcon = L.divIcon({
  className: '',
  html: `<div style="
    width:32px;height:32px;border-radius:50% 50% 50% 0;
    background:#0a192f;border:3px solid #14b8a6;
    transform:rotate(-45deg);box-shadow:0 2px 8px rgba(0,0,0,0.3);
  "></div>`,
  iconSize: [32, 32],
  iconAnchor: [16, 32],
})

const clientIcon = L.divIcon({
  className: '',
  html: `<div style="
    width:32px;height:32px;border-radius:50% 50% 50% 0;
    background:#f97316;border:3px solid #fff;
    transform:rotate(-45deg);box-shadow:0 2px 8px rgba(0,0,0,0.4);
  "></div>`,
  iconSize: [32, 32],
  iconAnchor: [16, 32],
})

// ── Map click handler ─────────────────────────────────────────

function LocationPicker({ onPick }) {
  useMapEvents({
    click(e) {
      onPick({ lat: e.latlng.lat, lng: e.latlng.lng })
    },
  })
  return null
}

// ── Zone ring colours ─────────────────────────────────────────

const RING_OPACITY = { fill: 0.07, stroke: 0.35 }

// ── Main component ────────────────────────────────────────────

/**
 * DeliveryMap — interactive map used in OrderPage.
 *
 * Props:
 *   referencePoint  { lat, lng, label }
 *   zones           delivery_zones rows (with min_km, max_km, color, delivery_fee)
 *   onLocationSelect  fn({ lat, lng, address, zone, distanceKm })
 */
export function DeliveryMap({ referencePoint, zones = [], onLocationSelect }) {
  const [clientPos, setClientPos] = useState(null)
  const [address, setAddress] = useState('')
  const [search, setSearch] = useState('')
  const [searching, setSearching] = useState(false)
  const [searchError, setSearchError] = useState('')
  const [matchedZone, setMatchedZone] = useState(null)
  const [distanceKm, setDistanceKm] = useState(null)
  const debounceRef = useRef(null)
  const nominatimDebounceRef = useRef(null)

  const fmt = v => v != null
    ? new Intl.NumberFormat('pt-MZ', { style: 'currency', currency: 'MZN', minimumFractionDigits: 0 }).format(v)
    : '—'

  const center = [referencePoint?.lat ?? -25.965, referencePoint?.lng ?? 32.5699]

  // Rate-limited position handler — max 1 Nominatim call per 1000ms
  const handlePosition = useCallback(async ({ lat, lng }) => {
    setClientPos({ lat, lng })
    const dist = haversineDistance(referencePoint.lat, referencePoint.lng, lat, lng)
    setDistanceKm(dist)
    const zone = getZoneByDistance(dist, zones)
    setMatchedZone(zone)
    onLocationSelect?.({ lat, lng, address: '', zone, distanceKm: dist })

    // Debounce reverse geocoding — Nominatim policy: 1 req/sec
    clearTimeout(nominatimDebounceRef.current)
    nominatimDebounceRef.current = setTimeout(async () => {
      const addr = await reverseGeocode(lat, lng)
      setAddress(addr)
      onLocationSelect?.({ lat, lng, address: addr, zone, distanceKm: dist })
    }, 1000)
  }, [referencePoint, zones, onLocationSelect])

  const handleSearch = async () => {
    if (!search.trim()) return
    setSearching(true)
    setSearchError('')
    const result = await geocodeAddress(search)
    setSearching(false)
    if (!result) {
      setSearchError('Endereço não encontrado. Tente ser mais específico ou clique no mapa.')
      return
    }
    handlePosition({ lat: result.lat, lng: result.lng })
  }

  const handleKeyDown = (e) => {
    if (e.key === 'Enter') {
      e.preventDefault()
      handleSearch()
    }
  }

  const sortedZones = [...zones].sort((a, b) => b.max_km - a.max_km)

  return (
    <div className="space-y-3">
      {/* Search bar */}
      <div className="flex gap-2">
        <input
          type="text"
          value={search}
          onChange={e => setSearch(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder="Pesquisar morada em Maputo/Matola..."
          className="input flex-1"
        />
        <button
          type="button"
          onClick={handleSearch}
          disabled={searching}
          className="btn-primary px-4"
        >
          {searching ? (
            <svg className="w-4 h-4 animate-spin" fill="none" viewBox="0 0 24 24">
              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"/>
              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8H4z"/>
            </svg>
          ) : (
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"/>
            </svg>
          )}
        </button>
      </div>

      {searchError && (
        <p className="text-xs text-red-600 font-medium">{searchError}</p>
      )}

      {/* Map */}
      <div className="rounded-2xl overflow-hidden border border-slate-200 shadow-sm" style={{ height: 320 }}>
        <MapContainer
          center={center}
          zoom={12}
          style={{ height: '100%', width: '100%' }}
          scrollWheelZoom={false}
        >
          <TileLayer
            attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OSM</a>'
            url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
          />

          {/* Zone rings — sorted largest first so small ones render on top */}
          {sortedZones.map(z => z.max_km < 999 && (
            <Circle
              key={z.id}
              center={center}
              radius={z.max_km * 1000}
              pathOptions={{
                color: z.color || '#14b8a6',
                fillColor: z.color || '#14b8a6',
                fillOpacity: RING_OPACITY.fill,
                weight: 1.5,
                opacity: RING_OPACITY.stroke,
              }}
            />
          ))}

          {/* Reference point */}
          <Marker position={center} icon={refIcon}>
            <Popup>{referencePoint?.label || 'MedGo HQ'}</Popup>
          </Marker>

          {/* Client marker */}
          {clientPos && (
            <Marker position={[clientPos.lat, clientPos.lng]} icon={clientIcon}>
              <Popup>
                <p className="text-xs font-semibold">{address || 'Localização seleccionada'}</p>
                {distanceKm != null && (
                  <p className="text-xs text-slate-500 mt-0.5">{distanceKm.toFixed(1)} km do ponto de referência</p>
                )}
              </Popup>
            </Marker>
          )}

          <LocationPicker onPick={handlePosition} />
        </MapContainer>
      </div>

      {/* Hint */}
      <p className="text-xs text-slate-400 text-center">
        {clientPos ? 'Clique no mapa para ajustar a localização' : 'Clique no mapa para indicar a sua morada'}
      </p>

      {/* Result panel */}
      {clientPos && (
        <div className={`rounded-2xl border p-4 ${matchedZone ? 'bg-teal-50 border-teal-200' : 'bg-red-50 border-red-200'}`}>
          {matchedZone ? (
            <div className="flex items-start justify-between gap-4">
              <div className="min-w-0">
                <p className="text-xs font-extrabold uppercase tracking-wider text-teal-700 mb-0.5">Zona de entrega</p>
                <p className="text-base font-extrabold text-slate-900">{matchedZone.name}</p>
                {address && <p className="text-xs text-slate-500 mt-0.5 truncate">{address}</p>}
                <p className="text-xs text-teal-600 mt-1">{distanceKm?.toFixed(1)} km da sede MedGo</p>
              </div>
              <div className="text-right shrink-0">
                <p className="text-xs text-slate-500">Taxa de entrega</p>
                <p className="text-xl font-extrabold text-teal-700">{fmt(matchedZone.delivery_fee)}</p>
              </div>
            </div>
          ) : (
            <div className="flex items-center gap-3">
              <svg className="w-5 h-5 text-red-500 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"/>
              </svg>
              <div>
                <p className="text-sm font-extrabold text-red-700">Fora da área de cobertura</p>
                <p className="text-xs text-red-600 mt-0.5">
                  A sua localização ({distanceKm?.toFixed(1)} km) está fora das zonas de entrega disponíveis.
                  Por favor escolha outro endereço.
                </p>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  )
}
