// lib/security/sanitize.ts
// ── Input validation & sanitization helpers ──────────────────────────────────

/** UUID pattern (version-agnostic) — used for branchId and itemId validation */
const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i

/** Session token: 8–64 alphanumeric chars (what uuidv4 and our fallback produce) */
const SESSION_TOKEN_RE = /^[a-zA-Z0-9_-]{8,64}$/

/** Table number: 1–20 chars, alphanumeric + space + dash */
const TABLE_NUMBER_RE = /^[a-zA-Z0-9 \-]{1,20}$/

/** Max items per order */
const MAX_ITEMS_PER_ORDER = 30

/** Max quantity per line item */
const MAX_QUANTITY_PER_ITEM = 50

export interface OrderRequestBody {
  sessionToken: string
  tableNumber: string
  branchId: string
  items: { itemId: string; quantity: number }[]
}

export interface ValidationResult {
  valid: boolean
  error?: string
}

/**
 * Validates and sanitizes an incoming order request body.
 * Returns { valid: true } on success or { valid: false, error: string } on failure.
 */
export function validateOrderBody(body: unknown): ValidationResult {
  if (!body || typeof body !== 'object') {
    return { valid: false, error: 'Invalid request body' }
  }

  const { sessionToken, tableNumber, branchId, items } = body as Record<string, unknown>

  // ── sessionToken ────────────────────────────────────────────────────────────
  if (typeof sessionToken !== 'string' || !SESSION_TOKEN_RE.test(sessionToken)) {
    return { valid: false, error: 'Invalid session token' }
  }

  // ── tableNumber ─────────────────────────────────────────────────────────────
  if (typeof tableNumber !== 'string' || !TABLE_NUMBER_RE.test(tableNumber.trim())) {
    return { valid: false, error: 'Invalid table number' }
  }

  // ── branchId ────────────────────────────────────────────────────────────────
  if (typeof branchId !== 'string' || !UUID_RE.test(branchId)) {
    return { valid: false, error: 'Invalid branch ID' }
  }

  // ── items ────────────────────────────────────────────────────────────────────
  if (!Array.isArray(items) || items.length === 0) {
    return { valid: false, error: 'Cart is empty' }
  }

  if (items.length > MAX_ITEMS_PER_ORDER) {
    return { valid: false, error: `Too many distinct items (max ${MAX_ITEMS_PER_ORDER})` }
  }

  for (const item of items) {
    if (!item || typeof item !== 'object') {
      return { valid: false, error: 'Malformed item in cart' }
    }

    const { itemId, quantity } = item as Record<string, unknown>

    if (typeof itemId !== 'string' || !UUID_RE.test(itemId)) {
      return { valid: false, error: 'Invalid item ID in cart' }
    }

    if (
      typeof quantity !== 'number' ||
      !Number.isInteger(quantity) ||
      quantity < 1 ||
      quantity > MAX_QUANTITY_PER_ITEM
    ) {
      return { valid: false, error: `Invalid quantity for item ${itemId}` }
    }
  }

  return { valid: true }
}

/**
 * Validate a UUID (branchId, itemId, orderId, etc.)
 */
export function isValidUUID(value: unknown): value is string {
  return typeof value === 'string' && UUID_RE.test(value)
}
