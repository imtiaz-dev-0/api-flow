import { describe, it, expect, vi } from 'vitest'
import { TokenRefreshManager } from '../../src/auth/refresh.ts'

describe('TokenRefreshManager', () => {
  describe('getAuthHeader', () => {
    it('should return empty object when no auth config', async () => {
      const mgr = new TokenRefreshManager()
      const headers = await mgr.getAuthHeader()
      expect(headers).toEqual({})
    })

    it('should return Bearer Authorization header', async () => {
      const mgr = new TokenRefreshManager({
        getAccessToken: () => 'my-token',
      })
      const headers = await mgr.getAuthHeader()
      expect(headers).toEqual({ Authorization: 'Bearer my-token' })
    })

    it('should support async getAccessToken', async () => {
      const mgr = new TokenRefreshManager({
        getAccessToken: async () => 'async-token',
      })
      const headers = await mgr.getAuthHeader()
      expect(headers).toEqual({ Authorization: 'Bearer async-token' })
    })

    it('should return empty when token is null', async () => {
      const mgr = new TokenRefreshManager({
        getAccessToken: () => null,
      })
      const headers = await mgr.getAuthHeader()
      expect(headers).toEqual({})
    })

    it('should use custom header key and scheme', async () => {
      const mgr = new TokenRefreshManager({
        getAccessToken: () => 'token123',
        headerKey: 'X-Auth-Token',
        scheme: 'Token',
      })
      const headers = await mgr.getAuthHeader()
      expect(headers).toEqual({ 'X-Auth-Token': 'Token token123' })
    })
  })

  describe('handleUnauthorized', () => {
    it('should call refresh and retry request', async () => {
      const newToken = 'new-token'
      const refresh = vi.fn().mockResolvedValue(newToken)
      const retryFn = vi.fn().mockResolvedValue({ data: 'ok', status: 200 })

      const mgr = new TokenRefreshManager({
        getAccessToken: () => 'old-token',
        refresh,
      })

      await mgr.handleUnauthorized(retryFn)

      expect(refresh).toHaveBeenCalledTimes(1)
      expect(retryFn).toHaveBeenCalledTimes(1)
    })

    it('should queue concurrent requests during refresh', async () => {
      let resolveRefresh!: () => void
      const refreshPromise = new Promise<string>((resolve) => {
        resolveRefresh = () => resolve('new-token')
      })

      const refresh = vi.fn().mockReturnValue(refreshPromise)
      let callCount = 0
      const retryFn = vi.fn().mockImplementation(() => {
        callCount++
        return Promise.resolve({ data: `result-${callCount}`, status: 200 })
      })

      const mgr = new TokenRefreshManager({
        getAccessToken: () => 'old-token',
        refresh,
      })

      // Start 3 concurrent unauthorized handlers
      const p1 = mgr.handleUnauthorized(retryFn)
      const p2 = mgr.handleUnauthorized(retryFn)
      const p3 = mgr.handleUnauthorized(retryFn)

      // Refresh should only be called once
      expect(refresh).toHaveBeenCalledTimes(1)

      // Resolve the refresh
      resolveRefresh()
      await Promise.all([p1, p2, p3])

      // All requests should have been retried
      expect(retryFn).toHaveBeenCalledTimes(3)
    })

    it('should reject all queued requests if refresh fails', async () => {
      const refresh = vi.fn().mockRejectedValue(new Error('Refresh failed'))
      const retryFn = vi.fn()

      const mgr = new TokenRefreshManager({
        getAccessToken: () => 'old-token',
        refresh,
      })

      await expect(mgr.handleUnauthorized(retryFn)).rejects.toThrow('Refresh failed')
    })

    it('should return null when no refresh function configured', async () => {
      const mgr = new TokenRefreshManager({
        getAccessToken: () => 'token',
      })

      const retryFn = vi.fn()
      const result = await mgr.handleUnauthorized(retryFn)
      expect(result).toBeNull()
      expect(retryFn).not.toHaveBeenCalled()
    })

    it('should call onRefreshComplete callback with queued count', async () => {
      const refresh = vi.fn().mockResolvedValue('new-token')
      const retryFn = vi.fn().mockResolvedValue({ data: 'ok', status: 200 })
      const onComplete = vi.fn()

      const mgr = new TokenRefreshManager({
        getAccessToken: () => 'old-token',
        refresh,
      })

      await mgr.handleUnauthorized(retryFn, onComplete)
      expect(onComplete).toHaveBeenCalledTimes(1)
    })
  })

  describe('state tracking', () => {
    it('should report refresh in progress', async () => {
      let resolveRefresh!: () => void
      const refreshPromise = new Promise<string>((resolve) => {
        resolveRefresh = () => resolve('new-token')
      })

      const mgr = new TokenRefreshManager({
        getAccessToken: () => 'old-token',
        refresh: vi.fn().mockReturnValue(refreshPromise),
      })

      const retryFn = vi.fn().mockResolvedValue({ status: 200, data: 'ok' })

      // Start refresh
      const p = mgr.handleUnauthorized(retryFn)
      expect(mgr.isRefreshInProgress()).toBe(true)

      resolveRefresh()
      await p
      expect(mgr.isRefreshInProgress()).toBe(false)
    })
  })
})
