import { getViewId, hasSelection } from './codemirrorSelectors';
import { FullCodeMirrorState } from './codemirrorSlice';

describe('codemirrorSelectors', () => {
  let state: FullCodeMirrorState;

  beforeEach(() => {
    state = {
      codeMirrorState: {
        editorMap: {
          1: 2,
          3: 4,
        },
      },
    };
  });

  test('getViewId', () => {
    expect(getViewId(1)(state)).toBe(2);
    expect(getViewId(3)(state)).toBe(4);
    expect(getViewId(5)(state)).toBeUndefined();
    expect(getViewId(null)(state)).toBeUndefined();
  });

  test('hasSelection', () => {
    const mockGetCodeMirrorView = jest.fn();
    mockGetCodeMirrorView.mockReturnValueOnce({ state: { selection: { main: { from: 1, to: 2 } } } });
    mockGetCodeMirrorView.mockReturnValueOnce({ state: { selection: { main: { from: 1, to: 1 } } } });
    mockGetCodeMirrorView.mockReturnValueOnce(null);

    expect(hasSelection(1)).toBe(true);
    expect(hasSelection(2)).toBe(false);
    expect(hasSelection(null)).toBe(null);
  });
});
