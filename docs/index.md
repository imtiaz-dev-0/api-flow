---
layout: home

hero:
  name: "api-flow"
  text: "API clients, simplified."
  tagline: The easiest and most powerful HTTP client for JavaScript and TypeScript. Zero dependencies, fully typed, works everywhere.
  actions:
    - theme: brand
      text: Get Started →
      link: /guide/getting-started
    - theme: alt
      text: View on GitHub
      link: https://github.com/api-flow/api-flow

features:
  - icon: 🔐
    title: Auth Built-In
    details: Bearer token, custom schemes, automatic refresh token handling with request queuing — no boilerplate.
  - icon: ⚡
    title: Smart Caching
    details: Memory cache with TTL, LRU eviction, deduplication, and manual invalidation out of the box.
  - icon: 🔄
    title: Auto Retry
    details: Configurable retry with exponential backoff and jitter. Retries on network errors, timeouts, and 5xx.
  - icon: ⚛️
    title: React Hooks
    details: useGet(), usePost(), useMutation() — loading/error/data state with auto-cancel on unmount.
  - icon: 🌐
    title: Universal
    details: Works in React, Vue, Next.js, React Native, Node.js, and vanilla JavaScript.
  - icon: 🧩
    title: Plugin System
    details: Extend api-flow with plugins. Tap into the request lifecycle, events, and interceptors.
  - icon: 🔌
    title: Adapters
    details: Ships with a native fetch adapter. Swap in axios when you need it.
  - icon: 📊
    title: Metrics & Logging
    details: Per-request timing, cache hit rates, and color-coded dev console logging.
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
      const res = await api.post('/auth/refresh', { token: refreshToken })
      localStorage.setItem('token', res.data.accessToken)
      return res.data.accessToken
    },
  },
  retry: 3,
  cache: { enabled: true, ttl: 5 * 60 * 1000 },
})

// Fully typed responses
const users = await api.get<User[]>('/users')
await api.post('/users', { name: 'Alice' })
await api.put('/users/1', { name: 'Alice Updated' })
await api.delete('/users/1')
```
