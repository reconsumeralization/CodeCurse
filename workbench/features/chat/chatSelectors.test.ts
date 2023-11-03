import * as chatSelectors from "./chatSelectors";
import { FullState } from "../window/state";

describe("chatSelectors", () => {
  let state: FullState;

  beforeEach(() => {
    state = {
      chatState: {
        isCommandBarOpen: false,
        draftMessages: {},
        currentConversationId: "1",
        botMessages: [],
        generating: false,
        userMessages: [],
        chatIsOpen: false,
        chatHistoryIsOpen: false,
        fireCommandK: false,
        msgType: "freeform",
      },
    };
  });

  test("getIsCommandBarOpen", () => {
    expect(chatSelectors.getIsCommandBarOpen(state)).toBe(false);
    state.chatState.isCommandBarOpen = true;
    expect(chatSelectors.getIsCommandBarOpen(state)).toBe(true);
  });

  // ...similar tests for other selectors...
});
