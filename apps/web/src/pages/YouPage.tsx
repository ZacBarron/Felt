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
  heroStats,
  resultsAreNoise,
  skillEdge,
  stakesLabel,
  type TableAssumptions,
  tierLabel,
} from '@felt/core';
import { useLiveQuery } from 'dexie-react-hooks';
import { useState } from 'react';
import { Link } from 'react-router-dom';
import { haptic } from '../haptics';
import { db } from '../state/db';
import { DOMAIN_LABELS, ratingSnapshot, streakNow } from '../state/rating';
import { useSettings } from '../state/settings';
import { signed } from '../ui/format';
import { ChevronRightIcon, TargetIcon, LeagueIcon } from '../ui/icons';
import { AvatarPicker } from '../ui/Avatar';
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
          <span className="num">{r.games ? Math.round(r.rating) : 'Not rated'}</span>
        </span>
        <span className="domain-bar">
          <span style={{ width: r.games ? `${pct * 100}%` : 0, opacity: isProvisional(r) ? 0.45 : 1 }} />
        </span>
        <span className="footnote">
          {r.games
            ? `${tierLabel(r)}, ${r.games} ${r.games === 1 ? 'answer' : 'answers'}`
            : 'Answer questions in this area to get a rating'}
        </span>
      </span>
    </div>
  );
}

