# Next.js Integration

api-flow is fully compatible with Next.js — both the Pages Router and App Router.

## Setup: Create a Shared API Instance

Create `lib/api.ts` to share one instance across client components:

```typescript
// lib/api.ts
import { createApi } from 'api-flow'

export const api = createApi({
  baseURL: process.env.NEXT_PUBLIC_API_URL,
  auth: {
    getAccessToken: () => {
      if (typeof window === 'undefined') return null
      return localStorage.getItem('access_token')
    },
    refresh: async (refreshToken) => {
      const res = await fetch('/api/auth/refresh', {
        method: 'POST',
        body: JSON.stringify({ token: refreshToken }),
        headers: { 'Content-Type': 'application/json' },
      })
      const data = await res.json()
      localStorage.setItem('access_token', data.accessToken)
      return data.accessToken
    },
  },
  retry: 3,
  cache: { enabled: true, ttl: 60_000 },
})
```

## App Router — Client Components

```tsx
// app/users/page.tsx (Client Component)
'use client'

import { useGet } from 'api-flow/hooks'
import { api } from '@/lib/api'

export default function UsersPage() {
  const { data, loading, error } = useGet<User[]>(api, '/users')

  if (loading) return <div>Loading...</div>
  if (error) return <div>Error: {error.message}</div>

  return <ul>{data?.map(u => <li key={u.id}>{u.name}</li>)}</ul>
}
```

## App Router — Server Components

In Server Components, call the API directly (no hooks):

```typescript
// app/users/page.tsx (Server Component)
import { createServerSideApi, extractServerHeaders } from 'api-flow'
import { headers } from 'next/headers'

export default async function UsersPage() {
  const api = createServerSideApi({
    baseURL: process.env.INTERNAL_API_URL, // internal network URL
    headers: Object.fromEntries(headers()),
  })

  const response = await api.get<User[]>('/users')

  return <ul>{response.data.map(u => <li key={u.id}>{u.name}</li>)}</ul>
}
```

## App Router — Route Handlers

```typescript
// app/api/users/route.ts
import { createServerSideApi } from 'api-flow'

export async function GET(request: Request) {
  const api = createServerSideApi({
    baseURL: process.env.INTERNAL_API_URL,
    auth: {
      getAccessToken: () => process.env.SERVICE_API_KEY,
    },
  })

  const users = await api.get<User[]>('/users')
  return Response.json(users.data)
}
```

## Pages Router — `getServerSideProps`

```typescript
// pages/users.tsx
import { createServerSideApi, extractServerHeaders } from 'api-flow'
import type { GetServerSideProps } from 'next'

export const getServerSideProps: GetServerSideProps = async ({ req }) => {
  const api = createServerSideApi({
    baseURL: process.env.INTERNAL_API_URL,
    headers: extractServerHeaders(req),
  })

  const response = await api.get<User[]>('/users')
  return { props: { users: response.data } }
}
```

## Environment Variables

```env
NEXT_PUBLIC_API_URL=https://api.example.com   # Client-side (public)
INTERNAL_API_URL=http://internal-api:3000     # Server-side only
SERVICE_API_KEY=your-secret-key
```
