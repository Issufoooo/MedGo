// ─────────────────────────────────────────────────────────────
// MedGo — Map Service
// Haversine distance, zone lookup, Nominatim geocoding
// ─────────────────────────────────────────────────────────────

/**
 * Haversine formula — distance between two lat/lng points in km
 */
export function haversineDistance(lat1, lng1, lat2, lng2) {
  const R = 6371
  const dLat = (lat2 - lat1) * Math.PI / 180
  const dLng = (lng2 - lng1) * Math.PI / 180
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) *
    Math.sin(dLng / 2) * Math.sin(dLng / 2)
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a))
}

/**
 * Find the matching zone for a given distance.
 * Zones must have min_km and max_km.
 */
export function getZoneByDistance(distanceKm, zones) {
  return zones
    .filter(z => z.is_active)
    .find(z => distanceKm >= z.min_km && distanceKm < z.max_km) || null
}

/**
 * Geocoding via Nominatim (address → coordinates)
 * Restricted to Mozambique (countrycodes=mz)
 */
export async function geocodeAddress(address) {
  try {
    const url = `https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(address)}&countrycodes=mz&limit=1`
    const res = await fetch(url, { headers: { 'Accept-Language': 'pt' } })
    if (!res.ok) return null
    const data = await res.json()
    if (!data.length) return null
    return {
      lat: parseFloat(data[0].lat),
      lng: parseFloat(data[0].lon),
      display: data[0].display_name,
    }
  } catch {
    return null
  }
}

/**
 * Reverse geocoding (coordinates → address string)
 */
export async function reverseGeocode(lat, lng) {
  try {
    const url = `https://nominatim.openstreetmap.org/reverse?format=json&lat=${lat}&lon=${lng}&accept-language=pt`
    const res = await fetch(url)
    if (!res.ok) return `${lat.toFixed(5)}, ${lng.toFixed(5)}`
    const data = await res.json()
    return data.display_name || `${lat.toFixed(5)}, ${lng.toFixed(5)}`
  } catch {
    return `${lat.toFixed(5)}, ${lng.toFixed(5)}`
  }
}
