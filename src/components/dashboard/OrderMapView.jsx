import { MapContainer, TileLayer, Marker, Polyline, Popup } from 'react-leaflet'
import L from 'leaflet'

const refIcon = L.divIcon({
  className: '',
  html: `<div style="
    width:24px;height:24px;border-radius:50% 50% 50% 0;
    background:#0a192f;border:2px solid #14b8a6;
    transform:rotate(-45deg);box-shadow:0 1px 4px rgba(0,0,0,0.3);
  "></div>`,
  iconSize: [24, 24],
  iconAnchor: [12, 24],
})

const clientIcon = L.divIcon({
  className: '',
  html: `<div style="
    width:24px;height:24px;border-radius:50% 50% 50% 0;
    background:#f97316;border:2px solid #fff;
    transform:rotate(-45deg);box-shadow:0 1px 4px rgba(0,0,0,0.3);
  "></div>`,
  iconSize: [24, 24],
  iconAnchor: [12, 24],
})

/**
 * OrderMapView — compact read-only map for OrderDetailPage.
 *
 * Props:
 *   refLat, refLng        reference point (MedGo HQ)
 *   refLabel              label for ref marker
 *   clientLat, clientLng  client delivery location
 *   distanceKm            pre-calculated distance
 *   zoneName              zone name
 */
export function OrderMapView({ refLat, refLng, refLabel, clientLat, clientLng, distanceKm, zoneName }) {
  if (!clientLat || !clientLng) return null

  const center = [
    (refLat + clientLat) / 2,
    (refLng + clientLng) / 2,
  ]

  const polyline = [
    [refLat, refLng],
    [clientLat, clientLng],
  ]

  return (
    <div className="rounded-xl overflow-hidden border border-slate-200" style={{ height: 200 }}>
      <MapContainer
        center={center}
        zoom={12}
        style={{ height: '100%', width: '100%' }}
        scrollWheelZoom={false}
        dragging={false}
        zoomControl={false}
        doubleClickZoom={false}
        touchZoom={false}
        attributionControl={false}
      >
        <TileLayer url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png" />

        <Polyline
          positions={polyline}
          pathOptions={{ color: '#14b8a6', weight: 2, dashArray: '6 4', opacity: 0.7 }}
        />

        <Marker position={[refLat, refLng]} icon={refIcon}>
          <Popup>{refLabel || 'MedGo HQ'}</Popup>
        </Marker>

        <Marker position={[clientLat, clientLng]} icon={clientIcon}>
          <Popup>
            Morada do cliente
            {distanceKm && <><br />{parseFloat(distanceKm).toFixed(1)} km{zoneName && ` — ${zoneName}`}</>}
          </Popup>
        </Marker>
      </MapContainer>
    </div>
  )
}
