import type { Chart } from '@felt/core';

export function actionLabels(chart: Chart): Record<string, string> {
  const labels: Record<string, string> = { fold: 'Fold' };
  for (const a of chart.spec.actions) labels[a.id] = a.label;
  return labels;
}

/** One line describing the spot, e.g. "Folded to you" or "BTN opens 2.5bb". */
export function spotLine(chart: Chart): string {
  if (chart.spec.versus) return chart.spec.versus;
  return chart.spec.spot === 'rfi' ? 'Folded to you' : '';
}
