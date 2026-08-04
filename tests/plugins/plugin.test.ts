import { describe, it, expect, vi } from 'vitest'
import { definePlugin, createNetworkRetryPlugin, createAuthRefreshPlugin } from '../../src/plugins/plugin.ts'
import { createApi } from '../../src/index.ts'

const BASE_URL = 'https://plugin.test.com'

describe('definePlugin', () => {
  it('should create a plugin with name and install', () => {
    const install = vi.fn()
    const plugin = definePlugin('test', install)

    expect(plugin.name).toBe('test')
    expect(plugin.install).toBe(install)
  })

  it('should install plugin and receive client', () => {
    const api = createApi({ baseURL: BASE_URL })
    const receivedClient = vi.fn()

    const plugin = definePlugin('client-test', (client) => {
      receivedClient(client)
    })

    api.use(plugin)
    expect(receivedClient).toHaveBeenCalledWith(api)
  })

  it('should not install duplicate plugins', () => {
    const api = createApi({ baseURL: BASE_URL })
    const install = vi.fn()
    const plugin = definePlugin('duplicate', install)

    api.use(plugin)
    api.use(plugin)

    expect(install).toHaveBeenCalledTimes(1)
  })
})

describe('Built-in Plugins', () => {
  it('createNetworkRetryPlugin should create valid plugin', () => {
    const plugin = createNetworkRetryPlugin(3)
    expect(plugin.name).toBe('network-retry')
    expect(typeof plugin.install).toBe('function')
  })

  it('createAuthRefreshPlugin should create valid plugin', () => {
    const plugin = createAuthRefreshPlugin()
    expect(plugin.name).toBe('auth-refresh-logger')
    expect(typeof plugin.install).toBe('function')
  })
})
