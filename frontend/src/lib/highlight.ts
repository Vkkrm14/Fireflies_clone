export interface TextPart {
  text: string;
  match: boolean;
}

const escapeRegExp = (value: string) => value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");

export function splitByQuery(text: string, query: string): TextPart[] {
  const q = query.trim();
  if (!q) return [{ text, match: false }];
  const parts: TextPart[] = [];
  let last = 0;
  for (const m of text.matchAll(new RegExp(escapeRegExp(q), "gi"))) {
    const start = m.index ?? 0;
    if (start > last) parts.push({ text: text.slice(last, start), match: false });
    parts.push({ text: m[0], match: true });
    last = start + m[0].length;
  }
  if (last < text.length) parts.push({ text: text.slice(last), match: false });
  return parts.length ? parts : [{ text, match: false }];
}

export function countMatches(text: string, query: string): number {
  return splitByQuery(text, query).filter((p) => p.match).length;
}
