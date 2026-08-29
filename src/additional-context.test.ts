import { describe, expect, it } from "vitest";
import { parseAdditionalContext } from "./additional-context";

describe("additional chatbot context", () => {
  it("requires the evidence envelope and marks reviewed imports trusted", () => {
    const result = parseAdditionalContext(`\`\`\`json
      {"evidence":[{"id":"memory.1","source":"Chat memory","facts":["Built an internal deployment tool."],"technologies":["Go"],"metrics":[],"trusted":false}]}
    \`\`\``);
    expect(result).toHaveLength(1);
    expect(result[0]).toMatchObject({ id: "memory.1", trusted: true });
  });

  it("rejects unstructured prose", () => {
    expect(() => parseAdditionalContext("I remember a few things.")).toThrow();
  });
});
