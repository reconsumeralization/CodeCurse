import { createNode, updateNode } from './proxy'
import type { Node } from './tracking'

import {
  createCacheKeyComparator,
  defaultEqualityCheck
} from '@internal/defaultMemoize'
import type { AnyFunction } from '@internal/types'
import { createCache } from './autotracking'

/**
 * Uses an "auto-tracking" approach inspired by the work of the Ember Glimmer team.
 * It uses a Proxy to wrap arguments and track accesses to nested fields
 * in your selector on first read. Later, when the selector is called with
 * new arguments, it identifies which accessed fields have changed and
 * only recalculates the result if one or more of those accessed fields have changed.
 * This allows it to be more precise than the shallow equality checks in `defaultMemoize`.
 *
 * __Design Tradeoffs for `autotrackMemoize`:__
 * - Pros:
 *    - It is likely to avoid excess calculations and recalculate fewer times than `defaultMemoize` will,
 *    which may also result in fewer component re-renders.
 * - Cons:
 *    - It only has a cache size of 1.
 *    - It is slower than `defaultMemoize`, because it has to do more work. (How much slower is dependent on the number of accessed fields in a selector, number of calls, frequency of input changes, etc)
 *    - It can have some unexpected behavior. Because it tracks nested field accesses,
 *    cases where you don't access a field will not recalculate properly.
 *    For example, a badly-written selector like:
 *      ```ts
 *      createSelector([state => state.todos], todos => todos)
 *      ```
 *      that just immediately returns the extracted value will never update, because it doesn't see any field accesses to check.
 *
 * __Use Cases for `autotrackMemoize`:__
 * - It is likely best used for cases where you need to access specific nested fields
 * in data, and avoid recalculating if other fields in the same data objects are immutably updated.
 *
 * @param func - The function to be memoized.
 * @returns A memoized function with a `.clearCache()` method attached.
 *
 * @example
 * <caption>Using `createSelector`</caption>
 * ```ts
 * import { unstable_autotrackMemoize as autotrackMemoize, createSelector } from 'reselect'
 *
 * const selectTodoIds = createSelector(
 *   [(state: RootState) => state.todos],
 *   (todos) => todos.map(todo => todo.id),
 *   { memoize: autotrackMemoize }
 * )
 * ```
 *
 * @example
 * <caption>Using `createSelectorCreator`</caption>
 * ```ts
 * import { unstable_autotrackMemoize as autotrackMemoize, createSelectorCreator } from 'reselect'
 *
 * const createSelectorAutotrack = createSelectorCreator(autotrackMemoize)
 *
 * const selectTodoIds = createSelectorAutotrack(
 *   [(state: RootState) => state.todos],
 *   (todos) => todos.map(todo => todo.id)
 * )
 * ```
 *
 * @template Func - The type of the function that is memoized.
 *
 * @since 5.0.0
 * @public
 * @experimental
 */
export function autotrackMemoize<Func extends AnyFunction>(func: Func) {
  // we reference arguments instead of spreading them for performance reasons

  const node: Node<Record<string, unknown>> = createNode(
    [] as unknown as Record<string, unknown>
  )

  let lastArgs: IArguments | null = null

  const shallowEqual = createCacheKeyComparator(defaultEqualityCheck)

  const cache = createCache(() => {
    const res = func.apply(null, node.proxy as unknown as any[])
    return res
  })

  function memoized() {
    if (!shallowEqual(lastArgs, arguments)) {
      updateNode(node, arguments as unknown as Record<string, unknown>)
      lastArgs = arguments
    }
    return cache.value
  }

  memoized.clearCache = () => cache.clear()

  return memoized as Func & { clearCache: () => void }
}
