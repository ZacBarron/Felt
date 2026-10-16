import { heroStats, openDeviations, openRates, resultsAreNoise, resultsHalfWidth, sessionTotals } from '@felt/core';
import { useLiveQuery } from 'dexie-react-hooks';
import { useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import { haptic } from '../haptics';
import { db } from '../state/db';
import {
  asHeroHand,
  chartIdForSeat,
  chartOpenFreq,
  chartOpenRate,
  clearImports,
  type HandImportSummary,
  importHandText,
  importSessionCsv,
} from '../state/imports';
import { addHandsToReview } from '../state/review';
import { useSettings } from '../state/settings';
import { ImportIcon, LogIcon } from '../ui/icons';
import { PageHeader } from '../ui/PageHeader';
import { Section } from '../ui/Section';
import { plural, signed } from '../ui/format';
import { Chips } from '../ui/Chips';
import './screens.css';

const pct = (x: number) => `${Math.round(x * 100)}%`;
const moneySymbol = (currency?: string) => ({ USD: '$', EUR: '€', GBP: '£' })[currency ?? ''] ?? (currency ? `${currency} ` : '');

function readFiles(files: FileList | null): Promise<string[]> {
  return Promise.all([...(files ?? [])].map((f) => f.text()));
}

export function ImportPage() {
  const { settings } = useSettings();
  const handInput = useRef<HTMLInputElement>(null);
  const csvInput = useRef<HTMLInputElement>(null);
  const [busy, setBusy] = useState(false);
  const [paste, setPaste] = useState('');
  const [handResult, setHandResult] = useState<HandImportSummary>();
  const [csvResult, setCsvResult] = useState<string>();
  const [drilled, setDrilled] = useState(false);
  const [stakeFilter, setStakeFilter] = useState('all');
  const hands = useLiveQuery(() => db.hands.toArray(), [], []);
  const sessions = useLiveQuery(() => db.sessions.toArray(), [], []);

  // Stats mix nothing across stakes unless asked: a filter by big blind size, all by default.
  const stakeOptions = [...new Set(hands.filter((h) => h.game === 'cash').map((h) => `${h.currency ?? ''}|${h.bb}`))]
    .map((k) => {
      const [currency, bb] = k.split('|');
      const n = Number(bb);
      return {
        value: k,
        label: `${moneySymbol(currency)}${n < 1 ? n.toFixed(2) : n} big blind`,
      };
    })
    .sort((a, b) => Number(a.value.split('|')[1]) - Number(b.value.split('|')[1]));
  const stake = stakeFilter && stakeOptions.some((o) => o.value === stakeFilter) ? stakeFilter : 'all';
  const cash = hands.filter((h) => h.game === 'cash' && (stake === 'all' || `${h.currency ?? ''}|${h.bb}` === stake)).map(asHeroHand);
  const stats = cash.length ? heroStats(cash) : undefined;
  const leaks = openDeviations(cash, chartOpenFreq);
  const rates = openRates(cash);
  const totals = sessions.length ? sessionTotals(sessions) : undefined;
  const sd = stats?.sd100 ?? 100;
  const half = stats ? resultsHalfWidth(stats.hands, sd) : Infinity;

  const importHands = async (texts: string[]) => {
    setBusy(true);
    let sum: HandImportSummary = {
      added: 0,
      duplicates: 0,
      noHero: 0,
      errors: 0,
    };
    for (const t of texts) {
      const r = await importHandText(t);
      sum = {
        added: sum.added + r.added,
        duplicates: sum.duplicates + r.duplicates,
        noHero: sum.noHero + r.noHero,
        errors: sum.errors + r.errors,
      };
    }
    setHandResult(sum);
    setBusy(false);
    haptic(sum.added ? 'success' : 'warning');
  };

  const importCsv = async (texts: string[]) => {
    setBusy(true);
    const parts: string[] = [];
    for (const t of texts) {
      const r = await importSessionCsv(t);
      parts.push(
        r.sessions.length
          ? [
              `Found ${plural(r.sessions.length, 'session')}.`,
              r.tournaments ? `We left out ${plural(r.tournaments, 'tournament')}.` : '',
              r.skipped ? `We skipped ${plural(r.skipped, 'row')} we could not read.` : '',
              `Length came from the ${r.columns.hours} column.`,
              r.columns.profit ? `Results came from the ${r.columns.profit} column.` : `Results are ${r.columns.cashOut} minus ${r.columns.buyIn}.`,
            ]
              .filter(Boolean)
              .join(' ')
          : 'We did not find any sessions. Your file needs a column for how long you played, like Hours. It also needs a result column, like Profit, or Buy in and Cash out columns.',
      );
    }
    setCsvResult(parts.join(' '));
    setBusy(false);
    haptic('success');
  };

  const drillLeaks = async () => {
    await addHandsToReview(
      leaks.slice(0, 50).flatMap((l) => {
        const chartId = chartIdForSeat(l.seat);
        return chartId ? [{ chartId, hand: l.hand }] : [];
      }),
    );
    setDrilled(true);
    haptic('success');
  };

  return (
    <div className="stack" style={{ gap: '1.5rem' }}>
      <PageHeader title="Import" back={{ to: '/you', label: 'You' }} />

      <Section
        info={
          <>
            <p>Suited reads hand history files from PokerStars, GGPoker or any site with the same format. It uses your preflop decisions and results.</p>
            <p style={{ marginTop: '0.5rem' }}>
              <strong>Using PokerTracker 4 or Holdem Manager 3?</strong> Suited cannot open their databases. Export your hands as PokerStars hand histories. Then
              import those files here.
            </p>
          </>
        }
        title="Hand histories"
      >
        <div className="card sc-import">
          <div className="sc-import-head">
            <span className="sc-icon-tile" aria-hidden="true">
              <ImportIcon size={22} />
            </span>
            <span className="grow">
              <span className="sc-import-title">PokerStars or GGPoker files</span>
              <span className="footnote">Your hands stay on this device.</span>
            </span>
          </div>
          <input
            ref={handInput}
            type="file"
            accept=".txt,text/plain"
            multiple
            hidden
            onChange={async (e) => {
              await importHands(await readFiles(e.target.files));
              e.target.value = '';
            }}
          />
          <button className="btn btn-primary" disabled={busy} onClick={() => handInput.current?.click()}>
            Choose hand history files
          </button>
          <details className="import-details">
            <summary>Or paste hands</summary>
            <textarea
              className="saved-note-input"
              aria-label="Paste hand histories"
              rows={5}
              value={paste}
              onChange={(e) => setPaste(e.target.value)}
              placeholder="PokerStars Hand #..."
            />
            <button
              className="btn"
              disabled={busy || !paste.trim()}
              onClick={async () => {
                await importHands([paste]);
                setPaste('');
              }}
            >
              Import pasted hands
            </button>
          </details>
          {handResult && (
            <div className={`explain ${handResult.added ? 'good' : 'bad'} reveal`} role="status">
              <strong>{plural(handResult.added, 'hand')} added.</strong>
              {handResult.duplicates > 0 && ` ${plural(handResult.duplicates, 'hand was', 'hands were')} already imported.`}
              {handResult.noHero > 0 &&
                ` ${plural(handResult.noHero, 'hand')} did not show your hole cards and ${handResult.noHero === 1 ? 'was' : 'were'} skipped.`}
              {handResult.errors > 0 && ` ${plural(handResult.errors, 'hand')} could not be read.`}
            </div>
          )}
        </div>
      </Section>

      {stats && (
        <div className="stack" style={{ gap: '1.5rem' }}>
          {stakeOptions.length > 1 && (
            <div style={{ marginBottom: '-0.6rem' }}>
              <Chips value={stake} onChange={setStakeFilter} ariaLabel="Stakes" options={[{ value: 'all', label: 'All stakes' }, ...stakeOptions]} />
            </div>
          )}
          <Section
            title={`Cash results, ${plural(stats.hands, 'hand')}`}
            info={
              <p>
                VPIP is how often you put money in before the flop. PFR is how often you raised. WTSD is how often you went to showdown after seeing a flop.
                Flop c-bet counts your bets after raising preflop when it was checked to you ({plural(stats.cbetChances, 'chance')}). Fold to 3bet counts folds
                after you raised and someone 3bet ({plural(stats.foldTo3betChances, 'chance')}). Aggression is your bets and raises per call after the flop.
                Small samples swing a lot.
              </p>
            }
          >
            <div className="card stack" style={{ padding: '1rem', gap: '0.7rem' }}>
              <div>
                <div className="display num winrate-main">
                  {signed(stats.bbPer100, 1)}
                  <span className="winrate-unit"> bb/100</span>
                </div>
                {stats.sd100 !== undefined && (
                  <div className="footnote num">
                    Your real win rate is likely between {signed(stats.bbPer100 - half, 0)} and {signed(stats.bbPer100 + half, 0)} bb/100.
                  </div>
                )}
              </div>
              {resultsAreNoise(stats.hands, sd) && (
                <div className="explain">
                  <strong>It is too early to tell.</strong> This many hands cannot show whether you are winning. The range narrows to about 10 bb per 100 hands
                  either way at {(Math.round((100 * (1.96 * sd) ** 2) / 100 / 1000) * 1000).toLocaleString()} hands.
                </div>
              )}
              <div className="import-stats">
                <div>
                  <span className="num">{pct(stats.vpip)}</span>
                  <span className="footnote">VPIP</span>
                </div>
                <div>
                  <span className="num">{pct(stats.pfr)}</span>
                  <span className="footnote">PFR</span>
                </div>
                <div>
                  <span className="num">{pct(stats.threeBet)}</span>
                  <span className="footnote">3bet</span>
                </div>
                <div>
                  <span className="num">{pct(stats.wtsd)}</span>
                  <span className="footnote">WTSD</span>
                </div>
                <div>
                  <span className={`num${stats.cbetChances ? '' : ' sc-none'}`}>{stats.cbetChances ? pct(stats.cbet) : 'None yet'}</span>
                  <span className="footnote">Flop c-bet</span>
                </div>
                <div>
                  <span className={`num${stats.foldTo3betChances ? '' : ' sc-none'}`}>{stats.foldTo3betChances ? pct(stats.foldTo3bet) : 'None yet'}</span>
                  <span className="footnote">Fold to 3bet</span>
                </div>
                <div>
                  <span className={`num${stats.aggression !== undefined ? '' : ' sc-none'}`}>
                    {stats.aggression !== undefined ? stats.aggression.toFixed(1) : 'None yet'}
                  </span>
                  <span className="footnote">Aggression</span>
                </div>
                <div>
                  <span className={`num${stats.wtsd > 0 ? '' : ' sc-none'}`}>{stats.wtsd > 0 ? pct(stats.wsd) : 'None yet'}</span>
                  <span className="footnote">Won at showdown</span>
                </div>
              </div>
            </div>
          </Section>
          <Section
            title="Win rate by seat"
            info={<p>In bb per 100 hands. The blinds lose money for everyone. Compare them with each other, not with the button.</p>}
          >
            <div className="list">
              {stats.byPosition.map((p) => (
                <div key={p.position} className="list-row stat-row">
                  <span className="grow" style={{ fontWeight: 600 }}>
                    {p.position}
                  </span>
                  <span className="footnote num stat-col">{plural(p.hands, 'hand')}</span>
                  <span className="footnote num stat-col">VPIP {pct(p.vpip)}</span>
                  <span
                    className="num stat-col"
                    style={{
                      color: p.bbPer100 >= 0 ? 'var(--green-text)' : 'var(--red-text)',
                    }}
                  >
                    {signed(p.bbPer100, 0)}
                  </span>
                </div>
              ))}
            </div>
          </Section>
        </div>
      )}

      {rates.length > 0 && (
        <Section
          title="How often you open, by seat"
          info={
            <p>
              We match seats by how many players act after you. So your 6-max cutoff is compared with the 9-handed cutoff chart. Only cash hands with 60bb or
              more and no straddle count. We flag a seat only when the chart is clearly outside your likely range.
            </p>
          }
        >
          <div className="list">
            {rates.map((r) => {
              const chart = chartOpenRate(r.seat) ?? 0;
              const off = chart < r.low || chart > r.high;
              return (
                <div key={r.seat} className="list-row stat-row">
                  <span className="grow">
                    <span style={{ fontWeight: 600 }}>{r.seat}</span>
                    <span className="footnote" style={{ display: 'block' }}>
                      Chart opens {pct(chart)}
                    </span>
                  </span>
                  <span className="stat-col" style={{ textAlign: 'right' }}>
                    <span className="num" style={{ display: 'block' }}>
                      {pct(r.rate)}
                    </span>
                    <span className="caption num">{plural(r.chances, 'chance')}</span>
                  </span>
                  <span className={`pill ${off ? 'pill-warn' : 'pill-good'}`}>{off ? (r.rate > chart ? 'Loose' : 'Tight') : 'On target'}</span>
                </div>
              );
            })}
          </div>
        </Section>
      )}

      {stats && (
        <Section
          title="Hands the chart plays differently"
          footer="Compared with Suited's approximate starter charts."
          info={
            <p>
              The starter charts assume a 2.5bb open. We only list clear differences. That means opening a hand the chart never opens, or folding one it always
              opens. Anything the chart does some of the time counts as part of the mix. Small blind limps are a fine strategy, so we leave them out.
            </p>
          }
        >
          {leaks.length === 0 ? (
            <div className="card" style={{ padding: '1rem' }}>
              <p className="import-copy" style={{ margin: 0 }}>
                No differences found. Every open and fold matched the chart or was part of the mix.
              </p>
            </div>
          ) : (
            <>
              <div className="list">
                {leaks.slice(0, 12).map((l) => (
                  <div key={`${l.seat}:${l.hand}:${l.kind}`} className="list-row">
                    <span className="grow">
                      <span style={{ fontWeight: 650 }}>
                        {l.hand} from {l.seat}
                      </span>
                      <span className="footnote" style={{ display: 'block' }}>
                        {l.kind === 'limp'
                          ? 'You limped. Chart raises or folds'
                          : `You ${l.kind === 'too loose' ? 'opened' : 'folded'}. Chart opens ${pct(l.chartRaise)}`}
                      </span>
                    </span>
                    <span className={`pill ${l.kind === 'too tight' ? 'pill-tint' : 'pill-warn'}`}>{plural(l.count, 'time')}</span>
                  </div>
                ))}
              </div>
              <button
                className="btn btn-tinted btn-block"
                style={{ marginTop: '0.75rem' }}
                disabled={drilled}
                onClick={() => void drillLeaks()}
                data-haptic="off"
              >
                {drilled ? 'Added to your review' : `Add ${plural(Math.min(leaks.length, 50), 'hand')} to your review`}
              </button>
            </>
          )}
        </Section>
      )}

      <Section
        title="Live sessions"
        info={
          <p>Use a CSV file from a bankroll app or spreadsheet. It needs a date, how long you played and your result. Buy in and cash out columns work too.</p>
        }
        footer={
          <>
            Your results feed the win rate on the <Link to="/you">You</Link> page.
          </>
        }
      >
        <div className="card sc-import">
          <div className="sc-import-head">
            <span className="sc-icon-tile" aria-hidden="true">
              <LogIcon size={22} />
            </span>
            <span className="grow">
              <span className="sc-import-title">Bankroll app or spreadsheet</span>
              <span className="footnote">A CSV file with hours and results</span>
            </span>
          </div>
          <input
            ref={csvInput}
            type="file"
            accept=".csv,text/csv,.tsv,text/tab-separated-values"
            multiple
            hidden
            onChange={async (e) => {
              await importCsv(await readFiles(e.target.files));
              e.target.value = '';
            }}
          />
          <button className="btn btn-tinted" disabled={busy} onClick={() => csvInput.current?.click()}>
            Choose a CSV file
          </button>
          {csvResult && (
            <div className="explain good reveal" role="status">
              {csvResult}
            </div>
          )}
          {totals && (
            <div className="import-stats">
              <div>
                <span className="num">{totals.sessions}</span>
                <span className="footnote">Sessions</span>
              </div>
              <div>
                <span className="num">{Math.round(totals.hours)}</span>
                <span className="footnote">Hours</span>
              </div>
              <div>
                <span className="num">{signed(Math.round(totals.profit), 0)}</span>
                <span className="footnote">Profit ({settings.game.stakes.currency})</span>
              </div>
              <div>
                <span className="num">{signed(totals.perHour, 0)}</span>
                <span className="footnote">Per hour</span>
              </div>
            </div>
          )}
        </div>
      </Section>

      {(hands.length > 0 || sessions.length > 0) && (
        <button
          className="btn btn-block"
          style={{ color: 'var(--red-text)' }}
          onClick={async () => {
            if (!window.confirm('Remove all imported hands and sessions from this device?')) return;
            await clearImports();
            setHandResult(undefined);
            setCsvResult(undefined);
          }}
        >
          Remove all imported hands and sessions
        </button>
      )}
    </div>
  );
}
