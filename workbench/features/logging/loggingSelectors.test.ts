import { getFeedbackMessage, getIsOpen } from "./loggingSelectors";
import { FullState } from "../window/state";

describe("getFeedbackMessage", () => {
  let state: FullState;

  beforeEach(() => {
    state = {
      loggingState: {
        feedbackMessage: "Test message",
        isOpen: false,
      },
    };
  });

  test("should return correct feedback message", () => {
    expect(getFeedbackMessage(state)).toBe("Test message");
  });
});

describe("getIsOpen", () => {
  let state: FullState;

  beforeEach(() => {
    state = {
      loggingState: {
        feedbackMessage: "Test message",
        isOpen: false,
      },
    };
  });

  test("should return correct isOpen value", () => {
    expect(getIsOpen(state)).toBe(false);
  });
});
