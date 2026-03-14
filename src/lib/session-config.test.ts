import { afterEach, describe, expect, it, vi } from "vitest";

import {
  getSessionSecretValue,
  resetSessionConfigWarningsForTests,
} from "./session-config";

describe("getSessionSecretValue", () => {
  const originalSessionSecret = process.env.SESSION_SECRET;

  afterEach(() => {
    if (originalSessionSecret === undefined) {
      delete process.env.SESSION_SECRET;
    } else {
      process.env.SESSION_SECRET = originalSessionSecret;
    }

    resetSessionConfigWarningsForTests();
    vi.restoreAllMocks();
  });

  it("returns the configured secret when present", () => {
    process.env.SESSION_SECRET = "my-custom-secret";

    expect(getSessionSecretValue()).toBe("my-custom-secret");
  });

  it("falls back to the built-in demo secret when missing", () => {
    delete process.env.SESSION_SECRET;
    const warnSpy = vi.spyOn(console, "warn").mockImplementation(() => undefined);

    expect(getSessionSecretValue()).toBe("app-droit-demo-session-secret");
    expect(warnSpy).toHaveBeenCalledTimes(1);
  });
});
