import type { InterceptorConfig, ResolvedRequestConfig, AdapterResponse } from '../core/types.ts'
import { ApiError } from '../core/types.ts'

/**
 * Manages chains of before/after interceptors and error handlers.
 * Each interceptor in the chain can transform the config/response or throw to abort.
 */
export class InterceptorChain {
  private readonly beforeRequestHandlers: Array<
    (config: ResolvedRequestConfig) => ResolvedRequestConfig | Promise<ResolvedRequestConfig>
  > = []
  private readonly afterResponseHandlers: Array<
    <T>(response: AdapterResponse<T>) => AdapterResponse<T> | Promise<AdapterResponse<T>>
  > = []
  private readonly onErrorHandlers: Array<
    (error: ApiError) => ApiError | void | Promise<ApiError | void>
  > = []

  constructor(config?: InterceptorConfig) {
    if (config?.beforeRequest) this.beforeRequestHandlers.push(config.beforeRequest)
    if (config?.afterResponse) this.afterResponseHandlers.push(config.afterResponse)
    if (config?.onError) this.onErrorHandlers.push(config.onError)
  }

  /** Add an additional beforeRequest handler */
  addBeforeRequest(
    handler: (config: ResolvedRequestConfig) => ResolvedRequestConfig | Promise<ResolvedRequestConfig>,
  ): void {
    this.beforeRequestHandlers.push(handler)
  }

  /** Add an additional afterResponse handler */
  addAfterResponse<T>(
    handler: (response: AdapterResponse<T>) => AdapterResponse<T> | Promise<AdapterResponse<T>>,
  ): void {
    this.afterResponseHandlers.push(handler as typeof this.afterResponseHandlers[0])
  }

  /** Add an additional onError handler */
  addOnError(handler: (error: ApiError) => ApiError | void | Promise<ApiError | void>): void {
    this.onErrorHandlers.push(handler)
  }

  async runBeforeRequest(config: ResolvedRequestConfig): Promise<ResolvedRequestConfig> {
    let current = config
    for (const handler of this.beforeRequestHandlers) {
      current = await handler(current)
    }
    return current
  }

  async runAfterResponse<T>(response: AdapterResponse<T>): Promise<AdapterResponse<T>> {
    let current = response
    for (const handler of this.afterResponseHandlers) {
      current = await (handler as (r: AdapterResponse<T>) => AdapterResponse<T> | Promise<AdapterResponse<T>>)(current)
    }
    return current
  }

  async runOnError(error: ApiError): Promise<ApiError | void> {
    let current: ApiError | void = error
    for (const handler of this.onErrorHandlers) {
      if (current instanceof ApiError) {
        current = await handler(current)
      }
    }
    return current
  }
}
