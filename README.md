<div align="center">

<img src="https://raw.githubusercontent.com/api-flow/api-flow/main/docs/public/logo.svg" width="80" alt="api-flow logo" />

# api-flow

**The easiest and most powerful API client for JavaScript and TypeScript.**

[![npm version](https://img.shields.io/npm/v/api-flow?color=4f46e5&style=flat-square)](https://npmjs.com/package/api-flow)
[![npm downloads](https://img.shields.io/npm/dm/api-flow?color=4f46e5&style=flat-square)](https://npmjs.com/package/api-flow)
[![CI](https://img.shields.io/github/actions/workflow/status/api-flow/api-flow/ci.yml?label=CI&style=flat-square)](https://github.com/api-flow/api-flow/actions)
[![Coverage](https://img.shields.io/codecov/c/github/api-flow/api-flow?style=flat-square)](https://codecov.io/gh/api-flow/api-flow)
[![License: MIT](https://img.shields.io/badge/License-MIT-4f46e5?style=flat-square)](LICENSE)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.0+-3178c6?style=flat-square)](https://typescriptlang.org)
[![Bundle Size](https://img.shields.io/bundlephobia/minzip/api-flow?label=minzipped&style=flat-square)](https://bundlephobia.com/package/api-flow)

[Documentation](https://api-flow.dev) · [Quick Start](#quick-start) · [API Reference](#api-reference) · [Examples](#examples) · [Contributing](#contributing)

</div>

---

## Why api-flow?

| Feature | api-flow | axios | fetch | ky |
|---|:---:|:---:|:---:|:---:|
| Auto auth headers | ✅ | ❌ | ❌ | ❌ |
| Refresh token flow | ✅ | ❌ | ❌ | ❌ |
| Request deduplication | ✅ | ❌ | ❌ | ❌ |
| Memory cache + TTL | ✅ | ❌ | ❌ | ❌ |
| Exponential backoff | ✅ | ❌ | ❌ | ✅ |
| React hooks | ✅ | ❌ | ❌ | ❌ |
| Offline queue | ✅ | ❌ | ❌ | ❌ |
| Plugin system | ✅ | ❌ | ❌ | ❌ |
| Performance metrics | ✅ | ❌ | ❌ | ❌ |
| TypeScript generics | ✅ | ✅ | ❌ | ✅ |
| Tree-shakeable | ✅ | ❌ | ✅ | ✅ |
| Zero dependencies | ✅ | ❌ | ✅ | ❌ |

## Features

- 🔐 **Authentication** — Bearer tokens, custom schemes, automatic refresh with request queuing
- ⚡ **Smart Cache** — Memory cache with TTL, LRU eviction, manual invalidation
- 🔄 **Auto Retry** — Exponential backoff with jitter, configurable status codes
- ⚛️ **React Hooks** — `useGet()`, `usePost()`, `useMutation()` with loading/error/data states
- 🌐 **Universal** — Browser, Node.js 18+, React Native, Deno, Bun
- 🧩 **Plugin System** — Extend via `api.use(plugin)` with full event access
- 🔌 **Adapters** — Fetch (default, zero-deps), Axios (opt-in)
- 📦 **Dual ESM + CJS** — Tree-shakeable, works everywhere
- 📊 **Metrics** — Per-request timing, cache hit rates, slowest requests
- 🪵 **Dev Logger** — Color-coded console timeline with duration and headers
- 📵 **Offline Mode** — Queue requests, replay on reconnect
- 🖥️ **SSR Ready** — Next.js compatible, cookie forwarding
- 🛡️ **CSRF Support** — Cookie-based or static CSRF tokens
- 📁 **File Upload** — Multipart with progress callback
- 📥 **Download** — Blob with progress callback
- 📄 **Pagination** — Page-based and cursor-based async generators
- 🎯 **TypeScript** — Fully typed with generics `api.get<User[]>('/users')`

---

## Quick Start

```sh
npm install api-flow
```

```typescript
import { createApi } from 'api-flow'

const api = createApi({
  baseURL: 'https://api.example.com',
  auth: {
    getAccessToken: () => localStorage.getItem('token'),
    getRefreshToken: () => localStorage.getItem('refresh'),
    refresh: async (refreshToken) => {
      const res = await fetch('/auth/refresh', {
        method: 'POST',
        body: JSON.stringify({ token: refreshToken }),
        headers: { 'Content-Type': 'application/json' },
      })
      const data = await res.json()
      localStorage.setItem('token', data.accessToken)
      return data.accessToken
    },
  },
  retry: 3,
  cache: { enabled: true, ttl: 5 * 60 * 1000 },
  logger: true, // dev console logging
})

// Fully typed responses
const users = await api.get<User[]>('/users')
const user = await api.post<User>('/users', { name: 'Alice' })
await api.put('/users/1', { name: 'Alice Updated' })
await api.delete('/users/1')
```

---

## Examples

### React

```tsx
import { useGet, useMutation } from 'api-flow/hooks'
import { api } from './api'

function UserList() {
  const { data, loading, error, refetch } = useGet<User[]>(api, '/users')

  if (loading) return <Spinner />
  if (error) return <Error message={error.message} />

  return (
    <ul>
      {data?.map(user => <li key={user.id}>{user.name}</li>)}
      <button onClick={refetch}>Refresh</button>
    </ul>
  )
}

function CreateUser() {
  const { mutate, loading } = useMutation<User>(api, 'POST', '/users')

  return (
    <button onClick={() => mutate({ name: 'Bob' })} disabled={loading}>
      Create User
    </button>
  )
}
```

### Next.js (SSR)

```typescript
// app/api/users/route.ts
import { createServerSideApi, extractServerHeaders } from 'api-flow'

export async function GET(request: Request) {
  const api = createServerSideApi({
    baseURL: process.env.INTERNAL_API_URL,
    headers: extractServerHeaders(request),
  })

  const users = await api.get<User[]>('/users')
  return Response.json(users.data)
}
```

### React Native

```typescript
import { createApi } from 'api-flow'

// React Native: uses fetch (built-in) — no window/navigator issues
const api = createApi({
  baseURL: 'https://api.example.com',
  auth: {
    getAccessToken: async () => {
      const { SecureStore } = await import('expo-secure-store')
      return SecureStore.getItemAsync('access_token')
    },
  },
})
```

### Vue

```typescript
// composables/useApi.ts
import { ref, onMounted, onUnmounted } from 'vue'
import type { ApiClient } from 'api-flow'

export function useApiGet<T>(client: ApiClient, url: string) {
  const data = ref<T | null>(null)
  const loading = ref(true)
  const error = ref<Error | null>(null)
  let abortController: AbortController | null = null

  onMounted(async () => {
    abortController = new AbortController()
    try {
      const res = await client.get<T>(url, { signal: abortController.signal })
      data.value = res.data
    } catch (e) {
      error.value = e as Error
    } finally {
      loading.value = false
    }
  })

  onUnmounted(() => abortController?.abort())

  return { data, loading, error }
}
```

### Node.js

```typescript
import { createApi } from 'api-flow'

const api = createApi({
  baseURL: process.env.API_URL,
  auth: {
    getAccessToken: () => process.env.API_KEY,
    scheme: 'ApiKey',
    headerKey: 'X-API-Key',
  },
  retry: { attempts: 3, delay: 500 },
})

const data = await api.get<ProductList>('/products')
```

### File Upload

```typescript
const formData = new FormData()
formData.append('file', fileInput.files[0])
formData.append('name', 'avatar')

await api.upload('/media/upload', formData, {
  onProgress: (percent, loaded, total) => {
    console.log(`${percent}% — ${loaded}/${total} bytes`)
  },
})
```

### Pagination

```typescript
// Page-based
for await (const page of api.paginate<Product>('/products', { page: 1, limit: 20 })) {
  console.log(page.data) // Product[]
  if (!page.hasMore) break
}

// Cursor-based
for await (const page of api.cursorPaginate<Post>('/feed')) {
  processPage(page.data)
  if (!page.nextCursor) break
}
```

### Plugins

```typescript
import { definePlugin } from 'api-flow'

const analyticsPlugin = definePlugin('analytics', (client) => {
  client.on('request:end', ({ url, method, status, duration }) => {
    analytics.track('api_request', { url, method, status, duration })
  })
})

api.use(analyticsPlugin)
```

### Events

```typescript
api.on('request:start', ({ id, url, method }) => {
  console.log(`→ [${id}] ${method} ${url}`)
})

api.on('auth:refresh', ({ success, queuedRequests }) => {
  console.log(`Token refreshed. Replaying ${queuedRequests} requests.`)
})

api.on('cache:hit', ({ url }) => {
  console.log(`Cache hit: ${url}`)
})
```

---

## API Reference

### `createApi(config)`

Creates a new `ApiClient` instance.

```typescript
const api = createApi({
  baseURL: string                    // Base URL for all requests
  headers?: Record<string, string>   // Default headers
  timeout?: number                   // Default timeout in ms (default: 30000)
  auth?: AuthConfig                  // Authentication config
  cache?: CacheConfig                // Cache config
  retry?: RetryConfig | number       // Retry config or attempt count
  interceptors?: InterceptorConfig   // Before/after hooks
  logger?: boolean | LoggerConfig    // Dev logging
  adapter?: 'fetch' | 'axios'        // HTTP adapter
  onError?: (error) => void          // Global error handler
  onSuccess?: (response) => void     // Global success handler
  offline?: OfflineConfig            // Offline queue config
  csrf?: CsrfConfig                  // CSRF token config
  credentials?: RequestCredentials   // Fetch credentials mode
  metrics?: boolean                  // Collect performance metrics
})
```

### `AuthConfig`

```typescript
{
  getAccessToken?: () => string | null | Promise<string | null>
  getRefreshToken?: () => string | null | Promise<string | null>
  refresh?: (token) => Promise<string | null>  // Called on 401
  headerKey?: string   // Default: 'Authorization'
  scheme?: string      // Default: 'Bearer'
  refreshOn?: number[] // Default: [401]
}
```

### `RetryConfig`

```typescript
{
  attempts?: number       // Number of retries (default: 0)
  delay?: number          // Base delay in ms (default: 300)
  maxDelay?: number       // Max delay cap (default: 30000)
  statusCodes?: number[]  // Default: [408, 429, 500, 502, 503, 504]
  jitter?: boolean        // Add jitter (default: true)
  onRetry?: (error, attempt) => boolean | void
}
```

### HTTP Methods

```typescript
api.get<T>(url, options?)
api.post<T>(url, body?, options?)
api.put<T>(url, body?, options?)
api.patch<T>(url, body?, options?)
api.delete<T>(url, options?)
```

### Per-Request Options

```typescript
{
  headers?: Record<string, string>
  timeout?: number
  retry?: RetryConfig | number
  cache?: number | false     // TTL or disable
  signal?: AbortSignal
  id?: string                // For cancel()
  params?: Record<string, string | number | boolean>
  responseType?: 'json' | 'blob' | 'text' | 'arrayBuffer'
  skipAuth?: boolean
  skipCache?: boolean
}
```

### Instance Methods

```typescript
api.cancel(id: string)                    // Abort a request by ID
api.cancelAll()                           // Abort all pending requests
api.clearCache(url?: string)              // Clear cache (all or specific)
api.getMetrics()                          // Get performance metrics
api.clearMetrics()                        // Clear metrics
api.use(plugin)                           // Register a plugin
api.on(event, listener)                   // Subscribe to events
api.off(event, listener)                  // Unsubscribe from events
api.upload(url, formData, options?)       // Multipart file upload
api.download(url, options?)               // Download as Blob
api.paginate(url, params?, options?)      // Page-based pagination
api.cursorPaginate(url, params?, options?) // Cursor pagination
```

---

## Performance

api-flow is designed to be lightweight and fast. Compared to axios:

- **~3x smaller** bundle size (no dependencies)
- **Same throughput** on HTTP requests (delegates to native fetch)
- **Zero cold-start** overhead in Node.js (no global setup)

---

## Contributing

We welcome contributions! Please read [CONTRIBUTING.md](CONTRIBUTING.md) for guidelines.

### Development Setup

```sh
git clone https://github.com/api-flow/api-flow.git
cd api-flow
pnpm install

pnpm test          # Run tests
pnpm test:watch    # Watch mode
pnpm build         # Build package
pnpm docs:dev      # Start docs dev server
```

---

## License

[MIT](LICENSE) — Copyright © 2024-present api-flow contributors.
