import {
  getLanguages,
  copilotStatus,
  languageServerStatus,
} from "./languageServerSelector";
import { LanguageServerState } from "vs/workbench/features/window/state";

describe("getLanguages", () => {
  test("should return correct languages", () => {
    const state = {
      languageServerState: {
        languageServers: {
          python: {},
          javascript: {},
        },
      },
    };
    expect(getLanguages(state)).toEqual(["python", "javascript"]);
  });
});

describe("copilotStatus", () => {
  test("should return correct copilot status", () => {
    const state = {
      languageServerState: {
        copilotSignedIn: true,
        copilotEnabled: false,
      },
    };
    expect(copilotStatus(state)).toEqual({ signedIn: true, enabled: false });
  });
});

describe("languageServerStatus", () => {
  test("should return correct language server status", () => {
    const state = {
      languageServerState: {
        languageServers: {
          python: { status: "active" },
          javascript: { status: "inactive" },
        },
      },
    };
    expect(languageServerStatus("python")(state)).toEqual({ status: "active" });
    expect(languageServerStatus("javascript")(state)).toEqual({
      status: "inactive",
    });
  });
});
