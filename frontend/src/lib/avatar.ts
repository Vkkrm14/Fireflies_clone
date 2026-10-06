export const AVATAR_COLORS = [
  "#6c5ce7", "#00b894", "#0984e3", "#e17055",
  "#fdcb6e", "#e84393", "#00cec9", "#a29bfe",
];

export function initials(name: string): string {
  const words = name.trim().split(/\s+/).filter(Boolean);
  if (words.length === 0) return "?";
  const first = words[0][0];
  const last = words.length > 1 ? words[words.length - 1][0] : "";
  return (first + last).toUpperCase();
}

export function avatarColor(name: string): string {
  let hash = 0;
  for (const ch of name) hash = (hash * 31 + ch.charCodeAt(0)) >>> 0;
  return AVATAR_COLORS[hash % AVATAR_COLORS.length];
}

function luminance(hex: string): number {
  const channels = [1, 3, 5].map((i) => parseInt(hex.slice(i, i + 2), 16) / 255);
  const [r, g, b] = channels.map((c) => (c <= 0.03928 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4));
  return 0.2126 * r + 0.7152 * g + 0.0722 * b;
}

export function readableTextColor(background: string): string {
  const dark = "#1f2937";
  const bg = luminance(background);
  const contrast = (l: number) => (Math.max(bg, l) + 0.05) / (Math.min(bg, l) + 0.05);
  return contrast(1) >= contrast(luminance(dark)) ? "#ffffff" : dark;
}
