// TODO: Add test for React Redux connect function

import lodashMemoize from 'lodash/memoize'
import microMemoize from 'micro-memoize'
import {
  createSelector,
  createSelectorCreator,
  defaultMemoize,
  unstable_autotrackMemoize as autotrackMemoize,
  weakMapMemoize
} from 'reselect'

import type { OutputSelector, OutputSelectorFields } from 'reselect'
import type { LocalTestContext, RootState } from './testUtils'
import { addTodo, deepClone, setupStore, toggleCompleted } from './testUtils'

// Construct 1E6 states for perf test outside of the perf test so as to not change the execute time of the test function
const numOfStates = 1000000
interface StateA {
  a: number
}

interface StateAB {
  a: number
  b: number
}

interface StateSub {
  sub: {
    a: number
  }
}

const states: StateAB[] = []

for (let i = 0; i < numOfStates; i++) {
  states.push({ a: 1, b: 2 })
}

describe('Basic selector behavior', () => {
  test('basic selector', () => {
    const selector = createSelector(
      (state: StateA) => state.a,
      a => a
    )
    const firstState = { a: 1 }
    const firstStateNewPointer = { a: 1 }
    const secondState = { a: 2 }

    expect(selector(firstState)).toBe(1)
    expect(selector(firstState)).toBe(1)
    expect(selector.recomputations()).toBe(1)
    expect(selector(firstStateNewPointer)).toBe(1)
    expect(selector.recomputations()).toBe(1)
    expect(selector(secondState)).toBe(2)
    expect(selector.recomputations()).toBe(2)
  })

  test("don't pass extra parameters to inputSelector when only called with the state", () => {
    const selector = createSelector(
      (...params: any[]) => params.length,
      a => a
    )
    expect(selector({})).toBe(1)
  })

  test('basic selector multiple keys', () => {
    const selector = createSelector(
      (state: StateAB) => state.a,
      (state: StateAB) => state.b,
      (a, b) => a + b
    )
    const state1 = { a: 1, b: 2 }
    expect(selector(state1)).toBe(3)
    expect(selector(state1)).toBe(3)
    expect(selector.recomputations()).toBe(1)
    const state2 = { a: 3, b: 2 }
    expect(selector(state2)).toBe(5)
    expect(selector(state2)).toBe(5)
    expect(selector.recomputations()).toBe(2)
  })

  test('basic selector invalid input selector', () => {
    expect(() =>
      createSelector(
        // @ts-ignore
        (state: StateAB) => state.a,
        function input2(state: StateAB) {
          return state.b
        },
        'not a function',
        (a: any, b: any) => a + b
      )
    ).toThrow(
      'createSelector expects all input-selectors to be functions, but received the following types: [function unnamed(), function input2(), string]'
    )

    expect(() =>
      // @ts-ignore
      createSelector((state: StateAB) => state.a, 'not a function')
    ).toThrow(
      'createSelector expects an output function after the inputs, but received: [string]'
    )
  })

  describe('performance checks', () => {
    const originalEnv = process.env.NODE_ENV

    beforeAll(() => {
      process.env.NODE_ENV = 'production'
    })
    afterAll(() => {
      process.env.NODE_ENV = originalEnv
    })

    test('basic selector cache hit performance', () => {
      if (process.env.COVERAGE) {
        return // don't run performance tests for coverage
      }

      const selector = createSelector(
        (state: StateAB) => state.a,
        (state: StateAB) => state.b,
        (a, b) => a + b
      )
      const state1 = { a: 1, b: 2 }

      const start = performance.now()
      for (let i = 0; i < 1000000; i++) {
        selector(state1)
      }
      const totalTime = performance.now() - start

      expect(selector(state1)).toBe(3)
      expect(selector.recomputations()).toBe(1)
      // Expected a million calls to a selector with the same arguments to take less than 1 second
      expect(totalTime).toBeLessThan(1000)
    })

    test('basic selector cache hit performance for state changes but shallowly equal selector args', () => {
      if (process.env.COVERAGE) {
        return // don't run performance tests for coverage
      }

      const selector = createSelector(
        (state: StateAB) => state.a,
        (state: StateAB) => state.b,
        (a, b) => a + b
      )

      const start = new Date()
      for (let i = 0; i < numOfStates; i++) {
        selector(states[i])
      }
      const totalTime = new Date().getTime() - start.getTime()

      expect(selector(states[0])).toBe(3)
      expect(selector.recomputations()).toBe(1)

      // Expected a million calls to a selector with the same arguments to take less than 1 second
      expect(totalTime).toBeLessThan(1000)
    })
  })
  test('memoized composite arguments', () => {
    const selector = createSelector(
      (state: StateSub) => state.sub,
      sub => sub
    )
    const state1 = { sub: { a: 1 } }
    expect(selector(state1)).toEqual({ a: 1 })
    expect(selector(state1)).toEqual({ a: 1 })
    expect(selector.recomputations()).toBe(1)
    const state2 = { sub: { a: 2 } }
    expect(selector(state2)).toEqual({ a: 2 })
    expect(selector.recomputations()).toBe(2)
  })

  test('first argument can be an array', () => {
    const selector = createSelector(
      [state => state.a, state => state.b],
      (a, b) => {
        return a + b
      }
    )
    expect(selector({ a: 1, b: 2 })).toBe(3)
    expect(selector({ a: 1, b: 2 })).toBe(3)
    expect(selector.recomputations()).toBe(1)
    expect(selector({ a: 3, b: 2 })).toBe(5)
    expect(selector.recomputations()).toBe(2)
  })

  test('can accept props', () => {
    let called = 0
    const selector = createSelector(
      (state: StateAB) => state.a,
      (state: StateAB) => state.b,
      (state: StateAB, props: { c: number }) => props.c,
      (a, b, c) => {
        called++
        return a + b + c
      }
    )
    expect(selector({ a: 1, b: 2 }, { c: 100 })).toBe(103)
  })

  test('recomputes result after exception', () => {
    let called = 0
    const selector = createSelector(
      (state: StateA) => state.a,
      () => {
        called++
        throw Error('test error')
      }
    )
    expect(() => selector({ a: 1 })).toThrow('test error')
    expect(() => selector({ a: 1 })).toThrow('test error')
    expect(called).toBe(2)
  })

  test('memoizes previous result before exception', () => {
    let called = 0
    const selector = createSelector(
      (state: StateA) => state.a,
      a => {
        called++
        if (a > 1) throw Error('test error')
        return a
      }
    )
    const state1 = { a: 1 }
    const state2 = { a: 2 }
    expect(selector(state1)).toBe(1)
    expect(() => selector(state2)).toThrow('test error')
    expect(selector(state1)).toBe(1)
    expect(called).toBe(2)
  })
})

