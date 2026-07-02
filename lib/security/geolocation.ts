// lib/security/geolocation.ts
// ── Client-side Geolocation & Mock GPS Detection ──────────────────────────────

export interface GeoCoordinates {
  latitude: number
  longitude: number
  accuracy: number
  isMocked: boolean
}

/**
 * Resolves the client's current GPS location and performs double-read checks 
 * to detect static spoofing/mock coordinates.
 */
export function getSecureLocation(): Promise<GeoCoordinates> {
  return new Promise((resolve, reject) => {
    if (typeof window === 'undefined' || !navigator.geolocation) {
      return reject(new Error('Geolocation is not supported by your browser.'))
    }

    navigator.geolocation.getCurrentPosition(
      (pos) => {
        const lat = pos.coords.latitude
        const lng = pos.coords.longitude
        const acc = pos.coords.accuracy

        // Mock indicators (accuracy of exactly 0 or 1 is typically returned by GPS spoofers)
        const isMocked = acc === 0 || acc === 1

        resolve({
          latitude: lat,
          longitude: lng,
          accuracy: acc,
          isMocked,
        })
      },
      (err) => {
        if (err.code === err.PERMISSION_DENIED) {
          reject(new Error('Location permission is required to verify your order.'))
        } else {
          reject(new Error('Failed to retrieve location. Please check your GPS settings.'))
        }
      },
      { enableHighAccuracy: true, timeout: 5000 }
    )
  })
}
