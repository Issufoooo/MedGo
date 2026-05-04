import { useState, useCallback } from 'react'
import { MapContainer, TileLayer, Marker, Circle, Popup, useMapEvents } from 'react-leaflet'
import L from 'leaflet'
import { supabase } from '../../lib/supabase'
import { useNotificationStore } from '../../store/notificationStore'
import { useQueryClient } from '@tanstack/react-query'

const refIcon = L.divIcon({
  className: '',
  html: `<div style="
    width:36px;height:36px;border-radius:50%;
    background:#0a192f;border:3px solid #14b8a6;
    display:flex;align-items:center;justify-content:center;
    box-shadow:0 2px 8px rgba(0,0,0,0.4);cursor:grab;
  ">
    <svg width="14" height="14" fill="#14b8a6" viewBox="0 0 24 24">
      <path d="M12 2C8.13 2 5 5.13 5 9c0 5.25 7 13 7 13s7-7.75 7-13c0-3.87-3.13-7-7-7zm0 9.5c-1.38 0-2.5-1.12-2.5-2.5s1.12-2.5 2.5-2.5 2.5 1.12 2.5 2.5-1.12 2.5-2.5 2.5z"/>
    </svg>
  </div>`,
  iconSize: [36, 36],
  iconAnchor: [18, 18],
})

function DraggableRefMarker({ position, onDragEnd }) {
  const markerRef = useCallback(node => {
    if (node) {
      node.on('dragend', () => {
        const pos = node.getLatLng()
        onDragEnd({ lat: pos.lat, lng: pos.lng })
      })
    }
  }, [onDragEnd])

  return (
    <Marker
      position={position}
      icon={refIcon}
      draggable={true}
      ref={markerRef}
    >
      <Popup>
        <p className="text-xs font-semibold">Ponto de referência MedGo</p>
        <p className="text-xs text-slate-500">Arraste para reposicionar</p>
      </Popup>
    </Marker>
  )
}

/**
 * ZonesMapEditor — visual editor of zone rings.
 * Shows all active zones as coloured circles around the reference point.
 * Drag the ref marker to update coordinates.
 *
 * Props:
 *   referencePoint  { lat, lng, label }
 *   zones           array of delivery_zones with min_km, max_km, color
 *   onZoneClick     fn(zone) — called when a ring is clicked
 */
export function ZonesMapEditor({ referencePoint, zones = [], onZoneClick }) {
  const notify = useNotificationStore()
  const qc = useQueryClient()
  const [saving, setSaving] = useState(false)

  const center = [referencePoint?.lat ?? -25.965, referencePoint?.lng ?? 32.5699]

  const handleRefDragEnd = async ({ lat, lng }) => {
    setSaving(true)
    try {
      const updates = [
        { key: 'map_reference_lat', value: lat.toFixed(7) },
        { key: 'map_reference_lng', value: lng.toFixed(7) },
      ]
      for (const u of updates) {
        await supabase.from('system_config').upsert(u, { onConflict: 'key' })
      }
      qc.invalidateQueries({ queryKey: ['mapConfig'] })
      notify.success('Ponto de referência actualizado.')
    } catch (err) {
      notify.error('Erro ao guardar ponto de referência: ' + err.message)
    } finally {
      setSaving(false)
    }
  }

  const sortedZones = [...zones]
    .filter(z => z.max_km < 999)
    .sort((a, b) => b.max_km - a.max_km)

  const fmt = v => v != null
    ? new Intl.NumberFormat('pt-MZ', { style: 'currency', currency: 'MZN', minimumFractionDigits: 0 }).format(v)
    : '—'

  return (
    <div className="space-y-3">
      {saving && (
        <div className="flex items-center gap-2 text-xs text-teal-700 font-semibold bg-teal-50 border border-teal-200 rounded-xl px-4 py-2">
          <svg className="w-3 h-3 animate-spin" fill="none" viewBox="0 0 24 24">
            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"/>
            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8H4z"/>
          </svg>
          A guardar ponto de referência...
        </div>
      )}

      <div className="rounded-2xl overflow-hidden border border-slate-200 shadow-sm" style={{ height: 420 }}>
        <MapContainer
          center={center}
          zoom={11}
          style={{ height: '100%', width: '100%' }}
          scrollWheelZoom
        >
          <TileLayer
            attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OSM</a>'
            url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
          />

          {/* Zone rings */}
          {sortedZones.map(z => (
            <Circle
              key={z.id}
              center={center}
              radius={z.max_km * 1000}
              pathOptions={{
                color: z.color || '#14b8a6',
                fillColor: z.color || '#14b8a6',
                fillOpacity: 0.08,
                weight: 2,
                opacity: 0.5,
              }}
              eventHandlers={{
                click: () => onZoneClick?.(z),
              }}
            >
              <Popup>
                <div className="text-xs">
                  <p className="font-extrabold text-slate-900">{z.name}</p>
                  <p className="text-slate-500">
                    {z.min_km} – {z.max_km} km &bull; {fmt(z.delivery_fee)}
                  </p>
                </div>
              </Popup>
            </Circle>
          ))}

          {/* Draggable reference marker */}
          <DraggableRefMarker
            position={center}
            onDragEnd={handleRefDragEnd}
          />
        </MapContainer>
      </div>

      <div className="flex items-start gap-2 text-xs text-slate-500 bg-slate-50 rounded-xl px-4 py-3 border border-slate-100">
        <svg className="w-3.5 h-3.5 shrink-0 mt-0.5 text-slate-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"/>
        </svg>
        Arraste o marcador central para reposicionar o ponto de referência. Clique num anel para editar a zona.
      </div>
    </div>
  )
}
