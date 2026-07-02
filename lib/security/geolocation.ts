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

    // Read 1
    navigator.geolocation.getCurrentPosition(
      (pos1) => {
        const lat1 = pos1.coords.latitude
        const lng1 = pos1.coords.longitude
        const acc1 = pos1.coords.accuracy

        // Mock indicators (accuracy of exactly 0 or 1 is typically returned by GPS spoofers)
        if (acc1 === 0 || acc1 === 1) {
          return resolve({
            latitude: lat1,
            longitude: lng1,
            accuracy: acc1,
            isMocked: true,
          })
        }

        // Wait 1 second and read again to check for hardware signal noise (GPS drift)
        // Hardware GPS chips are never 100% mathematically static; spoofed GPS apps return exact duplicate values.
        setTimeout(() => {
          navigator.geolocation.getCurrentPosition(
            (pos2) => {
              const lat2 = pos2.coords.latitude
              const lng2 = pos2.coords.longitude
              const acc2 = pos2.coords.accuracy

              // If latitude and longitude are identical down to the last decimal place
              // (15 decimal places), it is a mock location program.
              const isStatic = lat1 === lat2 && lng1 === lng2

              resolve({
                latitude: lat2,
                longitude: lng2,
                accuracy: acc2,
                isMocked: isStatic,
              })
            },
            (err) => reject(err),
            { enableHighAccuracy: true, timeout: 5000 }
          )
        }, 1000)
      },
      (err) => {
        if (err.code === err.PERMISSION_DENIED) {
          reject(new Error('Location permission is required to verify you are at the cafe.'))
        } else {
          reject(new Error('Failed to retrieve location. Please check your GPS settings.'))
        }
      },
      { enableHighAccuracy: true, timeout: 5000 }
    )
  })
}
