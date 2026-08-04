# React Hooks

api-flow provides first-class React hooks for data fetching and mutations. They handle loading, error, and data state automatically with proper cleanup on unmount.

## Installation

Hooks are a separate entry point — they're tree-shaken from non-React bundles:

```typescript
import { useGet, useMutation, usePost } from 'api-flow/hooks'
```

## `useGet<T>`

Automatically fetches data on mount. Cancels the request when the component unmounts.

```tsx
import { useGet } from 'api-flow/hooks'
import { api } from './api' // your createApi() instance

interface User {
  id: number
  name: string
  email: string
}

function UserList() {
  const { data, loading, error, refetch } = useGet<User[]>(api, '/users')

  if (loading) return <div>Loading...</div>
  if (error) return <div>Error: {error.message}</div>

  return (
    <div>
      <ul>
        {data?.map((user) => (
          <li key={user.id}>{user.name}</li>
        ))}
      </ul>
      <button onClick={refetch}>Refresh</button>
    </div>
  )
}
```

### Options

| Option | Type | Description |
|--------|------|-------------|
| `manual` | `boolean` | Don't fetch on mount. Call `refetch()` manually. |
| `deps` | `unknown[]` | Re-fetch when these values change (like `useEffect` deps). |
| `headers` | `Record<string, string>` | Per-request headers. |
| `cache` | `number \| false` | TTL override or disable cache. |
| `params` | `object` | Query string params. |

### With Dependencies

```tsx
function UserProfile({ userId }: { userId: number }) {
  const { data, loading } = useGet<User>(api, `/users/${userId}`, {
    deps: [userId], // refetch when userId changes
  })
  // ...
}
```

### Manual Trigger

```tsx
function LazyData() {
  const { data, loading, refetch } = useGet(api, '/data', { manual: true })

  return (
    <div>
      <button onClick={refetch} disabled={loading}>
        {loading ? 'Loading...' : 'Load Data'}
      </button>
      {data && <pre>{JSON.stringify(data, null, 2)}</pre>}
    </div>
  )
}
```

## `useMutation<T>`

For POST, PUT, PATCH, and DELETE operations. Does **not** auto-execute — you call `mutate()`.

```tsx
import { useMutation } from 'api-flow/hooks'

interface CreateUserInput {
  name: string
  email: string
}

function CreateUserForm() {
  const { mutate, loading, error, data } = useMutation<User, CreateUserInput>(
    api,
    'POST',
    '/users',
  )

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    try {
      await mutate({ name: 'Alice', email: 'alice@example.com' })
    } catch {
      // error is also available in state
    }
  }

  return (
    <form onSubmit={handleSubmit}>
      <button type="submit" disabled={loading}>
        {loading ? 'Creating...' : 'Create User'}
      </button>
      {error && <p>Error: {error.message}</p>}
      {data && <p>Created: {data.name}</p>}
    </form>
  )
}
```

## `usePost<T>` Convenience Hook

```tsx
import { usePost } from 'api-flow/hooks'

function LoginForm() {
  const { mutate: login, loading, error } = usePost<LoginResponse>(api, '/auth/login')

  const handleLogin = () => login({ email, password })
  // ...
}
```

## Next.js App Router

In Next.js App Router, hooks can only be used in Client Components:

```tsx
// components/UserList.tsx
'use client'

import { useGet } from 'api-flow/hooks'
import { api } from '@/lib/api'

export function UserList() {
  const { data, loading } = useGet<User[]>(api, '/users')
  // ...
}
```
