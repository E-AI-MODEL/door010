/**
 * Normalizes markdown output from the LLM before rendering.
 * - Replaces em-dashes with regular dashes
 * - Collapses consecutive blank lines
 * - Joins loose lines (non-bullet, non-heading, non-quote) into paragraphs
 */
export function normalizeMarkdown(input: string): string {
  const s = (input ?? "").replace(/\r/g, "").replace(/\u2014/g, "-");

  const lines = s.split("\n");
  const out: string[] = [];
  let paragraph: string[] = [];

  const flush = () => {
    if (paragraph.length) {
      out.push(paragraph.join(" ").replace(/\s+/g, " ").trim());
      paragraph = [];
    }
  };

  for (const raw of lines) {
    const line = raw.trimEnd();
    const t = line.trim();

    if (t === "") {
      flush();
      if (out[out.length - 1] !== "") out.push("");
      continue;
    }

    const isList = /^([-*]|\d+\.)\s+/.test(t);
    const isHeading = /^#{1,6}\s+/.test(t);
    const isQuote = /^>\s+/.test(t);

    if (isList || isHeading || isQuote) {
      flush();
      out.push(t);
      continue;
    }

    paragraph.push(t);
  }

  flush();

  return out.join("\n").replace(/\n{3,}/g, "\n\n");
}
