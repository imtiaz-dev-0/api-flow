import { describe, it, expect, vi } from 'vitest'
import { EventEmitter } from '../../src/events/emitter.ts'

describe('EventEmitter', () => {
  it('should subscribe and receive events', () => {
    const emitter = new EventEmitter()
    const listener = vi.fn()

    emitter.on('request:start', listener)
    emitter.emit('request:start', { id: '1', url: '/test', method: 'GET', headers: {} })

    expect(listener).toHaveBeenCalledTimes(1)
    expect(listener).toHaveBeenCalledWith({ id: '1', url: '/test', method: 'GET', headers: {} })
  })

  it('should unsubscribe via returned function', () => {
    const emitter = new EventEmitter()
    const listener = vi.fn()

    const unsub = emitter.on('request:end', listener)
    emitter.emit('request:end', { id: '1', url: '/test', method: 'GET', status: 200, duration: 100, cached: false })
    expect(listener).toHaveBeenCalledTimes(1)

    unsub()
    emitter.emit('request:end', { id: '1', url: '/test', method: 'GET', status: 200, duration: 100, cached: false })
    expect(listener).toHaveBeenCalledTimes(1) // no additional call
  })

  it('should unsubscribe via off()', () => {
    const emitter = new EventEmitter()
    const listener = vi.fn()

    emitter.on('cache:hit', listener)
    emitter.emit('cache:hit', { url: '/test', ttl: 1000 })
    emitter.off('cache:hit', listener)
    emitter.emit('cache:hit', { url: '/test', ttl: 1000 })

    expect(listener).toHaveBeenCalledTimes(1)
  })

  it('should fire once() listener only once', () => {
    const emitter = new EventEmitter()
    const listener = vi.fn()

    emitter.once('cache:hit', listener)
    emitter.emit('cache:hit', { url: '/test', ttl: 1000 })
    emitter.emit('cache:hit', { url: '/test', ttl: 1000 })

    expect(listener).toHaveBeenCalledTimes(1)
  })

  it('should support multiple listeners for same event', () => {
    const emitter = new EventEmitter()
    const l1 = vi.fn()
    const l2 = vi.fn()
    const l3 = vi.fn()

    emitter.on('auth:refresh', l1)
    emitter.on('auth:refresh', l2)
    emitter.on('auth:refresh', l3)

    emitter.emit('auth:refresh', { success: true, queuedRequests: 2 })

    expect(l1).toHaveBeenCalledTimes(1)
    expect(l2).toHaveBeenCalledTimes(1)
    expect(l3).toHaveBeenCalledTimes(1)
  })

  it('should not call listener after removeAll()', () => {
    const emitter = new EventEmitter()
    const listener = vi.fn()

    emitter.on('cache:hit', listener)
    emitter.removeAll('cache:hit')
    emitter.emit('cache:hit', { url: '/test', ttl: 1000 })

    expect(listener).not.toHaveBeenCalled()
  })

  it('should report listener count', () => {
    const emitter = new EventEmitter()
    emitter.on('request:start', vi.fn())
    emitter.on('request:start', vi.fn())
    expect(emitter.listenerCount('request:start')).toBe(2)
  })

  it('should not throw if no listeners for an event', () => {
    const emitter = new EventEmitter()
    expect(() =>
      emitter.emit('request:start', { id: '1', url: '/test', method: 'GET', headers: {} }),
    ).not.toThrow()
  })

  it('should isolate errors in listeners', () => {
    const emitter = new EventEmitter()
    const badListener = vi.fn(() => { throw new Error('Listener error') })
    const goodListener = vi.fn()

    emitter.on('cache:hit', badListener)
    emitter.on('cache:hit', goodListener)

    // Should not throw despite bad listener
    expect(() => emitter.emit('cache:hit', { url: '/test', ttl: 1000 })).not.toThrow()
    expect(goodListener).toHaveBeenCalledTimes(1)
  })
})
