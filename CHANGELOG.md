# api-flow

## 1.1.0

### Minor Changes

- feat: add `head()` and `options()` HTTP methods to `ApiClient`
- feat: add `usePut`, `usePatch`, `useDelete` convenience React hooks
- feat: add `invalidateCachePattern(pattern: RegExp)` method for bulk cache invalidation by URL pattern
- feat: expose `cancelAll()` and `clearCache(url?)` on `ApiClientInterface`
- fix: correct `bugs.url` in package.json to point to the right GitHub issues page

## 1.0.1

### Patch Changes

- docs: update package name to api-flow-client in documentation and README

## 1.0.0

### Major Changes

- Initial release — production-ready API client for JS/TS with auth, caching, retry, React hooks, plugins, and offline support
