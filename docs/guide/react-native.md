# React Native

api-flow works in React Native out of the box. It uses only the `fetch` API, which is built into React Native's JavaScript runtime (Hermes and JSC).

## No Browser APIs Required

api-flow avoids all browser-only APIs:
- No `window.localStorage` (use `AsyncStorage` or `SecureStore` instead)
- No `window.addEventListener('online')` in React Native mode (offline detection is disabled automatically)
- No `XMLHttpRequest` for upload progress (falls back to fetch-based upload)
- No `document.cookie` (CSRF via cookie is not supported; use static token instead)

## Setup

```typescript
// api.ts
import { createApi } from 'api-flow'
import * as SecureStore from 'expo-secure-store' // or react-native-keychain

export const api = createApi({
  baseURL: 'https://api.example.com',
  auth: {
    getAccessToken: async () => {
      return SecureStore.getItemAsync('access_token')
    },
    getRefreshToken: async () => {
      return SecureStore.getItemAsync('refresh_token')
    },
    refresh: async (refreshToken) => {
      const res = await api.post<{ accessToken: string; refreshToken: string }>(
        '/auth/refresh',
        { token: refreshToken },
        { skipAuth: true },
      )
      await SecureStore.setItemAsync('access_token', res.data.accessToken)
      await SecureStore.setItemAsync('refresh_token', res.data.refreshToken)
      return res.data.accessToken
    },
  },
  retry: 3,
  timeout: 20_000,
})
```

## Usage in Components

```tsx
import { useState, useEffect } from 'react'
import { View, Text, FlatList } from 'react-native'
import { api } from './api'

interface User {
  id: number
  name: string
}

export function UserList() {
  const [users, setUsers] = useState<User[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    api.get<User[]>('/users')
      .then((res) => setUsers(res.data))
      .finally(() => setLoading(false))
  }, [])

  if (loading) return <Text>Loading...</Text>

  return (
    <FlatList
      data={users}
      keyExtractor={(u) => String(u.id)}
      renderItem={({ item }) => <Text>{item.name}</Text>}
    />
  )
}
```

## React Native + React Hooks

While api-flow ships React hooks via `api-flow/hooks`, they work in React Native since they only use `useState`, `useEffect`, and `useRef`:

```tsx
import { useGet } from 'api-flow/hooks'
import { api } from './api'

function ProductList() {
  const { data, loading, error } = useGet<Product[]>(api, '/products')
  // ...
}
```

## File Upload in React Native

```typescript
import * as ImagePicker from 'expo-image-picker'

const result = await ImagePicker.launchImageLibraryAsync()
if (!result.canceled) {
  const formData = new FormData()
  formData.append('avatar', {
    uri: result.assets[0].uri,
    name: 'avatar.jpg',
    type: 'image/jpeg',
  } as any)

  await api.upload('/users/avatar', formData, {
    onProgress: (percent) => console.log(`${percent}%`),
  })
}
```
