import 'fake-indexeddb/auto';
import { BANKED_SCENARIOS, quizVersions, type QuizStep, SCENARIOS, scenarioTemplates, stepVersion } from '@felt/content';
import { boundaryHands, comboText, dealCombo, flopTexture, parseCards, PRESETS, seededRandom } from '@felt/core';
import { writeFileSync } from 'node:fs';
import { afterAll, beforeAll, beforeEach, describe, expect, it } from 'vitest';
import { dailyItems } from '../src/pages/DailyPage';
import { dealSet } from '../src/pages/RangesPage';
import { chartsForGame, closestForGame, getChart } from '../src/state/charts';
import { db } from '../src/state/db';
import { buildSession, reviewCharts } from '../src/state/decks';
import { dealQuizSeed, LESSON_ENTRIES, markTested, quizAt, quizSteps, versionIndex } from '../src/state/lessons';
import { practiceSession } from '../src/state/practice';
import { recordAnswer } from '../src/state/review';
import { findScenario, nextScenarios } from '../src/state/scenarios';
import { clearSeen, dealKey, handKey, markSeen, recentCombos } from '../src/state/seen';
import { dealSpotQuiz, markQuizSeen } from '../src/state/spotQuiz';
import { weeklySet } from '../src/state/weekly';

/**
 * Variety audit. Simulates real use of each surface and reports how
 * repetitive it is: distinct spots, seats, hands and stacks, and how often
 * an exact item comes back. docs/research/variety-audit.md holds the numbers
 * from before the variety work and after it. The checks at the bottom of
 * each test fail if variety drops below what this work reached.
 *
 * Run with VARIETY_OUT=path to save the numbers as JSON.
 */

const game = PRESETS['live-1-3'].settings;
const out: Record<string, Record<string, number | string>> = {};
const realRandom = Math.random;
const DAY = 24 * 3600 * 1000;
const START = new Date(2026, 9, 1, 19).getTime();

beforeAll(() => {
  Math.random = seededRandom(20261017);
});
beforeEach(() => clearSeen());
afterAll(() => {
  Math.random = realRandom;
  if (process.env.VARIETY_OUT) writeFileSync(process.env.VARIETY_OUT, JSON.stringify(out, null, 2));
});

const spotOf = (chartId: string) => {
  const s = getChart(chartId)!.spec;
  return { spot: s.spot, seat: s.hero, villain: (s.villains ?? []).join('/'), table: s.tableSize, stack: s.stackBb };
};
const itemKey = (chartId: string, hand: string) => {
  const s = spotOf(chartId);
  return `${s.table}|${s.stack}|${s.spot}|${s.seat}|${s.villain}|${hand}`;
};

/** Repeats of an item within the last `window` items. */
function repeatsWithin(keys: readonly string[], window: number): number {
  let n = 0;
  keys.forEach((k, i) => {
    if (keys.slice(Math.max(0, i - window), i).includes(k)) n++;
  });
  return n;
}
/** Share of neighbours from the same chart. */
const sameNeighbour = (charts: readonly string[]) => (charts.length < 2 ? 0 : charts.slice(1).filter((c, i) => c === charts[i]).length / (charts.length - 1));
const round = (x: number, d = 3) => Math.round(x * 10 ** d) / 10 ** d;

function chartStats(items: readonly { chartId: string; hand: string }[]) {
  const keys = items.map((i) => itemKey(i.chartId, i.hand));
  return {
    questions: items.length,
    distinctItems: new Set(keys).size,
    distinctCharts: new Set(items.map((i) => i.chartId)).size,
    distinctSpotTypes: new Set(items.map((i) => spotOf(i.chartId).spot)).size,
    distinctSeats: new Set(items.map((i) => spotOf(i.chartId).seat)).size,
    distinctHands: new Set(items.map((i) => i.hand)).size,
    distinctStacks: new Set(items.map((i) => spotOf(i.chartId).stack)).size,
    distinctTables: new Set(items.map((i) => spotOf(i.chartId).table)).size,
    repeatsWithin20: repeatsWithin(keys, 20),
    sameChartNeighbours: round(sameNeighbour(items.map((i) => i.chartId))),
  };
}

