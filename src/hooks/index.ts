/**
 * React Hooks for api-flow
 *
 * Import from 'api-flow-client/hooks' to ensure hooks are tree-shaken from non-React bundles.
 *
 * @example
 * import { useGet, useMutation, usePost, usePut, usePatch, useDelete } from 'api-flow-client/hooks'
 */

export { useGet } from './useGet.ts'
export { useMutation, usePost, usePut, usePatch, useDelete } from './useMutation.ts'

export type { UseGetResult, UseGetState } from './useGet.ts'
export type { UseMutationResult, UseMutationState } from './useMutation.ts'
