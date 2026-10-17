/** The Pro label wherever a row or step needs Pro: gold from the chip set (BRAND.md). */
export function ProBadge({ children = 'Pro' }: { children?: string }) {
  return <span className="pill pill-pro">{children}</span>;
}
