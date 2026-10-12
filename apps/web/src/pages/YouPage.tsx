import {
  blendWithResults,
  currentRating,
  defaultAssumptions,
  estimateWinRate,
  formatAmount,
  handsForPrecision,
  isProvisional,
  nextTier,
  ratingInterval,
  SKILL_DOMAINS,
  type SkillRating,
  sessionTotals,
  stakesLabel,
  type TableAssumptions,
  tierFor,
} from '@felt/core';
import { useLiveQuery } from 'dexie-react-hooks';
import { useState } from 'react';
import { Link } from 'react-router-dom';
import { haptic } from '../haptics';
import { db } from '../state/db';
import { DOMAIN_LABELS, ratingSnapshot, streakNow } from '../state/rating';
import { useSettings } from '../state/settings';
import { ChevronRightIcon, FlameIcon, TargetIcon } from '../ui/icons';
import { PageHeader } from '../ui/PageHeader';
import { useCountUp } from '../ui/useCountUp';

function Sparkline({ points }: { points: { rating: number; rd: number }[] }) {
  if (points.length < 2) return null;
  const pts = points.slice(-200);
  const lo = Math.min(...pts.map((p) => p.rating - p.rd * 0.5));
  const hi = Math.max(...pts.map((p) => p.rating + p.rd * 0.5));
  const w = 320;
  const h = 70;
  const x = (i: number) => (i / (pts.length - 1)) * w;
  const y = (r: number) => h - ((r - lo) / Math.max(1, hi - lo)) * h;
  const line = pts.map((p, i) => `${i ? 'L' : 'M'}${x(i).toFixed(1)},${y(p.rating).toFixed(1)}`).join(' ');
  const band =
    pts.map((p, i) => `${i ? 'L' : 'M'}${x(i).toFixed(1)},${y(p.rating + p.rd * 0.5).toFixed(1)}`).join(' ') +
    ' ' +
    [...pts]
      .reverse()
      .map((p, i) => `L${x(pts.length - 1 - i).toFixed(1)},${y(p.rating - p.rd * 0.5).toFixed(1)}`)
      .join(' ') +
    ' Z';
  return (
    <svg className="sparkline" viewBox={`0 0 ${w} ${h}`} preserveAspectRatio="none" aria-hidden="true">
      <path d={band} className="band" />
      <path d={line} className="line" />
    </svg>
  );
}

function DomainRow({ label, r }: { label: string; r: SkillRating }) {
  const pct = Math.max(0.04, Math.min(1, (r.rating - 800) / 1400));
  return (
    <div className="list-row domain-row">
      <span className="grow" style={{ minWidth: 0 }}>
        <span className="row between">
          <span style={{ fontWeight: 600 }}>{label}</span>
          <span className="num">{r.games ? `${Math.round(r.rating)}${isProvisional(r) ? '?' : ''}` : 'Not rated'}</span>
        </span>
        <span className="domain-bar">
          <span style={{ width: `${pct * 100}%`, opacity: isProvisional(r) ? 0.45 : 1 }} />
        </span>
        <span className="footnote">
          {r.games ? `${tierFor(r.rating)}, ${r.games} ${r.games === 1 ? 'answer' : 'answers'}${isProvisional(r) ? ', provisional' : ''}` : 'Answer questions in this area to get a rating'}
        </span>
      </span>
    </div>
  );
}

const ASSUMPTION_FIELDS: { key: keyof TableAssumptions; label: string; step: number }[] = [
  { key: 'poolRating', label: 'Average rating of your table', step: 25 },
  { key: 'edgeScale', label: 'Edge scale (bb/100)', step: 5 },
  { key: 'flopShare', label: 'Share of hands that see a flop', step: 0.05 },
  { key: 'flopPotBb', label: 'Average pot when there is a flop (bb)', step: 1 },
  { key: 'tipPerPot', label: 'Tip per pot won (money)', step: 0.5 },
  { key: 'sd100', label: 'Standard deviation (bb/100)', step: 5 },
  { key: 'handsPerHour', label: 'Hands per hour', step: 5 },
];

