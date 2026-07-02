// lib/security/geofence.ts
// ── Server-side Geofencing & Spoof Prevention ────────────────────────────────

// Coordinates of the cafe branches (Latitude, Longitude)
// Customize these to the exact location of each outlet.
export const BRANCH_COORDINATES: Record<string, { lat: number; lng: number }> = {
  'kings':          { lat: 13.0827, lng: 80.2707 }, // Chennai
  'my-cafe':        { lat: 12.9716, lng: 77.5946 }, // Bangalore
  'coffeehouse':    { lat: 19.0760, lng: 72.8777 }, // Mumbai
  'abcy':           { lat: 28.6139, lng: 77.2090 }, // New Delhi
  'new-cafe-town':  { lat: 22.5726, lng: 88.3639 }, // Kolkata
  'vs-cafe':        { lat: 11.0168, lng: 76.9558 }, // Coimbatore
}

// Allowed radius in meters from the cafe coordinates (e.g. 100 meters)
const GEOFENCE_RADIUS_METERS = 100

/**
 * Calculates the distance between two coordinates using the Haversine formula.
 * Returns the distance in meters.
 */
export function calculateDistance(
  lat1: number,
  lon1: number,
  lat2: number,
  lon2: number
): number {
  const R = 6371e3 // Earth radius in meters
  const phi1 = (lat1 * Math.PI) / 180
  const phi2 = (lat2 * Math.PI) / 180
  const deltaPhi = ((lat2 - lat1) * Math.PI) / 180
  const deltaLambda = ((lon2 - lon1) * Math.PI) / 180

  const a =
    Math.sin(deltaPhi / 2) * Math.sin(deltaPhi / 2) +
    Math.cos(phi1) *
      Math.cos(phi2) *
      Math.sin(deltaLambda / 2) *
      Math.sin(deltaLambda / 2)
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a))

  return R * c
}

interface GeofenceValidationResult {
  valid: boolean
  error?: string
}

/**
 * Validates the client's GPS location against the branch location.
 */
export function validateGeofence(
  branchSlug: string,
  clientLat: number,
  clientLng: number,
  accuracy: number,
  isMocked: boolean
): GeofenceValidationResult {
  // 1. Check client-side mock flag
  if (isMocked) {
    return {
      valid: false,
      error: 'Developer settings or mock location apps detected. Please disable them to place an order.',
    }
  }

  // 2. Validate GPS accuracy (must be reasonable, under 150 meters)
  // If accuracy is too low (e.g. 1000m), the client might be spoofing via cellular tower triangulation
  if (accuracy > 150) {
    return {
      valid: false,
      error: 'Low GPS accuracy. Please move closer to a window or ensure location services are set to High Accuracy.',
    }
  }

  // Find branch coordinates
  const branchCoords = BRANCH_COORDINATES[branchSlug]
  if (!branchCoords) {
    // If coordinates are not set up for the branch, bypass validation gracefully
    return { valid: true }
  }

  // 3. Verify distance
  const distance = calculateDistance(
    clientLat,
    clientLng,
    branchCoords.lat,
    branchCoords.lng
  )

  if (distance > GEOFENCE_RADIUS_METERS) {
    return {
      valid: false,
      error: 'You must be physically present at the cafe premises to place orders.',
    }
  }

  return { valid: true }
}
