/** A list item or paragraph, keyed by the line it starts on. */
export type AnswerItem = { line: number; text: string };
export type AnswerBlock =
  | { kind: "p"; line: number; lines: string[] }
  | { kind: "ul"; line: number; items: AnswerItem[] };

/**
 * Splits a plain-text answer into paragraphs (separated by blank lines) and
 * "- " or "• " lists. Works on partial text, so it can run on every streamed chunk.
 */
export function parseAnswer(text: string): AnswerBlock[] {
  const blocks: AnswerBlock[] = [];
  text.split("\n").forEach((raw, lineNo) => {
    const line = raw.trimEnd();
    const item = /^\s*[-•]\s+(.*)$/.exec(line)?.[1];
    const last = blocks.at(-1);
    if (item !== undefined) {
      if (last?.kind === "ul") last.items.push({ line: lineNo, text: item });
      else blocks.push({ kind: "ul", line: lineNo, items: [{ line: lineNo, text: item }] });
    } else if (!line.trim()) {
      // A blank line ends the current block.
      if (last && !(last.kind === "p" && last.lines.length === 0)) {
        blocks.push({ kind: "p", line: lineNo + 1, lines: [] });
      }
    } else if (last?.kind === "p") {
      last.lines.push(line);
    } else {
      blocks.push({ kind: "p", line: lineNo, lines: [line] });
    }
  });
  return blocks.filter((block) => block.kind === "ul" || block.lines.length > 0);
}