describe('Combining selectors', () => {
  test('chained selector', () => {
    const selector1 = createSelector(
      (state: StateSub) => state.sub,
      sub => sub
    )
    const selector2 = createSelector(selector1, sub => sub.a)
    const state1 = { sub: { a: 1 } }
    expect(selector2(state1)).toBe(1)
    expect(selector2(state1)).toBe(1)
    expect(selector2.recomputations()).toBe(1)
    const state2 = { sub: { a: 2 } }
    expect(selector2(state2)).toBe(2)
    expect(selector2.recomputations()).toBe(2)
  })

  test('chained selector with props', () => {
    const selector1 = createSelector(
      (state: StateSub) => state.sub,
      (state: StateSub, props: { x: number; y: number }) => props.x,
      (sub, x) => ({ sub, x })
    )
    const selector2 = createSelector(
      selector1,
      (state: StateSub, props: { x: number; y: number }) => props.y,
      (param, y) => param.sub.a + param.x + y
    )
    const state1 = { sub: { a: 1 } }
    expect(selector2(state1, { x: 100, y: 200 })).toBe(301)
    expect(selector2(state1, { x: 100, y: 200 })).toBe(301)
    expect(selector2.recomputations()).toBe(1)
    const state2 = { sub: { a: 2 } }
    expect(selector2(state2, { x: 100, y: 201 })).toBe(303)
    expect(selector2.recomputations()).toBe(2)
  })

  test('chained selector with variadic args', () => {
    const selector1 = createSelector(
      (state: StateSub) => state.sub,
      (state: StateSub, props: { x: number; y: number }, another: number) =>
        props.x + another,
      (sub, x) => ({ sub, x })
    )
    const selector2 = createSelector(
      selector1,
      (state: StateSub, props: { x: number; y: number }) => props.y,
      (param, y) => param.sub.a + param.x + y
    )
    const state1 = { sub: { a: 1 } }
    expect(selector2(state1, { x: 100, y: 200 }, 100)).toBe(401)
    expect(selector2(state1, { x: 100, y: 200 }, 100)).toBe(401)
    expect(selector2.recomputations()).toBe(1)
    const state2 = { sub: { a: 2 } }
    expect(selector2(state2, { x: 100, y: 201 }, 200)).toBe(503)
    expect(selector2.recomputations()).toBe(2)
  })

  test('override valueEquals', () => {
    // a rather absurd equals operation we can verify in tests
    const createOverridenSelector = createSelectorCreator(
      defaultMemoize,
      (a, b) => typeof a === typeof b
    )
    const selector = createOverridenSelector(
      (state: StateA) => state.a,
      a => a
    )
    expect(selector({ a: 1 })).toBe(1)
    expect(selector({ a: 2 })).toBe(1) // yes, really true
    expect(selector.recomputations()).toBe(1)
    // @ts-expect-error
    expect(selector({ a: 'A' })).toBe('A')
    expect(selector.recomputations()).toBe(2)
  })
})