const assumptionFields = (currency: string): { key: keyof TableAssumptions; label: string; step: number }[] => [
  { key: 'poolRating', label: 'Average Felt Rating at your table', step: 25 },
  { key: 'edgeScale', label: 'Best possible edge before rake, in bb per 100 hands', step: 5 },
  { key: 'flopShare', label: 'Share of hands that see a flop', step: 0.05 },
  { key: 'flopPotBb', label: 'Average pot after the flop, in big blinds', step: 1 },
  { key: 'tipPerPot', label: `Tip per pot you win, in ${currency}`, step: 0.5 },
  { key: 'sd100', label: 'How much results swing, in bb per 100 hands', step: 5 },
  { key: 'handsPerHour', label: 'Hands per hour', step: 1 },
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
  // Only results from this game count: hands at this big blind online, and sessions at this big blind.
  const gameHands = g.venue === 'online' ? (imported?.cash ?? []).filter((h) => h.bb === g.stakes.bb) : [];
  const gameSessions = (imported?.sessions ?? []).filter((x) => (x.bb ?? g.stakes.bb) === g.stakes.bb);
  const handsSource = gameHands.length
    ? (() => {
        const st = heroStats(gameHands.map((h) => ({ ...h, date: h.at })));
        return { hands: st.hands, bb: st.netBb, sd: st.hands >= 1000 ? st.sd100 : undefined, label: `${st.hands.toLocaleString()} imported hands` };
      })()
    : undefined;
  const sessionHours = gameSessions.reduce((t, x) => t + x.hours, 0);
  const sessionSource = gameSessions.length
    ? {
        hands: Math.round(sessionHours * a.handsPerHour),
        bb: gameSessions.reduce((t, x) => t + x.profit / (x.bb ?? g.stakes.bb), 0),
        sd: undefined,
        label: `${gameSessions.length} imported ${gameSessions.length === 1 ? 'session' : 'sessions'} over ${Math.round(sessionHours)} hours`,
      }
    : undefined;
  // Use whichever source covers more hands; typed results only when nothing was imported.
  const source: { hands: number; bb: number; sd?: number; label: string } | undefined =
    [handsSource, sessionSource].filter(Boolean).sort((x, y) => y!.hands - x!.hands)[0] ??
    (results && results.hands > 0 ? { hands: results.hands, bb: results.profit / g.stakes.bb, label: 'the results you entered' } : undefined);
  const sd = source?.sd ?? a.sd100;
  const observed = source ? (source.bb / source.hands) * 100 : undefined;
  const blended = source && observed !== undefined ? blendWithResults(model, observed, source.hands, sd) : undefined;
  const per100Points = skillEdge(overall.rating + 100, a) - skillEdge(overall.rating, a);
  const best = blended ?? { ...model, weightOnResults: 0 };
  const perHour = (bb100: number) => formatAmount((bb100 * a.handsPerHour) / 100, g);
  const [lo, hi] = ratingInterval(overall);
  const rated = overall.games > 0;
  const provisional = isProvisional(overall);
  const next = provisional ? undefined : nextTier(overall.rating);
  // Personal best counts only settled ratings, so early swings do not set a record.
  const bestRating = Math.max(0, ...snap.history.filter((p) => p.rd <= 110).map((p) => p.rating));

  const setAssumption = (key: keyof TableAssumptions, value: number) =>
    update({ ...settings, assumptions: { ...settings.assumptions, [key]: value } });

  const share = async () => {
    const text = `My Felt Rating is ${Math.round(overall.rating)}${provisional ? ' and still settling' : `. My tier is ${tierLabel(overall)}`}.${streak?.streak ? ` I'm on a ${streak.streak} day streak.` : ''}`;
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
      <PageHeader title="You" subtitle="Your rating and what it is worth at the table" back={{ to: '/more', label: 'More' }} />

      <section className="you-profile">
        <AvatarPicker name={settings.profile.name} photo={settings.profile.photo} onPhoto={(photo) => update({ ...settings, profile: { ...settings.profile, photo } })} />
        <label className="you-name">
          <span className="footnote">Your name</span>
          <input
            value={settings.profile.name ?? ''}
            placeholder="Optional"
            maxLength={40}
            autoComplete="nickname"
            onChange={(e) => update({ ...settings, profile: { ...settings.profile, name: e.target.value || undefined } })}
          />
        </label>
      </section>

      <section className="hero you-hero">
        <div className="hero-label">Felt Rating</div>
        <div className="row" style={{ alignItems: 'baseline', gap: '0.6rem' }}>
          <span className="display num you-rating" aria-label={rated ? `${provisional ? 'About ' : ''}${Math.round(overall.rating)}` : 'Not rated yet'}>
            {rated ? shown : 'Not rated'}
          </span>
          {rated && <span className="pill pill-on-felt">{tierLabel(overall)}</span>}
        </div>
        <div className="hero-sub">
          {!rated
            ? 'Answer a few questions to get rated. The placement test or a daily challenge is the fastest way.'
            : provisional
              ? 'Your rating is still settling. You get a tier after a few dozen answers.'
              : `We are 95% sure your rating is between ${Math.round(lo)} and ${Math.round(hi)}.`}
        </div>
        {next && (
          <div className="tier-progress">
            <div className="row between">
              <span className="footnote on-felt">{tierLabel(overall)}</span>
              <span className="footnote on-felt num">
                {next.pointsAway} points to {next.name}
              </span>
            </div>
            <span className="tier-bar" role="progressbar" aria-label={`Progress to ${next.name}`} aria-valuemin={0} aria-valuemax={100} aria-valuenow={Math.round(next.progress * 100)}>
              <span style={{ width: `${next.progress * 100}%` }} />
            </span>
          </div>
        )}
        <Sparkline points={snap.history} />
        <div className="row" style={{ gap: '0.5rem', marginTop: '0.4rem' }}>
          <span className="pill pill-on-felt num">
            {overall.games} rated {overall.games === 1 ? 'answer' : 'answers'}
          </span>
          {bestRating > 0 && <span className="pill pill-on-felt num">Best ever {Math.round(bestRating)}</span>}
        </div>
        {rated && (
          <button className="btn btn-lg btn-block btn-hero" onClick={() => void share()} data-haptic="off">
            Share my rating
          </button>
        )}
      </section>

      <Link to="/league" className="card placement-card">
        <span className="placement-icon">
          <LeagueIcon size={22} />
        </span>
        <span className="grow">
          <span style={{ display: 'block', fontWeight: 650 }}>Weekly league</span>
          <span className="footnote">Compete with real players near your rating. Whoever gains the most this week ranks highest.</span>
        </span>
        <ChevronRightIcon size={16} className="chev" />
      </Link>

      <Link to="/practice" className="card placement-card">
        <span className="placement-icon">
          <TargetIcon size={22} />
        </span>
        <span className="grow">
          <span style={{ display: 'block', fontWeight: 650 }}>Practice at your level</span>
          <span className="footnote">Answer 10 decisions picked for your level. More of them come from your weakest area.</span>
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
        <div className="section-footer">Harder questions count for more. Getting a hard one right moves your rating the most.</div>
      </section>

      <section>
        <h2 className="section-title">
          Win rate at {stakesLabel(g.stakes)} {g.venue}
        </h2>
        <div className="card winrate-card">
          <div className="row between" style={{ alignItems: 'flex-end' }}>
            <div>
              <div className="footnote">{blended ? 'Our estimate, using your results too' : 'Our estimate from your rating'}</div>
              <div className="display num winrate-main">
                {signed(best.mean, 1)}
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
              Likely between {signed(best.mean - 1.96 * best.sd, 0)} and {signed(best.mean + 1.96 * best.sd, 0)} bb per 100 hands
            </span>
          </div>
          <div className="winrate-lines">
            <div className="row between">
              <span>
                Your skill edge before rake <span className="pill">Estimate</span>
              </span>
              <span className="num">{signed(model.edge, 1)}</span>
            </div>
            <div className="row between">
              <span>
                Rake you pay <span className="pill">Math</span>
              </span>
              <span className="num">{signed(-model.costs.rakePer100, 1)}</span>
            </div>
            {model.costs.tipsPer100 > 0 && (
              <div className="row between">
                <span>
                  Tips you pay <span className="pill">Math</span>
                </span>
                <span className="num">{signed(-model.costs.tipsPer100, 1)}</span>
              </div>
            )}
            <div className="row between muted">
              <span>An average player here</span>
              <span className="num">{signed(model.average, 1)}</span>
            </div>
          </div>
          <p className="footnote" style={{ margin: 0 }}>
            Rake and tips are plain math from your rake settings. Your edge is our estimate from comparing your rating with a typical table. Here, each 100
            rating points is worth about {signed(per100Points, 1)} bb per 100 hands. That is about {perHour(per100Points)} an hour. As your real results
            grow, they count for more.
            {blended && ` Right now they count for ${Math.round(blended.weightOnResults * 100)}%.`} bb/100 means big blinds won per 100 hands.
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
                <span className="footnote">Hand histories or a bankroll CSV file</span>
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
              <span className="grow">Profit in {g.stakes.currency}</span>
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
          {source && resultsAreNoise(source.hands, sd)
            ? 'You do not have enough results yet to show if you are winning. For now, the estimate leans on your rating. '
            : ''}
          Results alone need about {(Math.round(handsForPrecision(10, sd) / 1000) * 1000).toLocaleString()} hands to pin down your win rate. That is
          roughly {(Math.round(handsForPrecision(10, sd) / a.handsPerHour / 100) * 100).toLocaleString()} hours of play. So Felt combines your results
          with your rating.
        </div>
      </section>

      <section>
        <button className="list-row card assumptions-toggle" aria-expanded={showAssumptions} onClick={() => setShowAssumptions((s) => !s)}>
          <span className="grow">What the estimate assumes</span>
          <span className="footnote">{showAssumptions ? 'Hide' : 'Show and edit'}</span>
        </button>
        {showAssumptions && (
          <div className="list reveal" style={{ marginTop: '0.6rem' }}>
            {assumptionFields(g.stakes.currency).map((f) => (
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
          These starting numbers are our best guesses for your game. Change any of them if you know better. Rake is set in <Link to="/settings">Settings</Link>.
        </div>
      </section>
    </div>
  );
}
