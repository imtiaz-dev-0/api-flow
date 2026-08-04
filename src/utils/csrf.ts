import type { CsrfConfig } from '../core/types.ts'

/**
 * Reads a CSRF token from cookies or returns the static configured token.
 * Safe to call in environments without document (returns null).
 */
export function getCsrfToken(config: CsrfConfig): string | null {
  if (config.token) return config.token

  if (config.cookieName && typeof document !== 'undefined') {
    return readCookie(config.cookieName)
  }

  return null
}

function readCookie(name: string): string | null {
  const match = document.cookie.match(new RegExp(`(?:^|;\\s*)${escapeRegex(name)}=([^;]*)`))
  return match ? decodeURIComponent(match[1]) : null
}

function escapeRegex(str: string): string {
  return str.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
}
