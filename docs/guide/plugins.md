# Plugin Guide

Plugins let you extend api-flow with custom behavior without modifying your config repeatedly.

## What is a Plugin?

A plugin is an object with a `name` and `install(client)` function:

```typescript
interface Plugin {
  name: string
  install(client: ApiClientInterface): void
}
```

## Creating a Plugin

### Using `definePlugin`

```typescript
import { definePlugin } from 'api-flow'

const timingPlugin = definePlugin('timing', (client) => {
  client.on('request:end', ({ url, duration, method }) => {
    if (duration > 1000) {
      console.warn(`⚠ Slow request: ${method} ${url} took ${duration.toFixed(0)}ms`)
    }
  })
})
```

### Using a plain object

```typescript
const authLogger: Plugin = {
  name: 'auth-logger',
  install(client) {
    client.on('auth:refresh', ({ success, queuedRequests }) => {
      if (success) {
        console.info(`Token refreshed, replayed ${queuedRequests} requests`)
      }
    })
  },
}
```

## Registering Plugins

```typescript
const api = createApi({ baseURL: '...' })

api.use(timingPlugin)
api.use(authLogger)
```

Plugins with duplicate names are silently ignored (installed only once).

## Built-in Plugins

### `createNetworkRetryPlugin`

Logs network retry events:

```typescript
import { createNetworkRetryPlugin } from 'api-flow'
api.use(createNetworkRetryPlugin(3))
```

### `createAuthRefreshPlugin`

Logs token refresh events:

```typescript
import { createAuthRefreshPlugin } from 'api-flow'
api.use(createAuthRefreshPlugin())
```

## Advanced: Adding Interceptors from Plugins

Plugins can access the `InterceptorChain` through the client:

```typescript
const requestIdPlugin = definePlugin('request-id', (client) => {
  // Listen to request:start to log all request IDs
  client.on('request:start', ({ id, url }) => {
    console.log(`[${id}] → ${url}`)
  })
})
```

## Events Available to Plugins

| Event | Payload |
|-------|---------|
| `request:start` | `{ id, url, method, headers }` |
| `request:end` | `{ id, url, method, status, duration, cached }` |
| `request:error` | `{ id, url, method, error }` |
| `auth:refresh` | `{ success, queuedRequests }` |
| `cache:hit` | `{ url, ttl }` |
| `offline:queued` | `{ url, method, queueSize }` |
| `offline:replay` | `{ replayed }` |
