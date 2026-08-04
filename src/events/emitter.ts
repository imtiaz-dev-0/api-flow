import type { EventMap } from '../core/types.ts'

type Listener<T> = (data: T) => void

/**
 * Lightweight, typed event emitter.
 * Zero dependencies — no Node.js EventEmitter required.
 * Works in browser, Node.js, and React Native.
 */
export class EventEmitter {
  private readonly listeners = new Map<string, Set<Listener<unknown>>>()

  /**
   * Subscribe to an event. Returns an unsubscribe function.
   */
  on<K extends keyof EventMap>(event: K, listener: Listener<EventMap[K]>): () => void {
    if (!this.listeners.has(event)) {
      this.listeners.set(event, new Set())
    }
    this.listeners.get(event)!.add(listener as Listener<unknown>)

    return () => this.off(event, listener)
  }

  /**
   * Subscribe to an event, fire once, then auto-unsubscribe.
   */
  once<K extends keyof EventMap>(event: K, listener: Listener<EventMap[K]>): () => void {
    const wrapper: Listener<EventMap[K]> = (data) => {
      listener(data)
      this.off(event, wrapper)
    }
    return this.on(event, wrapper)
  }

  /**
   * Unsubscribe from an event.
   */
  off<K extends keyof EventMap>(event: K, listener: Listener<EventMap[K]>): void {
    this.listeners.get(event)?.delete(listener as Listener<unknown>)
  }

  /**
   * Emit an event to all subscribers.
   */
  emit<K extends keyof EventMap>(event: K, data: EventMap[K]): void {
    const eventListeners = this.listeners.get(event)
    if (!eventListeners) return

    // Copy to avoid mutation during iteration
    for (const listener of [...eventListeners]) {
      try {
        listener(data)
      } catch (error) {
        console.error(`[api-flow] Error in event listener for "${event}":`, error)
      }
    }
  }

  /**
   * Remove all listeners for a specific event, or all events if none specified.
   */
  removeAll(event?: keyof EventMap): void {
    if (event) {
      this.listeners.delete(event)
    } else {
      this.listeners.clear()
    }
  }

  /**
   * Returns the number of listeners for a given event.
   */
  listenerCount(event: keyof EventMap): number {
    return this.listeners.get(event)?.size ?? 0
  }
}