export function YouPage() {
  const { settings, update } = useSettings();
  const g = settings.game;
  const snap = useLiveQuery(ratingSnapshot, []);
  const imported = useLiveQuery(async () => {
    const cash = (await db.hands.where('game').equals('cash').toArray()).filter((h) => h.netBb !== undefined);
    const sessions = await db.sessions.toArray();
    return { cash, sessions };
  }, []);
  const streak = useLiveQuery(() => streakNow(), []);
  const [showAssumptions, setShowAssumptions] = useState(false);
  const overall = snap ? currentRating(snap.overall) : undefined;
  const shown = Math.round(useCountUp(overall?.rating ?? 0));

  if (!snap || !overall) return null;

  const a: TableAssumptions = { ...defaultAssumptions(g), ...settings.assumptions };
  const model = estimateWinRate(overall.rating, overall.rd, g, a);
  const results = settings.results;
  // Results come from imported hands first, then imported live sessions, then what the player typed.
  const source: { hands: number; bb: number; label: string } | undefined = imported?.cash.length
    ? { hands: imported.cash.length, bb: imported.cash.reduce((t, h) => t + h.netBb, 0), label: `${imported.cash.length.toLocaleString()} imported hands` }
    : imported?.sessions.length
      ? (() => {
          const t = sessionTotals(imported.sessions);
          return {
            hands: Math.round(t.hours * a.handsPerHour),
            bb: t.profit / g.stakes.bb,
            label: `${t.sessions} imported sessions, ${Math.round(t.hours)} hours at about ${a.handsPerHour} hands an hour`,
          };
        })()
      : results && results.hands > 0
        ? { hands: results.hands, bb: results.profit / g.stakes.bb, label: 'the results you entered' }
        : undefined;
  const observed = source ? (source.bb / source.hands) * 100 : undefined;
  const blended = source && observed !== undefined ? blendWithResults(model, observed, source.hands, a.sd100) : undefined;
  const best = blended ?? { ...model, weightOnResults: 0 };
  const perHour = (bb100: number) => formatAmount((bb100 * a.handsPerHour) / 100, g);
  const [lo, hi] = ratingInterval(overall);
  const rated = overall.games > 0;
  const next = nextTier(overall.rating);
  // Personal best counts only settled ratings, so early swings do not set a record.
  const bestRating = Math.max(0, ...snap.history.filter((p) => p.rd <= 110).map((p) => p.rating));

  const setAssumption = (key: keyof TableAssumptions, value: number) =>
    update({ ...settings, assumptions: { ...settings.assumptions, [key]: value } });

  const share = async () => {
    const text = `My Felt Rating is ${Math.round(overall.rating)} (${tierFor(overall.rating)})${streak?.streak ? `, ${streak.streak} day streak` : ''}.`;
    try {
      if (navigator.share) await navigator.share({ text: `${text}\n${location.origin}` });
      else await navigator.clipboard.writeText(`${text}\n${location.origin}`);
      haptic('success');
    } catch {
      // Share dismissed.
    }
  };

  return (
    <div className="stack" style={{ gap: '1.5rem' }}>
      <PageHeader title="You" subtitle="Your rating, your strengths, and what they are worth at the table" />

      <section className="hero you-hero">
        <div className="hero-label">Felt Rating</div>
        <div className="row" style={{ alignItems: 'baseline', gap: '0.6rem' }}>
          <span className="display num you-rating">{rated ? shown : '?'}</span>
          {rated && isProvisional(overall) && <span className="pill pill-on-felt">Provisional</span>}
        </div>
        <div className="hero-sub">
          {rated
            ? `${tierFor(overall.rating)}. 95% sure your true rating is between ${Math.round(lo)} and ${Math.round(hi)}.`
            : 'Answer a few questions to get rated. The placement test or a daily challenge is the fastest way.'}
        </div>
        {rated && next && (
          <div className="tier-progress">
            <div className="row between">
              <span className="footnote on-felt">{tierFor(overall.rating)}</span>
              <span className="footnote on-felt num">
                {next.pointsAway} to {next.name}
              </span>
            </div>
            <span className="tier-bar">
              <span style={{ width: `${next.progress * 100}%` }} />
            </span>
          </div>
        )}
        <Sparkline points={snap.history} />
        <div className="row" style={{ gap: '0.5rem', marginTop: '0.4rem' }}>
          {!!streak?.streak && (
            <span className="pill pill-on-felt">
              <FlameIcon size={12} /> {streak.streak} {streak.streak === 1 ? 'day' : 'days'}{streak.bank ? `, ${streak.bank} freeze${streak.bank > 1 ? 's' : ''}` : ''}
            </span>
          )}
          <span className="pill pill-on-felt num">
            {overall.games} rated {overall.games === 1 ? 'answer' : 'answers'}
          </span>
          {bestRating > 0 && <span className="pill pill-on-felt num">Best {Math.round(bestRating)}</span>}
        </div>
        {rated && (
          <button className="btn btn-lg btn-block btn-hero" onClick={() => void share()} data-haptic="off">
            Share my rating
          </button>
        )}
      </section>

      <Link to="/practice" className="card placement-card">
        <span className="placement-icon">
          <TargetIcon size={22} />
        </span>
        <span className="grow">
          <span style={{ display: 'block', fontWeight: 650 }}>Practice at your level</span>
          <span className="footnote">Ten decisions you should get right about 80% of the time, more from your weakest area.</span>
        </span>
        <ChevronRightIcon size={16} className="chev" />
      </Link>

      <section>
        <h2 className="section-title">By area</h2>
        <div className="list">
          {SKILL_DOMAINS.map((d) => (
            <DomainRow key={d} label={DOMAIN_LABELS[d]} r={currentRating(snap.domains[d])} />
          ))}
        </div>
        <div className="section-footer">Every graded answer is a game against an item of known difficulty, so harder questions move the rating more.</div>
      </section>

      <section>
        <h2 className="section-title">
          Win rate at {stakesLabel(g.stakes)} {g.venue}
        </h2>
        <div className="card winrate-card">
          <div className="row between" style={{ alignItems: 'flex-end' }}>
            <div>
              <div className="footnote">{blended ? 'Model and your results' : 'Expected from your rating'}</div>
              <div className="display num winrate-main">
                {best.mean >= 0 ? '+' : ''}
                {best.mean.toFixed(1)}
                <span className="winrate-unit"> bb/100</span>
              </div>
            </div>
            <div className="num" style={{ textAlign: 'right', fontWeight: 650 }}>
              {perHour(best.mean)}
              <div className="footnote">per hour</div>
            </div>
          </div>
          <div className="winrate-range">
            <span className="footnote num">
              95% range {(best.mean - 1.96 * best.sd).toFixed(0)} to {(best.mean + 1.96 * best.sd).toFixed(0)} bb/100
            </span>
          </div>
          <div className="winrate-lines">
            <div className="row between">
              <span>Your edge over the table, before costs</span>
              <span className="num">{model.edge >= 0 ? '+' : ''}{model.edge.toFixed(1)}</span>
            </div>
            <div className="row between">
              <span>Rake you pay</span>
              <span className="num">−{model.costs.rakePer100.toFixed(1)}</span>
            </div>
            {model.costs.tipsPer100 > 0 && (
              <div className="row between">
                <span>Tips</span>
                <span className="num">−{model.costs.tipsPer100.toFixed(1)}</span>
              </div>
            )}
            <div className="row between muted">
              <span>An average player here</span>
              <span className="num">{model.average.toFixed(1)}</span>
            </div>
          </div>
          <p className="footnote" style={{ margin: 0 }}>
            The rake and tips lines are arithmetic from your rake settings. The edge is a model: it compares your rating with an assumed table
            average, and your logged results take over as they grow.
            {blended && ` Your results carry ${Math.round(blended.weightOnResults * 100)}% of the weight now.`}
          </p>
        </div>
      </section>

      <section>
        <h2 className="section-title">Your results</h2>
        {imported && (imported.cash.length > 0 || imported.sessions.length > 0) ? (
          <Link to="/import" className="list-row card">
            <span className="grow">
              <span style={{ display: 'block', fontWeight: 600 }}>
                {observed !== undefined && `${observed >= 0 ? '+' : ''}${observed.toFixed(1)} bb/100`}
              </span>
              <span className="footnote">From {source?.label}</span>
            </span>
            <ChevronRightIcon size={16} className="chev" />
          </Link>
        ) : (
          <div className="list">
            <Link to="/import" className="list-row">
              <span className="grow">
                <span style={{ display: 'block', fontWeight: 600, color: 'var(--tint)' }}>Import hands or sessions</span>
                <span className="footnote">Hand histories, tracker exports or a bankroll CSV</span>
              </span>
              <ChevronRightIcon size={16} className="chev" />
            </Link>
            <label className="list-row">
              <span className="grow">Or enter hands played</span>
              <input
                className="you-input num"
                type="number"
                inputMode="numeric"
                value={results?.hands ?? ''}
                placeholder="0"
                onChange={(e) => update({ ...settings, results: { hands: Number(e.target.value) || 0, profit: results?.profit ?? 0 } })}
              />
            </label>
            <label className="list-row">
              <span className="grow">Profit ({g.stakes.currency})</span>
              <input
                className="you-input num"
                type="number"
                inputMode="decimal"
                value={results?.profit ?? ''}
                placeholder="0"
                onChange={(e) => update({ ...settings, results: { hands: results?.hands ?? 0, profit: Number(e.target.value) || 0 } })}
              />
            </label>
          </div>
        )}
        <div className="section-footer">
          {source && source.hands < 1500
            ? `Only about ${source.hands.toLocaleString()} hands so far. Under about 1,500 hands results are mostly luck, so your rating carries most of the estimate. `
            : ''}
          Results alone need about {Math.round(handsForPrecision(5, a.sd100) / 1000)}k hands to pin a win rate within 5 bb/100, which is why Felt
          combines them with your rating.
        </div>
      </section>

      <section>
        <button className="list-row card assumptions-toggle" aria-expanded={showAssumptions} onClick={() => setShowAssumptions((s) => !s)}>
          <span className="grow">Model assumptions</span>
          <span className="footnote">{showAssumptions ? 'Hide' : 'Show and edit'}</span>
        </button>
        {showAssumptions && (
          <div className="list reveal" style={{ marginTop: '0.6rem' }}>
            {ASSUMPTION_FIELDS.map((f) => (
              <label key={f.key} className="list-row">
                <span className="grow">{f.label}</span>
                <input
                  className="you-input num"
                  type="number"
                  step={f.step}
                  value={a[f.key]}
                  onChange={(e) => setAssumption(f.key, Number(e.target.value))}
                />
              </label>
            ))}
            <button className="list-row" onClick={() => update({ ...settings, assumptions: undefined })}>
              <span className="grow" style={{ color: 'var(--tint)' }}>
                Reset to defaults
              </span>
            </button>
          </div>
        )}
        <div className="section-footer">
          Defaults are Felt’s starting estimates for your game, not measurements. See <Link to="/settings">Settings</Link> for the rake rules.
        </div>
      </section>
    </div>
  );
}