describe('variety audit', () => {
  it('ranges quiz: 100 questions', () => {
    // One chart, ten sets in a row, as a player taps "Start a new set".
    const { charts } = closestForGame(game);
    const chart = getChart(charts.find((c) => c.spot === 'rfi')!.id)!;
    const one: { chartId: string; hand: string }[] = [];
    for (let set = 0; set < 10; set++) {
      const now = START + set * 10 * 60_000;
      for (const hand of dealSet(chart, Math.random, now)) {
        one.push({ chartId: chart.spec.id, hand });
        markSeen([handKey(chart.spec.id, hand)], now);
      }
    }
    const edges = new Set(boundaryHands(chart));
    out.rangesQuiz = { ...chartStats(one), shareCloseCalls: round(one.filter((i) => edges.has(i.hand)).length / one.length) };

    // The range quiz across spots, in each pool.
    for (const pool of ['game', 'stacks', 'tables'] as const) {
      clearSeen();
      const items: { chartId: string; hand: string; estimate: boolean; role: string }[] = [];
      for (let set = 0; set < 10; set++) {
        const now = START + set * 10 * 60_000;
        for (const item of dealSpotQuiz(game, pool, { now })) {
          items.push(item);
          markQuizSeen(item, now);
        }
      }
      out[`spotQuiz_${pool}`] = {
        ...chartStats(items),
        shareClear: round(items.filter((i) => i.role === 'clear').length / items.length),
        shareEstimates: round(items.filter((i) => i.estimate).length / items.length),
      };
    }

    expect(out.rangesQuiz.repeatsWithin20).toBeLessThanOrEqual(2);
    expect(out.rangesQuiz.distinctItems).toBeGreaterThanOrEqual(95);
    expect(out.spotQuiz_game.distinctSpotTypes).toBeGreaterThanOrEqual(7);
    expect(out.spotQuiz_game.distinctSeats).toBeGreaterThanOrEqual(8);
    expect(out.spotQuiz_game.distinctCharts).toBeGreaterThanOrEqual(70);
    expect(out.spotQuiz_game.repeatsWithin20).toBe(0);
    expect(out.spotQuiz_game.sameChartNeighbours).toBe(0);
    expect(out.spotQuiz_stacks.distinctStacks).toBeGreaterThanOrEqual(5);
    expect(out.spotQuiz_tables.distinctTables).toBe(2);
  });

  it('practice at your level: 10 sessions of 10', async () => {
    // Sessions mix in lesson questions, so play sessions until 100 chart decisions have come up.
    const charts = chartsForGame(game).charts;
    const picked: { chartId: string; hand: string }[] = [];
    let sessions = 0;
    for (let day = 0; picked.length < 100; day++) {
      const now = START + day * DAY;
      sessions++;
      for (const item of practiceSession(game, new Map(), () => 1300, { n: 10, now })) {
        if (item.decision.kind !== 'chart' || picked.length >= 100) continue;
        picked.push(item.decision);
        markQuizSeen(item.decision, now);
      }
    }
    out.practice = { reviewCharts: charts.length, sessions, ...chartStats(picked) };
    expect(out.practice.distinctSpotTypes).toBeGreaterThanOrEqual(6);
    expect(out.practice.distinctCharts).toBeGreaterThanOrEqual(50);
    expect(out.practice.repeatsWithin20).toBe(0);
  });

  it('review: an active player over 30 days', async () => {
    await Promise.all(db.tables.map((t) => t.clear()));
    await markTested(['basics/first-strategy/starting-hands']);
    const { charts } = chartsForGame(game);
    const study = { newPerDay: 15, decks: { lessons: { on: false }, math: { on: false }, saved: { on: false } } };
    const shown: { chartId: string; hand: string; id: string }[] = [];
    const firstWeekCharts = new Set<string>();
    const rand = seededRandom(7);
    let sameCombo = 0;
    let shows = 0;
    for (let day = 0; day < 30; day++) {
      const now = new Date(START + day * DAY);
      const session = await buildSession(charts, study, { kind: 'today' }, new Set(), now);
      for (const item of session) {
        if (item.mode !== 'quick' && item.mode !== 'paint') continue;
        shown.push({ chartId: item.chartId, hand: item.hand ?? 'paint', id: item.id });
        if (day < 7) firstWeekCharts.add(item.chartId);
        if (item.hand) {
          // As QuickRecall deals the card: fresh suits, skipping the combos dealt lately.
          const last = recentCombos(item.hand, 1)[0];
          const combo = comboText(dealCombo(item.hand, Math.random, recentCombos(item.hand)));
          if (combo === last) sameCombo++;
          shows++;
          markSeen([dealKey(item.hand, combo)], now.getTime());
        }
        await recordAnswer(item, { accuracy: rand() < 0.85 ? 1 : 0, responseMs: 2200, targetMs: item.targetMs }, now);
      }
    }
    const deck = await reviewCharts(charts);
    out.review = {
      coreCharts: charts.length,
      deckChartsAfter30Days: deck.length,
      ...chartStats(shown),
      distinctCards: new Set(shown.map((s) => s.id)).size,
      chartsInFirstWeek: firstWeekCharts.size,
      sameComboAsLastShow: round(sameCombo / Math.max(1, shows)),
    };
    expect(out.review.distinctSpotTypes).toBeGreaterThanOrEqual(6);
    expect(out.review.chartsInFirstWeek).toBeGreaterThanOrEqual(14);
    expect(out.review.distinctCharts).toBeGreaterThanOrEqual(18);
    expect(out.review.sameChartNeighbours).toBeLessThanOrEqual(0.05);
    expect(out.review.deckChartsAfter30Days).toBeGreaterThan(charts.length);
    expect(out.review.sameComboAsLastShow).toBe(0);
  }, 180_000);

  it('daily challenge: 60 days and a year', () => {
    const range = (days: number) => {
      const decisions: { chartId: string; hand: string; day: number; cards?: string }[] = [];
      for (let d = 0; d < days; d++) {
        for (const item of dailyItems(new Date(2026, 9, 17 + d, 9))) if (item.kind === 'chart') decisions.push({ chartId: item.chartId, hand: item.hand, day: d, cards: item.cards });
      }
      const last = new Map<string, number>();
      let repeats = 0;
      let within90 = 0;
      let minGap = Infinity;
      for (const x of decisions) {
        const k = `${x.chartId}:${x.hand}`;
        const prev = last.get(k);
        if (prev !== undefined) {
          repeats++;
          minGap = Math.min(minGap, x.day - prev);
          if (x.day - prev < 90) within90++;
        }
        last.set(k, x.day);
      }
      return { decisions, repeats, within90, minGap: minGap === Infinity ? 'none' : minGap };
    };
    const sixty = range(60);
    const year = range(365);
    out.daily = {
      ...chartStats(sixty.decisions),
      exactRepeats60: sixty.repeats,
      minGapDays60: sixty.minGap,
      exactRepeatsYear: year.repeats,
      repeatsWithin90Year: year.within90,
      minGapDaysYear: year.minGap,
      sameCardsForEveryone: dailyItems(new Date(2026, 9, 20, 7)).every((d, i) => JSON.stringify(d) === JSON.stringify(dailyItems(new Date(2026, 9, 20, 22))[i])) ? 'yes' : 'no',
    };
    expect(out.daily.exactRepeatsYear).toBe(0);
    expect(out.daily.repeatsWithin90Year).toBe(0);
    expect(out.daily.distinctSpotTypes).toBeGreaterThanOrEqual(7);
    expect(out.daily.distinctSeats).toBeGreaterThanOrEqual(9);
    expect(out.daily.sameCardsForEveryone).toBe('yes');
  });

  it('weekly challenge: 12 weeks', () => {
    const ids: string[] = [];
    const rivers: string[] = [];
    for (let w = 0; w < 12; w++) {
      const { items } = weeklySet(new Date(2026, 9, 12 + w * 7, 9));
      for (const i of items) {
        ids.push(i.id);
        if (i.decision.kind === 'river') rivers.push(i.id);
      }
    }
    out.weekly = {
      items: ids.length,
      distinct: new Set(ids).size,
      repeats: ids.length - new Set(ids).size,
      rivers: rivers.length,
      distinctRivers: new Set(rivers).size,
    };
    expect(out.weekly.repeats).toBe(0);
    expect(out.weekly.distinctRivers).toBe(24);
  });

  it('scenarios: 30 hands in a row', () => {
    // The player taps "Up next" after each hand, one hand a day.
    const played = new Set<string>();
    const seq: string[] = [];
    for (let n = 0; n < 30; n++) {
      const now = START + n * DAY;
      const next = nextScenarios(played, { now, tableSize: 9 })[0];
      played.add(next);
      seq.push(next);
      markSeen([`s:${next}`], now);
    }
    const counts = new Map<string, number>();
    for (const s of seq) counts.set(s, (counts.get(s) ?? 0) + 1);
    const specs = seq.map((id) => findScenario(id)!);
    const bank = BANKED_SCENARIOS.map((id) => findScenario(id)!);
    out.scenarios = {
      distinctExisting: SCENARIOS.length + BANKED_SCENARIOS.length,
      handWritten: SCENARIOS.length,
      banked: BANKED_SCENARIOS.length,
      templates: scenarioTemplates().length,
      played: seq.length,
      distinctPlayed: new Set(seq).size,
      repeats: seq.length - new Set(seq).size,
      mostPlayedCount: Math.max(...counts.values()),
      boards: new Set(specs.map((s) => s.river.board)).size,
      seatPairs: new Set(specs.map((s) => `${s.hero.seat}-${s.villain.seat}`)).size,
      stacks: new Set(specs.map((s) => s.generated?.stackBb ?? 100)).size,
      bankSeatPairs: new Set(bank.map((s) => `${s.hero.seat}-${s.villain.seat}`)).size,
      bankTextures: new Set(bank.map((s) => flopTexture(parseCards(s.river.board).slice(0, 3)))).size,
      bankHeroHands: new Set(bank.map((s) => s.hero.cards)).size,
    };
    expect(out.scenarios.repeats).toBe(0);
    expect(out.scenarios.distinctExisting).toBeGreaterThanOrEqual(200);
    expect(out.scenarios.seatPairs).toBeGreaterThanOrEqual(15);
    expect(out.scenarios.bankTextures).toBe(6);
  });

  it('lesson replays and test outs', () => {
    const quizzes = LESSON_ENTRIES.flatMap((e) => quizSteps(e).map((step) => ({ e, step, quiz: e.content!.steps[step] as QuizStep })));
    const multi = quizzes.filter((q) => quizVersions(q.quiz).length > 1);
    let sameVersion = 0;
    let sameExact = 0;
    let checkSame = 0;
    let multiSame = 0;
    let n = 0;
    const trials = 20;
    for (const { e, step, quiz } of quizzes) {
      const versions = quizVersions(quiz).length;
      for (let t = 0; t < trials; t++) {
        // Two visits to the lesson in a row.
        const sa = dealQuizSeed(e.key, step);
        const sb = dealQuizSeed(e.key, step);
        const a = stepVersion(quiz, sa) as QuizStep;
        const b = stepVersion(quiz, sb) as QuizStep;
        if (versionIndex(e.key, step, sa) === versionIndex(e.key, step, sb)) {
          sameVersion++;
          if (versions > 1) multiSame++;
        }
        if (JSON.stringify(a) === JSON.stringify(b)) sameExact++;
        // Two tries at the skip ahead quiz.
        const c = quizAt(e.key, step, dealQuizSeed(e.key, step))!;
        const d = quizAt(e.key, step, dealQuizSeed(e.key, step))!;
        if (c.question === d.question && c.cards === d.cards) checkSame++;
        n++;
      }
    }
    const versions = quizzes.map((q) => quizVersions(q.quiz).length);
    out.lessons = {
      questions: quizzes.length,
      withVersions: multi.length,
      shareWithVersions: round(multi.length / quizzes.length),
      averageVersions: round(versions.reduce((a, b) => a + b, 0) / versions.length, 2),
      generatedVersions: quizzes.reduce((t, q) => t + (q.quiz.variants ?? []).filter((v) => v.generated).length, 0),
      replaySameQuestion: round(sameVersion / n),
      replaySameQuestionWhenVersionsExist: round(multiSame / Math.max(1, multi.length * trials)),
      replaySameExact: round(sameExact / n),
      testOutSameQuestion: round(checkSame / n),
    };
    expect(out.lessons.replaySameQuestionWhenVersionsExist).toBe(0);
    expect(out.lessons.withVersions).toBeGreaterThanOrEqual(135);
    expect(out.lessons.generatedVersions).toBeGreaterThanOrEqual(80);
  });
});
