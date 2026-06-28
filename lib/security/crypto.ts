// lib/security/crypto.ts
// ── Token encryption/decryption using AES-256-GCM ────────────────────────────
//
// Why GCM over CBC?
//   AES-256-CBC provides confidentiality only — a tampered ciphertext decrypts
//   to garbage silently. AES-256-GCM adds an authentication tag: any bit-flip
//   in the ciphertext causes decryption to throw, preventing padding oracle and
//   bit-flipping attacks.
//
// Format (hex-encoded, dot-separated):
//   iv.authTag.ciphertext
//   e.g. "a1b2c3d4...24chars.e5f6...32chars.abcd...Nchars"

import { randomBytes, createCipheriv, createDecipheriv, scryptSync } from 'crypto'

const ALGORITHM = 'aes-256-gcm'
const SECRET    = process.env.ADMIN_API_SECRET ?? 'fallback-dev-secret-gosip-12345678'
const SALT      = process.env.CRYPTO_SALT      ?? 'dev-salt-gosip-v2'

if (process.env.NODE_ENV === 'production') {
  if (!process.env.ADMIN_API_SECRET) {
    throw new Error('[GoSip] FATAL: ADMIN_API_SECRET env var must be set in production.')
  }
  if (!process.env.CRYPTO_SALT) {
    throw new Error('[GoSip] FATAL: CRYPTO_SALT env var must be set in production.')
  }
}

// Derive a 32-byte key from the secret + per-app salt via scrypt
const KEY = scryptSync(SECRET, SALT, 32)

/**
 * Encrypts a plaintext token using AES-256-GCM.
 * Returns a URL-safe string in the format: iv.authTag.ciphertext (all hex-encoded)
 */
export function encryptToken(token: string): string {
  const iv     = randomBytes(12) // 96-bit IV recommended for GCM
  const cipher = createCipheriv(ALGORITHM, KEY, iv)

  let encrypted = cipher.update(token, 'utf8', 'hex')
  encrypted    += cipher.final('hex')
  const authTag = cipher.getAuthTag().toString('hex')

  return `${iv.toString('hex')}.${authTag}.${encrypted}`
}

/**
 * Decrypts a GCM-encrypted token string.
 * Returns null if:
 *  - the format is invalid (not 3 dot-separated parts)
 *  - the authentication tag fails (tampered ciphertext)
 *  - any other decryption error
 *
 * Also accepts the legacy CBC format (iv-ciphertext, 2 dash-separated parts)
 * for backward compatibility during the transition period.
 */
export function decryptToken(encryptedText: string): string | null {
  try {
    const parts = encryptedText.split('.')

    if (parts.length === 3) {
      // ── Current format: AES-256-GCM (iv.authTag.ciphertext) ──────────────
      const [ivHex, authTagHex, cipherHex] = parts
      const iv      = Buffer.from(ivHex, 'hex')
      const authTag = Buffer.from(authTagHex, 'hex')

      const decipher = createDecipheriv(ALGORITHM, KEY, iv)
      decipher.setAuthTag(authTag)

      let decrypted  = decipher.update(cipherHex, 'hex', 'utf8')
      decrypted     += decipher.final('utf8')
      return decrypted
    }

    // ── Legacy format: AES-256-CBC (iv-ciphertext) ───────────────────────
    // Support for tokens issued before the GCM upgrade.
    // Can be removed after ORDER_TTL_MS (2 hours) has elapsed in production.
    const dashParts = encryptedText.split('-')
    if (dashParts.length === 2) {
      const { createDecipheriv: cdiv } = require('crypto')
      const legacyKey = scryptSync(SECRET, SALT, 32)
      const iv        = Buffer.from(dashParts[0], 'hex')
      const decipher  = cdiv('aes-256-cbc', legacyKey, iv)
      let decrypted   = decipher.update(dashParts[1], 'hex', 'utf8')
      decrypted      += decipher.final('utf8')
      return decrypted
    }

    return null
  } catch {
    return null
  }
}
