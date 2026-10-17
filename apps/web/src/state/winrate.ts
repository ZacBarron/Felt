import {
  blendWithResults,
  currentRating,
  defaultAssumptions,
  estimateWinRate,
  formatAmount,
  heroStats,
  skillEdge,
  type TableAssumptions,
} from '@felt/core';
import { useLiveQuery } from 'dexie-react-hooks';
import { db } from './db';
import { ratingSnapshot } from './rating';
import { useSettings } from './settings';

/** Where real results came from, if anywhere. */
export interface ResultsSource {
  hands: number;
  bb: number;
  sd?: number;
  label: string;
}

/**
 * The win rate estimate for the player's game: the model from their rating,
 * blended with real results once there are any. Shared by You and the
 * Win rate page so both show the same number.
 */
export function useWinRate() {
  const { settings } = useSettings();
  const g = settings.game;
  const snap = useLiveQuery(ratingSnapshot, []);
  const imported = useLiveQuery(async () => {
    const cash = (await db.hands.where('game').equals('cash').toArray()).filter((h) => h.netBb !== undefined);
    const sessions = await db.sessions.toArray();
    return { cash, sessions };
  }, []);
  if (!snap) return undefined;

  const overall = currentRating(snap.overall);
  const a: TableAssumptions = { ...defaultAssumptions(g), ...settings.assumptions };
  const model = estimateWinRate(overall.rating, overall.rd, g, a);
  const results = settings.results;
  // Only results from this game count: hands at this big blind online, and sessions at this big blind.
  const gameHands = g.venue === 'online' ? (imported?.cash ?? []).filter((h) => h.bb === g.stakes.bb) : [];
  const gameSessions = (imported?.sessions ?? []).filter((x) => (x.bb ?? g.stakes.bb) === g.stakes.bb);
  const handsSource: ResultsSource | undefined = gameHands.length
    ? (() => {
        const st = heroStats(gameHands.map((h) => ({ ...h, date: h.at })));
        return { hands: st.hands, bb: st.netBb, sd: st.hands >= 1000 ? st.sd100 : undefined, label: `${st.hands.toLocaleString()} imported hands` };
      })()
    : undefined;
  const sessionHours = gameSessions.reduce((t, x) => t + x.hours, 0);
  const sessionSource: ResultsSource | undefined = gameSessions.length
    ? {
        hands: Math.round(sessionHours * a.handsPerHour),
        bb: gameSessions.reduce((t, x) => t + x.profit / (x.bb ?? g.stakes.bb), 0),
        label: `${gameSessions.length} imported ${gameSessions.length === 1 ? 'session' : 'sessions'} over ${Math.round(sessionHours)} hours`,
      }
    : undefined;
  // Use whichever source covers more hands; typed results only when nothing was imported.
  const source: ResultsSource | undefined =
    [handsSource, sessionSource].filter((x): x is ResultsSource => !!x).sort((x, y) => y.hands - x.hands)[0] ??
    (results && results.hands > 0 ? { hands: results.hands, bb: results.profit / g.stakes.bb, label: 'the results you entered' } : undefined);
  const sd = source?.sd ?? a.sd100;
  const observed = source ? (source.bb / source.hands) * 100 : undefined;
  const blended = source && observed !== undefined ? blendWithResults(model, observed, source.hands, sd) : undefined;
  const best = blended ?? { ...model, weightOnResults: 0 };

  return {
    game: g,
    assumptions: a,
    overall,
    rated: overall.games > 0,
    model,
    blended,
    best,
    source,
    observed,
    sd,
    hasImports: !!imported && (imported.cash.length > 0 || imported.sessions.length > 0),
    per100Points: skillEdge(overall.rating + 100, a) - skillEdge(overall.rating, a),
    perHour: (bb100: number) => formatAmount((bb100 * a.handsPerHour) / 100, g),
  };
}
