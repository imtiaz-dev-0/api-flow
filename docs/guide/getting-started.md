# Getting Started

## Installation

::: code-group
```sh [npm]
npm install api-flow-client
```
```sh [pnpm]
pnpm add api-flow-client
```
```sh [yarn]
yarn add api-flow-client
```
:::

## Requirements

- **Browser**: Any modern browser (Chrome 80+, Firefox 75+, Safari 14+)
- **Node.js**: 18+ (native `fetch` required)
- **React Native**: 0.60+ (with Hermes engine)
- **TypeScript**: 5.0+ (optional but strongly recommended)

## Basic Usage

```typescript
import { createApi } from 'api-flow-client'

const api = createApi({
  baseURL: 'https://api.example.com',
})

// GET with TypeScript generics
const response = await api.get<User[]>('/users')
console.log(response.data) // User[]
console.log(response.status) // 200
console.log(response.headers) // Record<string, string>
console.log(response.duration) // milliseconds
```

## With Authentication

```typescript
const api = createApi({
  baseURL: 'https://api.example.com',
  auth: {
    getAccessToken: () => localStorage.getItem('access_token'),
    getRefreshToken: () => localStorage.getItem('refresh_token'),
    refresh: async (refreshToken) => {
      const res = await fetch('/auth/refresh', {
        method: 'POST',
        body: JSON.stringify({ token: refreshToken }),
        headers: { 'Content-Type': 'application/json' },
      })
      const data = await res.json()
      localStorage.setItem('access_token', data.accessToken)
      return data.accessToken
    },
  },
})
```

The `Authorization: Bearer <token>` header is injected automatically. When a 401 is detected, the refresh callback fires once — all concurrent requests are queued and replayed automatically.

## With Retry + Cache

```typescript
const api = createApi({
  baseURL: 'https://api.example.com',
  retry: 3,                            // retry 3 times on network error / 5xx
  cache: {
    enabled: true,
    ttl: 5 * 60 * 1000,               // cache GET responses for 5 minutes
  },
})
```

## Full Configuration

See [Configuration Reference](/guide/configuration) for all options.

## Next Steps

- [HTTP Methods](/guide/http-methods) — GET, POST, PUT, PATCH, DELETE
- [Authentication](/guide/authentication) — Token management and refresh
- [React Hooks](/guide/react-hooks) — useGet, useMutation
- [Plugins](/guide/plugins) — Extend api-flow
