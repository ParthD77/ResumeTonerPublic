import { beforeEach, describe, expect, it, vi } from "vitest";
import { forgetGeminiKey, getGeminiKey, setGeminiKey } from "./key-store";

describe("Gemini key storage", () => {
  const values: Record<string, string> = {};
  const setAccessLevel = vi.fn();
  beforeEach(() => {
    for (const key of Object.keys(values)) delete values[key];
    setAccessLevel.mockClear();
    vi.stubGlobal("chrome", {
      storage: {
        local: {
          setAccessLevel,
          get: vi.fn(async (key: string) => ({ [key]: values[key] })),
          set: vi.fn(async (next: Record<string, string>) =>
            Object.assign(values, next),
          ),
          remove: vi.fn(async (key: string) => delete values[key]),
        },
      },
    });
  });
  it("rejects blank or malformed keys", async () => {
    await expect(setGeminiKey("")).rejects.toThrow("format");
    await expect(setGeminiKey("short")).rejects.toThrow("format");
    expect(values).toEqual({});
  });
  it("stores only a valid candidate in trusted extension contexts", async () => {
    const candidate = "candidate-key-with-enough-characters";
    await setGeminiKey(candidate);
    expect(await getGeminiKey()).toBe(candidate);
    expect(setAccessLevel).toHaveBeenCalledWith({
      accessLevel: "TRUSTED_CONTEXTS",
    });
    await forgetGeminiKey();
    expect(await getGeminiKey()).toBe("");
  });
});
