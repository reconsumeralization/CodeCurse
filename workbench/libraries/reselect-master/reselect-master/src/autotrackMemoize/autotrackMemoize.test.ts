import { autotrackMemoize } from './autotrackMemoize';

describe('autotrackMemoize', () => {
  test('returns a new function that behaves the same as the original function', () => {
    const func = jest.fn((x: number) => x * 2);
    const memoizedFunc = autotrackMemoize(func);

    expect(memoizedFunc(2)).toBe(4);
    expect(func).toBeCalledTimes(1);
  });

  test('caches the result of the original function when called with the same arguments', () => {
    const func = jest.fn((x: number) => x * 2);
    const memoizedFunc = autotrackMemoize(func);

    expect(memoizedFunc(2)).toBe(4);
    expect(memoizedFunc(2)).toBe(4);
    expect(func).toBeCalledTimes(1);
  });

  test('executes the original function again when called with different arguments', () => {
    const func = jest.fn((x: number) => x * 2);
    const memoizedFunc = autotrackMemoize(func);

    expect(memoizedFunc(2)).toBe(4);
    expect(memoizedFunc(3)).toBe(6);
    expect(func).toBeCalledTimes(2);
  });

  test('clearCache method clears the cache', () => {
+    const func = jest.fn((x: number) => x * 2);
+    const memoizedFunc = autotrackMemoize(func);
+
+    expect(memoizedFunc(2)).toBe(4);
+    memoizedFunc.clearCache();
+    expect(memoizedFunc(2)).toBe(4);
+    expect(func).toBeCalledTimes(2);
+  });
});
