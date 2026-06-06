import { randomBytes, createCipheriv, createDecipheriv, scryptSync } from 'crypto'

const ALGORITHM = 'aes-256-cbc'
const SECRET = process.env.ADMIN_API_SECRET || 'fallback-dev-secret-gosip-12345678'
const KEY = scryptSync(SECRET, 'salt-gosip', 32)

/**
 * Encrypts a plaintext token to a URL-safe encrypted hex string.
 */
export function encryptToken(token: string): string {
  // Generate a cryptographically secure 16-byte random IV
  const iv = randomBytes(16)
  const cipher = createCipheriv(ALGORITHM, KEY, iv)
  let encrypted = cipher.update(token, 'utf8', 'hex')
  encrypted += cipher.final('hex')
  
  // Format as iv-encrypted in hex
  return `${iv.toString('hex')}-${encrypted}`
}

/**
 * Decrypts an encrypted token string.
 * Returns null if decryption fails or the format is invalid.
 */
export function decryptToken(encryptedText: string): string | null {
  try {
    const parts = encryptedText.split('-')
    if (parts.length !== 2) {
      return null
    }
    const iv = Buffer.from(parts[0], 'hex')
    const encrypted = parts[1]
    const decipher = createDecipheriv(ALGORITHM, KEY, iv)
    let decrypted = decipher.update(encrypted, 'hex', 'utf8')
    decrypted += decipher.final('utf8')
    return decrypted
  } catch {
    return null
  }
}

