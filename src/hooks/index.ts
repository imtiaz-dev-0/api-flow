/**
 * React Hooks for api-flow
 *
 * Import from 'api-flow/hooks' to ensure hooks are tree-shaken from non-React bundles.
 *
 * @example
 * import { useGet, useMutation, usePost } from 'api-flow/hooks'
 */

export { useGet } from './useGet.ts'
export { useMutation, usePost } from './useMutation.ts'

export type { UseGetResult, UseGetState } from './useGet.ts'
export type { UseMutationResult, UseMutationState } from './useMutation.ts'
