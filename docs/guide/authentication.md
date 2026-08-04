# Authentication

api-flow provides first-class authentication support with automatic header injection, token refresh, and request queuing.

## Basic Bearer Token

```typescript
const api = createApi({
  baseURL: 'https://api.example.com',
  auth: {
    getAccessToken: () => localStorage.getItem('token'),
  },
})
```

Every request will automatically include:
```
Authorization: Bearer <token>
```

## Refresh Token Flow

When a 401 is received, api-flow automatically:

1. Pauses all in-flight requests
2. Calls your `refresh()` function **once** (even if 10 requests failed simultaneously)
3. Replays all queued requests with the new token

```typescript
const api = createApi({
  auth: {
    getAccessToken: () => localStorage.getItem('access_token'),
    getRefreshToken: () => localStorage.getItem('refresh_token'),
    refresh: async (refreshToken) => {
      const res = await fetch('/auth/refresh', {
        method: 'POST',
        body: JSON.stringify({ refreshToken }),
        headers: { 'Content-Type': 'application/json' },
      })
      const { accessToken } = await res.json()
      localStorage.setItem('access_token', accessToken)
      return accessToken
    },
  },
})
```

## Custom Token Scheme

```typescript
const api = createApi({
  auth: {
    getAccessToken: () => process.env.API_KEY,
    headerKey: 'X-API-Key',
    scheme: '', // No prefix — header will be: "X-API-Key: <token>"
  },
})
```

Or with a custom scheme:
```typescript
auth: {
  getAccessToken: () => token,
  scheme: 'Token',  // → "Authorization: Token <token>"
}
```

## Async Token Retrieval

`getAccessToken` can be async — useful with React Native SecureStore:

```typescript
auth: {
  getAccessToken: async () => {
    return AsyncStorage.getItem('token')
  },
}
```

## Skip Auth for Specific Requests

```typescript
// Don't inject Authorization header for this request
await api.post('/auth/login', { email, password }, { skipAuth: true })
```

## Custom Refresh Status Codes

By default, refresh triggers on 401. Override with:

```typescript
auth: {
  refreshOn: [401, 403],  // also refresh on 403
}
```
