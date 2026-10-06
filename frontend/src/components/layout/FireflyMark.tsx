/** Simplified quadrant "F" mark in the Fireflies brand gradient. */
export function FireflyMark({ size = 28 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 32 32" aria-hidden>
      <defs>
        <linearGradient id="ff-mark" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0" stopColor="#8a49d8" />
          <stop offset="1" stopColor="#f0388c" />
        </linearGradient>
      </defs>
      <path d="M2 2h12v12H2z" fill="url(#ff-mark)" opacity="0.95" />
      <path d="M17 2h11a2 2 0 0 1 2 2v10H17z" fill="url(#ff-mark)" />
      <path d="M2 17h12v11a2 2 0 0 1-2 2H2z" fill="url(#ff-mark)" opacity="0.9" />
      <path d="M17 17h7v7h-7z" fill="url(#ff-mark)" opacity="0.8" />
    </svg>
  );
}
