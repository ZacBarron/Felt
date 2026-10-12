/** A number with an explicit sign and a true minus (U+2212), for results and rating changes. */
export function signed(n: number, digits = 1): string {
  const v = Number(n.toFixed(digits));
  if (v === 0) return (0).toFixed(digits);
  return `${v > 0 ? '+' : '−'}${Math.abs(v).toFixed(digits)}`;
}

/** "1 hand", "2 hands". */
export function plural(n: number, one: string, many = `${one}s`): string {
  return `${n.toLocaleString()} ${n === 1 ? one : many}`;
}
