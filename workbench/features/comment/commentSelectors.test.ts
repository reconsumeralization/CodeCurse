import * as commentSelectors from "./commentSelectors";
import { FullState } from "../window/state";

describe("commentSelectors", () => {
  let state: FullState;

  beforeEach(() => {
    state = {
      commentState: {
        comments: [],
        currentCommentId: "1",
        isCommentOpen: false,
      },
    };
  });

  test("getComments", () => {
    expect(commentSelectors.getComments(state)).toEqual([]);
    state.commentState.comments = [{ id: "1", text: "Test comment" }];
    expect(commentSelectors.getComments(state)).toEqual([
      { id: "1", text: "Test comment" },
    ]);
  });

  test("getCurrentCommentId", () => {
    expect(commentSelectors.getCurrentCommentId(state)).toBe("1");
    state.commentState.currentCommentId = "2";
    expect(commentSelectors.getCurrentCommentId(state)).toBe("2");
  });

  test("getIsCommentOpen", () => {
    expect(commentSelectors.getIsCommentOpen(state)).toBe(false);
    state.commentState.isCommentOpen = true;
    expect(commentSelectors.getIsCommentOpen(state)).toBe(true);
  });
});
