import { describe, expect, it } from "vitest";
import { parseAnswer } from "./answer-blocks";

describe("parseAnswer", () => {
  it("keeps a plain answer as one paragraph", () => {
    expect(parseAnswer("Short answer.")).toEqual([
      { kind: "p", line: 0, lines: ["Short answer."] },
    ]);
  });

  it("splits paragraphs on blank lines and keeps single breaks inside one", () => {
    const blocks = parseAnswer("First line\nsame paragraph\n\nSecond paragraph");
    expect(blocks).toEqual([
      { kind: "p", line: 0, lines: ["First line", "same paragraph"] },
      { kind: "p", line: 3, lines: ["Second paragraph"] },
    ]);
  });

  it("groups dash and bullet lines into one list between paragraphs", () => {
    const blocks = parseAnswer("Changes:\n- Faster builds\n• Smaller bundles\nThat's it.");
    expect(blocks.map((block) => block.kind)).toEqual(["p", "ul", "p"]);
    expect(blocks[1]).toEqual({
      kind: "ul",
      line: 1,
      items: [
        { line: 1, text: "Faster builds" },
        { line: 2, text: "Smaller bundles" },
      ],
    });
  });

  it("returns nothing for empty or whitespace-only text", () => {
    expect(parseAnswer("")).toEqual([]);
    expect(parseAnswer("\n\n  ")).toEqual([]);
  });
});
