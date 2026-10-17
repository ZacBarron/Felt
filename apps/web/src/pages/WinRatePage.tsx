import { handsForPrecision, resultsAreNoise, type TableAssumptions } from '@felt/core';
import { useState } from 'react';
import { Link } from 'react-router-dom';
import { useSettings } from '../state/settings';
import { useWinRate } from '../state/winrate';
import { signed } from '../ui/format';
import { ChevronRightIcon } from '../ui/icons';
import { PageHeader } from '../ui/PageHeader';
import { Section } from '../ui/Section';
import { gameSummary, rakeSummary } from './SettingsPage';
import './you.css';

const assumptionFields = (currency: string): { key: keyof TableAssumptions; label: string; step: number }[] => [
  { key: 'poolRating', label: 'Average Aced Rating at your table', step: 25 },
  { key: 'edgeScale', label: 'Best possible edge before rake, in bb per 100 hands', step: 5 },
  { key: 'flopShare', label: 'Share of hands that see a flop', step: 0.05 },
  { key: 'flopPotBb', label: 'Average pot after the flop, in big blinds', step: 1 },
  { key: 'tipPerPot', label: `Tip per pot you win, in ${currency}`, step: 0.5 },
  { key: 'sd100', label: 'How much results swing, in bb per 100 hands', step: 5 },
  { key: 'handsPerHour', label: 'Hands per hour', step: 1 },
];

/**
 * The win rate estimate in full: the game it is for, the number and how it
 * is built, your real results and the assumptions. You shows only the number.
 */
export function WinRatePage() {
  const { settings, update } = useSettings();
  const w = useWinRate();
  const [showAssumptions, setShowAssumptions] = useState(false);
  if (!w) return null;
  const { game: g, assumptions: a, model, blended, best, source, observed, sd, rated } = w;
  const results = settings.results;
  const setAssumption = (key: keyof TableAssumptions, value: number) => update({ ...settings, assumptions: { ...settings.assumptions, [key]: value } });

  return (
    <div className="stack" style={{ gap: '1.5rem' }}>
      <PageHeader title="Win rate" back={{ to: '/you', label: 'You' }} />

      <Section title="Your game" footer="The estimate is for this game. Set it to where you play.">
        <div className="list">
          <Link to="/settings/game" className="list-row">
            <span className="grow">Game</span>
            <span className="detail">{gameSummary(g)}</span>
            <ChevronRightIcon size={16} className="chev" />
          </Link>
          <Link to="/settings/rake" className="list-row">
            <span className="grow">Rake</span>
            <span className="detail num">{rakeSummary(g)}</span>
            <ChevronRightIcon size={16} className="chev" />
          </Link>
        </div>
      </Section>

      <Section
        title="Our estimate"
        info={
          <p>
            Rake and tips are plain math from your rake settings. Your edge is our estimate from comparing your rating with a typical table. Each 100
            rating points is worth about {signed(w.per100Points, 1)} bb per 100 hands here. That is about {w.perHour(w.per100Points)} an hour. As your
            real results grow, they count for more.
            {blended && ` Right now they count for ${Math.round(blended.weightOnResults * 100)}%.`} bb/100 means big blinds won per 100 hands.
          </p>
        }
      >
        {!rated ? (
          <div className="card winrate-card">
            <p style={{ margin: 0 }}>Your estimate needs a Aced Rating first.</p>
            <Link to="/daily" className="btn btn-primary" style={{ alignSelf: 'flex-start' }}>
              Play the daily challenge
            </Link>
          </div>
        ) : (
          <div className="card winrate-card">
            <div className="row between" style={{ alignItems: 'flex-end' }}>
              <div>
                <div className="footnote">{blended ? 'Using your rating and your results' : 'From your rating'}</div>
                <div className="display num winrate-main">
                  {signed(best.mean, 1)}
                  <span className="winrate-unit"> bb/100</span>
                </div>
              </div>
              <div className="num" style={{ textAlign: 'right', fontWeight: 650 }}>
                {w.perHour(best.mean)}
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
          </div>
        )}
      </Section>

      <Section
        title="Your results"
        info={
          <p>
            {source && resultsAreNoise(source.hands, sd) ? 'You do not have enough results yet to show if you are winning. For now, the estimate leans on your rating. ' : ''}
            Results alone need about {(Math.round(handsForPrecision(10, sd) / 1000) * 1000).toLocaleString()} hands to pin down your win rate. That is
            roughly {(Math.round(handsForPrecision(10, sd) / a.handsPerHour / 100) * 100).toLocaleString()} hours of play. So Aced combines your
            results with your rating.
          </p>
        }
      >
        {w.hasImports ? (
          <div className="list">
            <Link to="/import" className="list-row">
              <span className="grow">
                <span style={{ display: 'block', fontWeight: 600 }}>{observed !== undefined && `${observed >= 0 ? '+' : ''}${observed.toFixed(1)} bb/100`}</span>
                <span className="footnote">From {source?.label}</span>
              </span>
              <ChevronRightIcon size={16} className="chev" />
            </Link>
          </div>
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
      </Section>

      <section>
        <div className="list">
          <button className="list-row assumptions-toggle" aria-expanded={showAssumptions} onClick={() => setShowAssumptions((s) => !s)}>
            <span className="grow">What the estimate assumes</span>
            <span className="detail">{showAssumptions ? 'Hide' : 'Show'}</span>
          </button>
        </div>
        {showAssumptions && (
          <div className="list reveal" style={{ marginTop: '0.6rem' }}>
            {assumptionFields(g.stakes.currency).map((f) => (
              <label key={f.key} className="list-row">
                <span className="grow">{f.label}</span>
                <input className="you-input num" type="number" step={f.step} value={a[f.key]} onChange={(e) => setAssumption(f.key, Number(e.target.value))} />
              </label>
            ))}
            <button className="list-row" onClick={() => update({ ...settings, assumptions: undefined })}>
              <span className="grow" style={{ color: 'var(--tint)' }}>
                Reset to defaults
              </span>
            </button>
          </div>
        )}
        <div className="section-footer">Our best guesses for your game.</div>
      </section>
    </div>
  );
}
