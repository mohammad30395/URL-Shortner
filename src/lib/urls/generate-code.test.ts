import { describe, expect, it } from "vitest";

import { generateShortCode, SHORT_CODE_REGEX } from "./generate-code";

describe("generateShortCode", () => {
  it("generates seven-character codes", () => {
    expect(generateShortCode()).toHaveLength(7);
  });

  it("uses only permitted short-code characters", () => {
    for (let index = 0; index < 100; index += 1) {
      expect(generateShortCode()).toMatch(SHORT_CODE_REGEX);
    }
  });
});