describe('Customizing selectors', () => {
  test('custom memoize', () => {
    const hashFn = (...args: any[]) =>
      args.reduce((acc, val) => acc + '-' + JSON.stringify(val))
    const customSelectorCreator = createSelectorCreator(lodashMemoize, hashFn)
    const selector = customSelectorCreator(
      (state: StateAB) => state.a,
      (state: StateAB) => state.b,
      (a, b) => a + b
    )
    expect(selector({ a: 1, b: 2 })).toBe(3)
    expect(selector({ a: 1, b: 2 })).toBe(3)
    expect(selector.recomputations()).toBe(1)
    expect(selector({ a: 1, b: 3 })).toBe(4)
    expect(selector.recomputations()).toBe(2)
    expect(selector({ a: 1, b: 3 })).toBe(4)
    expect(selector.recomputations()).toBe(2)
    expect(selector({ a: 2, b: 3 })).toBe(5)
    expect(selector.recomputations()).toBe(3)
    // TODO: Check correct memoize function was called
  })

  test('createSelector accepts direct memoizer arguments', () => {
    let memoizer1Calls = 0
    let memoizer2Calls = 0
    let memoizer3Calls = 0

    const defaultMemoizeAcceptsFirstArgDirectly = createSelector(
      (state: StateAB) => state.a,
      (state: StateAB) => state.b,
      (a, b) => a + b,
      {
        memoizeOptions: (a, b) => {
          memoizer1Calls++
          return a === b
        }
      }
    )

    defaultMemoizeAcceptsFirstArgDirectly({ a: 1, b: 2 })
    defaultMemoizeAcceptsFirstArgDirectly({ a: 1, b: 3 })

    expect(memoizer1Calls).toBeGreaterThan(0)

    const defaultMemoizeAcceptsArgsAsArray = createSelector(
      (state: StateAB) => state.a,
      (state: StateAB) => state.b,
      (a, b) => a + b,
      {
        memoizeOptions: [
          (a, b) => {
            memoizer2Calls++
            return a === b
          }
        ]
      }
    )

    defaultMemoizeAcceptsArgsAsArray({ a: 1, b: 2 })
    defaultMemoizeAcceptsArgsAsArray({ a: 1, b: 3 })

    expect(memoizer2Calls).toBeGreaterThan(0)

    const createSelectorWithSeparateArg = createSelectorCreator(
      defaultMemoize,
      (a, b) => {
        memoizer3Calls++
        return a === b
      }
    )

    const defaultMemoizeAcceptsArgFromCSC = createSelectorWithSeparateArg(
      (state: StateAB) => state.a,
      (state: StateAB) => state.b,
      (a, b) => a + b
    )

    defaultMemoizeAcceptsArgFromCSC({ a: 1, b: 2 })
    defaultMemoizeAcceptsArgFromCSC({ a: 1, b: 3 })

    expect(memoizer3Calls).toBeGreaterThan(0)
  })

  test.todo('Test order of execution in a selector', () => {
    interface State {
      todos: {
        id: number
        completed: boolean
      }[]
    }
    const state: State = {
      todos: [
        { id: 0, completed: false },
        { id: 1, completed: false }
      ]
    }
    // original options untouched.
    const selectorOriginal = createSelector(
      (state: State) => state.todos,
      todos => todos.map(({ id }) => id),
      {
        inputStabilityCheck: 'always',
        memoizeOptions: {
          equalityCheck: (a, b) => false,
          resultEqualityCheck: (a, b) => false
        }
      }
    )
    selectorOriginal(deepClone(state))
    selectorOriginal(deepClone(state))
    const selectorDefaultParametric = createSelector(
      [(state: State, id: number) => id, (state: State) => state.todos],
      (id, todos) => todos.filter(todo => todo.id === id)
    )
    selectorDefaultParametric(state, 1)
    selectorDefaultParametric(state, 1)
  })
})

