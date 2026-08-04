import type { ApiClientInterface, Plugin } from '../core/types.ts'

/**
 * Plugin registry and interface.
 *
 * Plugins can extend the ApiClient by:
 * - Adding interceptors
 * - Subscribing to events
 * - Adding custom headers
 * - Modifying retry / cache config
 *
 * @example
 * const authPlugin: Plugin = {
 *   name: 'auth',
 *   install(client) {
 *     client.on('request:error', (event) => {
 *       console.log('Request failed:', event.url)
 *     })
 *   }
 * }
 * api.use(authPlugin)
 */
export type { Plugin }

/**
 * Creates a plugin with type safety.
 *
 * @example
 * const loggingPlugin = definePlugin('logging', (client) => {
 *   client.on('request:start', ({ url, method }) => {
 *     console.log(`→ ${method} ${url}`)
 *   })
 * })
 */
export function definePlugin(
  name: string,
  install: (client: ApiClientInterface) => void,
): Plugin {
  return { name, install }
}

/**
 * Built-in: Retry on network error plugin.
 * Useful as a composable alternative to global retry config.
 */
export function createNetworkRetryPlugin(attempts = 3): Plugin {
  return definePlugin('network-retry', (client) => {
    client.on('request:error', (event) => {
      if (event.error.isNetworkError) {
        console.warn(`[api-flow:network-retry] Network error on ${event.url}, retried ${attempts}x`)
      }
    })
  })
}

/**
 * Built-in: Authorization header refresher plugin.
 * Logs auth refresh events.
 */
export function createAuthRefreshPlugin(): Plugin {
  return definePlugin('auth-refresh-logger', (client) => {
    client.on('auth:refresh', (event) => {
      if (event.success) {
        console.info(`[api-flow:auth] Token refreshed, replaying ${event.queuedRequests} request(s)`)
      }
    })
  })
}
