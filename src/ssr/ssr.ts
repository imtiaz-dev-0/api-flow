import type { ApiConfig } from '../core/types.ts'
import { ApiClient } from '../core/client.ts'

/**
 * Creates an SSR-compatible ApiClient instance for use in:
 * - Next.js getServerSideProps / App Router server components
 * - Nuxt server-side handlers
 * - Express/Fastify middleware
 *
 * Features:
 * - No window/navigator usage
 * - Cookie forwarding from incoming request headers
 * - Server-side auth header injection
 *
 * @example
 * // Next.js pages/api/users.ts
 * export async function getServerSideProps({ req }) {
 *   const api = createServerSideApi({
 *     baseURL: process.env.API_URL,
 *     headers: { cookie: req.headers.cookie }
 *   })
 *   const users = await api.get('/users')
 *   return { props: { users: users.data } }
 * }
 */
export function createServerSideApi(config: ApiConfig): ApiClient {
  return new ApiClient({
    ...config,
    // Disable offline queue on server
    offline: { enabled: false },
    // SSR should not cache unless explicitly opted in
    cache: config.cache ?? { enabled: false },
  })
}

/**
 * Extracts forwarded cookies and relevant headers from a server request
 * for use in API requests. Compatible with Next.js IncomingMessage and
 * standard Request objects.
 */
export function extractServerHeaders(
  req: { headers: Record<string, string | string[] | undefined> | Headers },
): Record<string, string> {
  const headers: Record<string, string> = {}
  const rawHeaders = req.headers

  const extract = (key: string) => {
    if (rawHeaders instanceof Headers) {
      const val = rawHeaders.get(key)
      if (val) headers[key] = val
    } else {
      const val = rawHeaders[key]
      if (typeof val === 'string') headers[key] = val
      else if (Array.isArray(val)) headers[key] = val.join(', ')
    }
  }

  extract('cookie')
  extract('authorization')
  extract('x-forwarded-for')
  extract('x-real-ip')
  extract('accept-language')

  return headers
}