describe<LocalTestContext>('argsMemoize and memoize', localTest => {
  beforeEach<LocalTestContext>(context => {
    const store = setupStore()
    context.store = store
    context.state = store.getState()
  })

  localTest('passing memoize directly to createSelector', ({ store }) => {
    const state = store.getState()
    const selectorDefault = createSelector(
      (state: RootState) => state.todos,
      todos => todos.map(({ id }) => id),
      { memoize: defaultMemoize }
    )
    const selectorDefaultParametric = createSelector(
      [(state: RootState, id: number) => id, (state: RootState) => state.todos],
      (id, todos) => todos.filter(todo => todo.id === id),
      { memoize: defaultMemoize }
    )
    selectorDefaultParametric(state, 0)
    selectorDefaultParametric(state, 1)
    selectorDefaultParametric(state, 1)
    selectorDefaultParametric(deepClone(state), 1)
    selectorDefaultParametric(deepClone(state), 0)
    selectorDefaultParametric(deepClone(state), 0)

    const selectorAutotrack = createSelector(
      (state: RootState) => state.todos,
      todos => todos.map(({ id }) => id),
      { memoize: autotrackMemoize }
    )
    const outPutSelectorFields: (keyof OutputSelectorFields)[] = [
      'memoize',
      'argsMemoize',
      'resultFunc',
      'memoizedResultFunc',
      'lastResult',
      'dependencies',
      'recomputations',
      'resetRecomputations'
    ]
    const memoizerFields: Exclude<
      keyof OutputSelector,
      keyof OutputSelectorFields
    >[] = ['clearCache']
    const allFields: (keyof OutputSelector)[] = [
      ...outPutSelectorFields,
      ...memoizerFields
    ]
    const hasUndefinedValues = (object: object) => {
      return Object.values(object).some(e => e == null)
    }
    const isMemoizedSelector = (selector: object) => {
      return (
        typeof selector === 'function' &&
        'resultFunc' in selector &&
        'memoizedResultFunc' in selector &&
        'lastResult' in selector &&
        'dependencies' in selector &&
        'recomputations' in selector &&
        'resetRecomputations' in selector &&
        'memoize' in selector &&
        'argsMemoize' in selector &&
        typeof selector.resultFunc === 'function' &&
        typeof selector.memoizedResultFunc === 'function' &&
        typeof selector.lastResult === 'function' &&
        Array.isArray(selector.dependencies) &&
        typeof selector.recomputations === 'function' &&
        typeof selector.resetRecomputations === 'function' &&
        typeof selector.memoize === 'function' &&
        typeof selector.argsMemoize === 'function' &&
        selector.dependencies.length >= 1 &&
        selector.dependencies.every(
          (dependency): dependency is Function =>
            typeof dependency === 'function'
        ) &&
        !selector.lastResult.length &&
        !selector.recomputations.length &&
        !selector.resetRecomputations.length &&
        typeof selector.recomputations() === 'number'
      )
    }
    const isArrayOfFunctions = (array: any[]) =>
      array.every(e => typeof e === 'function')
    expect(selectorDefault).toSatisfy(isMemoizedSelector)
    expect(selectorDefault)
      .to.be.a('function')
      .that.has.all.keys(allFields)
      .and.satisfies(isMemoizedSelector)
      .and.has.own.property('clearCache')
      .that.is.a('function')
      .with.lengthOf(0)
    expect(selectorAutotrack).to.be.a('function').that.has.all.keys(allFields)
    expect(selectorDefault.resultFunc).to.be.a('function')
    expect(selectorDefault.memoizedResultFunc).to.be.a('function')
    expect(selectorDefault.lastResult).to.be.a('function')
    expect(selectorDefault.dependencies).to.be.an('array').that.is.not.empty
    expect(selectorDefault.recomputations).to.be.a('function')
    expect(selectorDefault.resetRecomputations).to.be.a('function')
    expect(selectorDefault.memoize).to.be.a('function')
    expect(selectorDefault.argsMemoize).to.be.a('function')
    expect(selectorDefault.clearCache).to.be.a('function')
    expect(selectorDefault.lastResult()).toBeUndefined()
    expect(selectorAutotrack.lastResult()).toBeUndefined()
    expect(selectorDefault.recomputations()).toBe(0)
    expect(selectorAutotrack.recomputations()).toBe(0)
    expect(selectorDefault(state)).toStrictEqual(selectorAutotrack(state))
    expect(selectorDefault.recomputations()).toBe(1)
    expect(selectorAutotrack.recomputations()).toBe(1)
    // flipping completed flag does not cause the autotrack memoizer to re-run.
    store.dispatch(toggleCompleted(0))
    selectorDefault(store.getState())
    selectorAutotrack(store.getState())
    const defaultSelectorLastResult1 = selectorDefault.lastResult()
    const autotrackSelectorLastResult1 = selectorAutotrack.lastResult()
    store.dispatch(toggleCompleted(0))
    selectorDefault(store.getState())
    selectorAutotrack(store.getState())
    const defaultSelectorLastResult2 = selectorDefault.lastResult()
    const autotrackSelectorLastResult2 = selectorAutotrack.lastResult()
    expect(selectorDefault.recomputations()).toBe(3)
    expect(selectorAutotrack.recomputations()).toBe(1)
    for (let i = 0; i < 10; i++) {
      store.dispatch(toggleCompleted(0))
      selectorDefault(store.getState())
      selectorAutotrack(store.getState())
    }
    expect(selectorDefault.recomputations()).toBe(13)
    expect(selectorAutotrack.recomputations()).toBe(1)
    expect(autotrackSelectorLastResult1).toBe(autotrackSelectorLastResult2)
    expect(defaultSelectorLastResult1).not.toBe(defaultSelectorLastResult2) // Default memoize does not preserve referential equality but autotrack does.
    expect(defaultSelectorLastResult1).toStrictEqual(defaultSelectorLastResult2)
    store.dispatch(
      addTodo({
        title: 'Figure out if plants are really plotting world domination.',
        description: 'They may be.'
      })
    )
    selectorAutotrack(store.getState())
    expect(selectorAutotrack.recomputations()).toBe(2)
  })

  localTest('passing argsMemoize directly to createSelector', ({ store }) => {
    const otherCreateSelector = createSelectorCreator({
      memoize: microMemoize,
      argsMemoize: microMemoize
    })
    const selectorDefault = otherCreateSelector(
      [(state: RootState) => state.todos],
      todos => todos.map(({ id }) => id),
      { memoize: defaultMemoize, argsMemoize: defaultMemoize }
    )
    const selectorAutotrack = createSelector(
      [(state: RootState) => state.todos],
      todos => todos.map(({ id }) => id),
      { memoize: autotrackMemoize }
    )
    expect(selectorDefault(store.getState())).toStrictEqual(
      selectorAutotrack(store.getState())
    )
    expect(selectorDefault.recomputations()).toBe(1)
    expect(selectorAutotrack.recomputations()).toBe(1)
    selectorDefault(store.getState())
    selectorAutotrack(store.getState())
    // toggling the completed flag should force the default memoizer to recalculate but not autotrack.
    store.dispatch(toggleCompleted(0))
    selectorDefault(store.getState())
    selectorAutotrack(store.getState())
    store.dispatch(toggleCompleted(1))
    selectorDefault(store.getState())
    selectorAutotrack(store.getState())
    store.dispatch(toggleCompleted(2))
    selectorAutotrack(store.getState())
    selectorAutotrack(store.getState())
    selectorAutotrack(store.getState())
    selectorDefault(store.getState())
    selectorDefault(store.getState())
    selectorDefault(store.getState())
    store.dispatch(toggleCompleted(2))
    expect(selectorDefault.recomputations()).toBe(4)
    expect(selectorAutotrack.recomputations()).toBe(1)
    selectorDefault(store.getState())
    selectorAutotrack(store.getState())
    store.dispatch(toggleCompleted(0))
    const defaultSelectorLastResult1 = selectorDefault.lastResult()
    selectorDefault(store.getState())
    store.dispatch(toggleCompleted(0))
    const defaultSelectorLastResult2 = selectorDefault.lastResult()
    selectorAutotrack(store.getState())
    store.dispatch(toggleCompleted(0))
    const autotrackSelectorLastResult1 = selectorAutotrack.lastResult()
    selectorAutotrack(store.getState())
    store.dispatch(toggleCompleted(0))
    const autotrackSelectorLastResult2 = selectorAutotrack.lastResult()
    expect(selectorDefault.recomputations()).toBe(6)
    expect(selectorAutotrack.recomputations()).toBe(1)
    expect(autotrackSelectorLastResult1).toBe(autotrackSelectorLastResult2)
    expect(defaultSelectorLastResult1).not.toBe(defaultSelectorLastResult2)
    expect(defaultSelectorLastResult1).toStrictEqual(defaultSelectorLastResult2)
    for (let i = 0; i < 10; i++) {
      store.dispatch(toggleCompleted(0))
      selectorAutotrack(store.getState())
    }
    for (let i = 0; i < 10; i++) {
      store.dispatch(toggleCompleted(0))
      selectorDefault(store.getState())
    }
    expect(selectorAutotrack.recomputations()).toBe(1)
    expect(selectorDefault.recomputations()).toBe(16)
    // original options untouched.
    const selectorOriginal = createSelector(
      [(state: RootState) => state.todos],
      todos => todos.map(({ id }) => id)
    )
    selectorOriginal(store.getState())
    const start = performance.now()
    for (let i = 0; i < 1_000_000_0; i++) {
      selectorOriginal(store.getState())
    }
    const totalTime = performance.now() - start
    expect(totalTime).toBeLessThan(1000)
    selectorOriginal(store.getState())
    // Override `argsMemoize` with `autotrackMemoize`
    const selectorOverrideArgsMemoize = createSelector(
      [(state: RootState) => state.todos],
      todos => todos.map(({ id }) => id),
      {
        memoize: defaultMemoize,
        // WARNING!! This is just for testing purposes, do not use `autotrackMemoize` to memoize the arguments,
        // it can return false positives, since it's not tracking a nested field.
        argsMemoize: autotrackMemoize
      }
    )
    selectorOverrideArgsMemoize(store.getState())
    for (let i = 0; i < 10; i++) {
      store.dispatch(toggleCompleted(0))
      selectorOverrideArgsMemoize(store.getState())
      selectorOriginal(store.getState())
    }
    expect(selectorOverrideArgsMemoize.recomputations()).toBe(1)
    expect(selectorOriginal.recomputations()).toBe(11)
    const selectorDefaultParametric = createSelector(
      [(state: RootState, id: number) => id, (state: RootState) => state.todos],
      (id, todos) => todos.filter(todo => todo.id === id)
    )
    selectorDefaultParametric(store.getState(), 1)
    selectorDefaultParametric(store.getState(), 1)
    expect(selectorDefaultParametric.recomputations()).toBe(1)
    selectorDefaultParametric(store.getState(), 2)
    selectorDefaultParametric(store.getState(), 1)
    expect(selectorDefaultParametric.recomputations()).toBe(3)
    selectorDefaultParametric(store.getState(), 2)
    expect(selectorDefaultParametric.recomputations()).toBe(4)
    const selectorDefaultParametricArgsWeakMap = createSelector(
      [(state: RootState, id: number) => id, (state: RootState) => state.todos],
      (id, todos) => todos.filter(todo => todo.id === id),
      { argsMemoize: weakMapMemoize }
    )
    const selectorDefaultParametricWeakMap = createSelector(
      [(state: RootState, id: number) => id, (state: RootState) => state.todos],
      (id, todos) => todos.filter(todo => todo.id === id),
      { memoize: weakMapMemoize }
    )
    selectorDefaultParametricArgsWeakMap(store.getState(), 1)
    selectorDefaultParametricArgsWeakMap(store.getState(), 1)
    expect(selectorDefaultParametricArgsWeakMap.recomputations()).toBe(1)
    selectorDefaultParametricArgsWeakMap(store.getState(), 2)
    selectorDefaultParametricArgsWeakMap(store.getState(), 1)
    expect(selectorDefaultParametricArgsWeakMap.recomputations()).toBe(2)
    selectorDefaultParametricArgsWeakMap(store.getState(), 2)
    // If we call the selector with 1, then 2, then 1 and back to 2 again,
    // `defaultMemoize` will recompute a total of 4 times,
    // but weakMapMemoize will recompute only twice.
    expect(selectorDefaultParametricArgsWeakMap.recomputations()).toBe(2)
    for (let i = 0; i < 10; i++) {
      selectorDefaultParametricArgsWeakMap(store.getState(), 1)
      selectorDefaultParametricArgsWeakMap(store.getState(), 2)
      selectorDefaultParametricArgsWeakMap(store.getState(), 3)
      selectorDefaultParametricArgsWeakMap(store.getState(), 4)
      selectorDefaultParametricArgsWeakMap(store.getState(), 5)
    }
    expect(selectorDefaultParametricArgsWeakMap.recomputations()).toBe(5)
    for (let i = 0; i < 10; i++) {
      selectorDefaultParametric(store.getState(), 1)
      selectorDefaultParametric(store.getState(), 2)
      selectorDefaultParametric(store.getState(), 3)
      selectorDefaultParametric(store.getState(), 4)
      selectorDefaultParametric(store.getState(), 5)
    }
    expect(selectorDefaultParametric.recomputations()).toBe(54)
    for (let i = 0; i < 10; i++) {
      selectorDefaultParametricWeakMap(store.getState(), 1)
      selectorDefaultParametricWeakMap(store.getState(), 2)
      selectorDefaultParametricWeakMap(store.getState(), 3)
      selectorDefaultParametricWeakMap(store.getState(), 4)
      selectorDefaultParametricWeakMap(store.getState(), 5)
    }
    expect(selectorDefaultParametricWeakMap.recomputations()).toBe(5)
  })

  localTest('passing argsMemoize to createSelectorCreator', ({ store }) => {
    const state = store.getState()
    const createSelectorMicroMemoize = createSelectorCreator({
      memoize: microMemoize,
      memoizeOptions: { isEqual: (a, b) => a === b },
      argsMemoize: microMemoize,
      argsMemoizeOptions: { isEqual: (a, b) => a === b }
    })
    const selectorMicroMemoize = createSelectorMicroMemoize(
      (state: RootState) => state.todos,
      todos => todos.map(({ id }) => id)
    )
    expect(selectorMicroMemoize(state)).to.be.an('array').that.is.not.empty
    // Checking existence of fields related to `argsMemoize`
    expect(selectorMicroMemoize.cache).to.be.an('object')
    expect(selectorMicroMemoize.fn).to.be.a('function')
    expect(selectorMicroMemoize.isMemoized).to.be.true
    expect(selectorMicroMemoize.options).to.be.an('object')
    // @ts-expect-error
    expect(selectorMicroMemoize.clearCache).toBeUndefined()
    expect(selectorMicroMemoize.memoizedResultFunc).to.be.a('function')
    // Checking existence of fields related to `memoize`
    expect(selectorMicroMemoize.memoizedResultFunc.cache).to.be.an('object')
    expect(selectorMicroMemoize.memoizedResultFunc.fn).to.be.a('function')
    expect(selectorMicroMemoize.memoizedResultFunc.isMemoized).to.be.true
    expect(selectorMicroMemoize.memoizedResultFunc.options).to.be.an('object')
    // @ts-expect-error
    expect(selectorMicroMemoize.memoizedResultFunc.clearCache).toBeUndefined()
    // Checking existence of fields related to the actual memoized selector
    expect(selectorMicroMemoize.dependencies).to.be.an('array').that.is.not
      .empty
    expect(selectorMicroMemoize.lastResult()).to.be.an('array').that.is.not
      .empty
    expect(
      selectorMicroMemoize.memoizedResultFunc([
        {
          id: 0,
          completed: true,
          title: 'Practice telekinesis for 15 minutes',
          description: 'Just do it'
        }
      ])
    ).to.be.an('array').that.is.not.empty
    expect(selectorMicroMemoize.recomputations()).to.be.a('number')
    expect(selectorMicroMemoize.resetRecomputations()).toBe(0)
    expect(selectorMicroMemoize.resultFunc).to.be.a('function')
    expect(
      selectorMicroMemoize.resultFunc([
        {
          id: 0,
          completed: true,
          title: 'Practice telekinesis for 15 minutes',
          description: 'Just do it'
        }
      ])
    ).to.be.an('array').that.is.not.empty

    const selectorMicroMemoizeOverridden = createSelectorMicroMemoize(
      [(state: RootState) => state.todos],
      todos => todos.map(({ id }) => id),
      { memoize: defaultMemoize, argsMemoize: defaultMemoize }
    )
    expect(selectorMicroMemoizeOverridden(state)).to.be.an('array').that.is.not
      .empty
    // Checking existence of fields related to `argsMemoize`
    expect(selectorMicroMemoizeOverridden.clearCache).to.be.a('function')
    // @ts-expect-error
    expect(selectorMicroMemoizeOverridden.cache).toBeUndefined()
    // @ts-expect-error
    expect(selectorMicroMemoizeOverridden.fn).toBeUndefined()
    // @ts-expect-error
    expect(selectorMicroMemoizeOverridden.isMemoized).toBeUndefined()
    // @ts-expect-error
    expect(selectorMicroMemoizeOverridden.options).toBeUndefined()
    // Checking existence of fields related to `memoize`
    expect(
      selectorMicroMemoizeOverridden.memoizedResultFunc.clearCache
    ).to.be.a('function')
    expect(
      // @ts-expect-error
      selectorMicroMemoizeOverridden.memoizedResultFunc.cache
    ).toBeUndefined()
    // @ts-expect-error
    expect(selectorMicroMemoizeOverridden.memoizedResultFunc.fn).toBeUndefined()
    expect(
      // @ts-expect-error
      selectorMicroMemoizeOverridden.memoizedResultFunc.isMemoized
    ).toBeUndefined()
    expect(
      // @ts-expect-error
      selectorMicroMemoizeOverridden.memoizedResultFunc.options
    ).toBeUndefined()
    // Checking existence of fields related to the actual memoized selector
    expect(selectorMicroMemoizeOverridden.dependencies).to.be.an('array').that
      .is.not.empty
    expect(selectorMicroMemoizeOverridden.lastResult()).to.be.an('array').that
      .is.not.empty
    expect(
      selectorMicroMemoizeOverridden.memoizedResultFunc([
        {
          id: 0,
          completed: true,
          title: 'Practice telekinesis for 15 minutes',
          description: 'Just do it'
        }
      ])
    ).to.be.an('array').that.is.not.empty
    expect(selectorMicroMemoizeOverridden.recomputations()).to.be.a('number')
    expect(selectorMicroMemoizeOverridden.resetRecomputations()).toBe(0)
    expect(
      selectorMicroMemoizeOverridden.resultFunc([
        {
          id: 0,
          completed: true,
          title: 'Practice telekinesis for 15 minutes',
          description: 'Just do it'
        }
      ])
    ).to.be.an('array').that.is.not.empty

    const selectorMicroMemoizeOverrideArgsMemoizeOnly =
      createSelectorMicroMemoize(
        (state: RootState) => state.todos,
        todos => todos.map(({ id }) => id),
        {
          argsMemoize: defaultMemoize,
          argsMemoizeOptions: { resultEqualityCheck: (a, b) => a === b }
        }
      )
    expect(selectorMicroMemoizeOverrideArgsMemoizeOnly(state)).to.be.an('array')
      .that.is.not.empty
    // Checking existence of fields related to `argsMemoize`
    expect(selectorMicroMemoizeOverrideArgsMemoizeOnly.clearCache).to.be.a(
      'function'
    )
    // @ts-expect-error
    expect(selectorMicroMemoizeOverrideArgsMemoizeOnly.cache).toBeUndefined()
    // @ts-expect-error
    expect(selectorMicroMemoizeOverrideArgsMemoizeOnly.fn).toBeUndefined()
    expect(
      // @ts-expect-error
      selectorMicroMemoizeOverrideArgsMemoizeOnly.isMemoized
    ).toBeUndefined()
    // @ts-expect-error
    expect(selectorMicroMemoizeOverrideArgsMemoizeOnly.options).toBeUndefined()
    expect(
      // Checking existence of fields related to `memoize`
      // @ts-expect-error Note that since we did not override `memoize` in the options object,
      // memoizedResultFunc.clearCache becomes an invalid field access, and we get `cache`, `fn`, `isMemoized` and `options` instead.
      selectorMicroMemoizeOverrideArgsMemoizeOnly.memoizedResultFunc.clearCache
    ).toBeUndefined()
    expect(
      selectorMicroMemoizeOverrideArgsMemoizeOnly.memoizedResultFunc.cache
    ).to.be.a('object')
    expect(
      selectorMicroMemoizeOverrideArgsMemoizeOnly.memoizedResultFunc.fn
    ).to.be.a('function')
    expect(
      selectorMicroMemoizeOverrideArgsMemoizeOnly.memoizedResultFunc.isMemoized
    ).to.be.true
    expect(
      selectorMicroMemoizeOverrideArgsMemoizeOnly.memoizedResultFunc.options
    ).to.be.a('object')
    // Checking existence of fields related to the actual memoized selector
    expect(selectorMicroMemoizeOverrideArgsMemoizeOnly.dependencies).to.be.an(
      'array'
    ).that.is.not.empty
    expect(selectorMicroMemoizeOverrideArgsMemoizeOnly.lastResult()).to.be.an(
      'array'
    ).that.is.not.empty
    expect(
      selectorMicroMemoizeOverrideArgsMemoizeOnly.memoizedResultFunc([
        {
          id: 0,
          completed: true,
          title: 'Practice telekinesis for 15 minutes',
          description: 'Just do it'
        }
      ])
    ).to.be.an('array').that.is.not.empty
    expect(
      selectorMicroMemoizeOverrideArgsMemoizeOnly.recomputations()
    ).to.be.a('number')
    expect(
      selectorMicroMemoizeOverrideArgsMemoizeOnly.resetRecomputations()
    ).toBe(0)
    expect(
      selectorMicroMemoizeOverrideArgsMemoizeOnly.resultFunc([
        {
          id: 0,
          completed: true,
          title: 'Practice telekinesis for 15 minutes',
          description: 'Just do it'
        }
      ])
    ).to.be.an('array').that.is.not.empty

    const selectorMicroMemoizeOverrideMemoizeOnly = createSelectorMicroMemoize(
      [(state: RootState) => state.todos],
      todos => todos.map(({ id }) => id),
      { memoize: defaultMemoize }
    )
    expect(selectorMicroMemoizeOverrideMemoizeOnly(state)).to.be.an('array')
      .that.is.not.empty
    // Checking existence of fields related to `argsMemoize`
    // @ts-expect-error Note that since we did not override `argsMemoize` in the options object,
    // selector.clearCache becomes an invalid field access, and we get `cache`, `fn`, `isMemoized` and `options` instead.
    expect(selectorMicroMemoizeOverrideMemoizeOnly.clearCache).toBeUndefined()
    expect(selectorMicroMemoizeOverrideMemoizeOnly).to.have.all.keys([
      'cache',
      'fn',
      'isMemoized',
      'options',
      'resultFunc',
      'memoizedResultFunc',
      'lastResult',
      'dependencies',
      'recomputations',
      'resetRecomputations',
      'memoize',
      'argsMemoize'
    ])
    expect(selectorMicroMemoizeOverrideMemoizeOnly.cache).to.be.an('object')
    expect(selectorMicroMemoizeOverrideMemoizeOnly.fn).to.be.a('function')
    expect(selectorMicroMemoizeOverrideMemoizeOnly.isMemoized).to.be.true
    expect(selectorMicroMemoizeOverrideMemoizeOnly.options).to.be.an('object')
    // Checking existence of fields related to `memoize`
    expect(selectorMicroMemoizeOverrideMemoizeOnly.memoizedResultFunc)
      .to.be.a('function')
      .that.has.all.keys(['clearCache'])
    expect(
      selectorMicroMemoizeOverrideMemoizeOnly.memoizedResultFunc.clearCache
    ).to.be.a('function')
    // Checking existence of fields related to the actual memoized selector
    expect(selectorMicroMemoizeOverrideMemoizeOnly.dependencies).to.be.an(
      'array'
    ).that.is.not.empty
    expect(selectorMicroMemoizeOverrideMemoizeOnly.lastResult()).to.be.an(
      'array'
    ).that.is.not.empty
    expect(
      selectorMicroMemoizeOverrideMemoizeOnly.memoizedResultFunc([
        {
          id: 0,
          completed: true,
          title: 'Practice telekinesis for 15 minutes',
          description: 'Just do it'
        }
      ])
    ).to.be.an('array').that.is.not.empty
    expect(selectorMicroMemoizeOverrideMemoizeOnly.recomputations()).to.be.a(
      'number'
    )
    expect(selectorMicroMemoizeOverrideMemoizeOnly.resetRecomputations()).toBe(
      0
    )
    expect(
      selectorMicroMemoizeOverrideMemoizeOnly.resultFunc([
        {
          id: 0,
          completed: true,
          title: 'Practice telekinesis for 15 minutes',
          description: 'Just do it'
        }
      ])
    ).to.be.an('array').that.is.not.empty
  })

  localTest('pass options object to createSelectorCreator ', ({ store }) => {
    const createSelectorMicro = createSelectorCreator({
      memoize: microMemoize,
      memoizeOptions: { isEqual: (a, b) => a === b }
    })
    const selectorMicro = createSelectorMicro(
      [(state: RootState) => state.todos],
      todos => todos.map(({ id }) => id)
    )
    expect(() =>
      //@ts-expect-error
      createSelectorMicro([(state: RootState) => state.todos], 'a')
    ).toThrowError(
      TypeError(
        `createSelector expects an output function after the inputs, but received: [string]`
      )
    )
  })
})
