/**
 * Drawings for feature cards, in the card's own ink: a casino chip and a
 * medal. Decoration only, so hidden from assistive technology.
 */
export function ChipArt() {
  const edges = Array.from({ length: 8 }, (_, i) => i * 45);
  return (
    <svg className="feature-art" viewBox="0 0 120 120" aria-hidden="true">
      <circle cx="60" cy="60" r="56" fill="currentColor" opacity="0.16" />
      <circle cx="60" cy="60" r="56" fill="none" stroke="currentColor" strokeOpacity="0.5" strokeWidth="3" />
      {edges.map((a) => (
        <rect key={a} x="54" y="5" width="12" height="16" rx="3" fill="currentColor" opacity="0.55" transform={`rotate(${a} 60 60)`} />
      ))}
      <circle cx="60" cy="60" r="34" fill="none" stroke="currentColor" strokeOpacity="0.55" strokeWidth="3" strokeDasharray="6 7" />
      <path d="M60 42c7 9 14 13 14 20a8 8 0 0 1-12 7l2 9h-8l2-9a8 8 0 0 1-12-7c0-7 7-11 14-20z" fill="currentColor" opacity="0.7" />
    </svg>
  );
}

export function MedalArt() {
  return (
    <svg className="feature-art" viewBox="0 0 120 120" aria-hidden="true">
      <path d="M38 4h18l12 34H50zM82 4H64l-12 34h18z" fill="currentColor" opacity="0.28" />
      <circle cx="60" cy="74" r="40" fill="currentColor" opacity="0.18" />
      <circle cx="60" cy="74" r="40" fill="none" stroke="currentColor" strokeOpacity="0.5" strokeWidth="3" />
      <circle cx="60" cy="74" r="28" fill="none" stroke="currentColor" strokeOpacity="0.45" strokeWidth="2.5" strokeDasharray="4 5" />
      <path d="M60 56l5.3 11 12 1.6-8.8 8.3 2.2 12L60 83.2 49.3 89l2.2-12-8.8-8.3 12-1.6z" fill="currentColor" opacity="0.7" />
    </svg>
  );
}
