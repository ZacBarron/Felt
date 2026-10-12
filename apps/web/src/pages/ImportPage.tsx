import { createScheduler, heroStats, openDeviations, openRates, RECALL_TARGET_MS, resultsAreNoise, resultsHalfWidth, sessionTotals } from '@felt/core';
import { useLiveQuery } from 'dexie-react-hooks';
import { useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import { haptic } from '../haptics';
import { db } from '../state/db';
import { asHeroHand, chartIdForSeat, chartOpenFreq, chartOpenRate, clearImports, type HandImportSummary, importHandText, importSessionCsv } from '../state/imports';
import { useSettings } from '../state/settings';
import { PageHeader } from '../ui/PageHeader';
import { plural, signed } from '../ui/format';

const pct = (x: number) => `${Math.round(x * 100)}%`;

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
  const hands = useLiveQuery(() => db.hands.toArray(), [], []);
  const sessions = useLiveQuery(() => db.sessions.toArray(), [], []);

  const cash = hands.filter((h) => h.game === 'cash').map(asHeroHand);
  const stats = cash.length ? heroStats(cash) : undefined;
  const leaks = openDeviations(cash, chartOpenFreq);
  const rates = openRates(cash);
  const totals = sessions.length ? sessionTotals(sessions) : undefined;
  const sd = stats?.sd100 ?? 100;
  const half = stats ? resultsHalfWidth(stats.hands, sd) : Infinity;

  const importHands = async (texts: string[]) => {
    setBusy(true);
    let sum: HandImportSummary = { added: 0, duplicates: 0, noHero: 0, errors: 0 };
    for (const t of texts) {
      const r = await importHandText(t);
      sum = { added: sum.added + r.added, duplicates: sum.duplicates + r.duplicates, noHero: sum.noHero + r.noHero, errors: sum.errors + r.errors };
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
          ? `${plural(r.sessions.length, 'session')} read${r.tournaments ? `, ${plural(r.tournaments, 'tournament')} left out` : ''}${r.skipped ? `, ${plural(r.skipped, 'row')} skipped` : ''}. Length from “${r.columns.hours}”, result from “${r.columns.profit ?? `${r.columns.cashOut} minus ${r.columns.buyIn}`}”.`
          : 'No sessions found. Felt needs a column for session length (hours, duration or minutes) and one for the result (profit, net, result, or buy in and cash out).',
      );
    }
    setCsvResult(parts.join(' '));
    setBusy(false);
    haptic('success');
  };

  const drillLeaks = async () => {
    const scheduler = createScheduler();
    const now = new Date();
    for (const l of leaks.slice(0, 50)) {
      const chartId = chartIdForSeat(l.seat);
      if (!chartId) continue;
      const id = `recall:${chartId}:${l.hand}`;
      if (await db.cards.get(id)) {
        await db.cards.update(id, { due: now });
        continue;
      }
      await db.cards.put({ id, chartId, mode: 'quick', hand: l.hand, targetMs: RECALL_TARGET_MS, fsrs: scheduler.newCard(now), due: now, createdAt: now });
    }
    setDrilled(true);
    haptic('success');
  };

  return (
    <div className="stack" style={{ gap: '1.5rem' }}>
      <PageHeader title="Import" subtitle="Bring in your real hands and sessions" back={{ to: '/more', label: 'More' }} />

      <section>
        <h2 className="section-title">Hand histories</h2>
        <div className="card stack import-card">
          <p className="import-copy">
            Import hand history text files from PokerStars, GGPoker and sites that use the same format. Felt reads your seat, results and preflop
            decisions. Everything stays on this device.
          </p>
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
              {handResult.noHero > 0 && ` ${plural(handResult.noHero, 'hand')} did not show your hole cards and ${handResult.noHero === 1 ? 'was' : 'were'} skipped.`}
              {handResult.errors > 0 && ` ${plural(handResult.errors, 'hand')} could not be read.`}
            </div>
          )}
        </div>
        <div className="section-footer">
          <strong>PokerTracker 4 or Holdem Manager 3:</strong> Felt cannot open their databases, which live on your computer. Export your hands from the
          tracker as hand history text (PokerStars format), then import the files here.
        </div>
      </section>

      {stats && (
        <section>
          <h2 className="section-title">Cash results, {plural(stats.hands, 'hand')}</h2>
          <div className="card stack" style={{ padding: '1rem', gap: '0.7rem' }}>
            <div>
              <div className="display num winrate-main">
                {signed(stats.bbPer100, 1)}
                <span className="winrate-unit"> bb/100</span>
              </div>
              {stats.sd100 !== undefined && (
                <div className="footnote num">
                  95% range {signed(stats.bbPer100 - half, 0)} to {signed(stats.bbPer100 + half, 0)} bb/100. Standard deviation {stats.sd100.toFixed(0)}{' '}
                  bb/100.
                </div>
              )}
            </div>
            {resultsAreNoise(stats.hands, sd) && (
              <div className="explain">
                <strong>Too few hands to tell.</strong> Your results cannot yet separate a winner from a loser: the range above is the honest answer. It
                narrows to plus or minus 10 bb/100 at about {Math.round((100 * (1.96 * sd) ** 2) / 100 / 1000)}k hands.
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
            </div>
          </div>
          <div className="list" style={{ marginTop: '0.75rem' }}>
            {stats.byPosition.map((p) => (
              <div key={p.position} className="list-row stat-row">
                <span className="grow" style={{ fontWeight: 600 }}>
                  {p.position}
                </span>
                <span className="footnote num stat-col">{plural(p.hands, 'hand')}</span>
                <span className="footnote num stat-col">VPIP {pct(p.vpip)}</span>
                <span className="num stat-col" style={{ color: p.bbPer100 >= 0 ? 'var(--green-text)' : 'var(--red-text)' }}>
                  {signed(p.bbPer100, 0)}
                </span>
              </div>
            ))}
          </div>
          <div className="section-footer">bb/100 by seat. The blinds lose money for everyone; compare them with each other, not with the button.</div>
        </section>
      )}

      {rates.length > 0 && (
        <section>
          <h2 className="section-title">How often you open, by seat</h2>
          <div className="list">
            {rates.map((r) => {
              const chart = chartOpenRate(r.seat) ?? 0;
              const off = chart < r.low || chart > r.high;
              return (
                <div key={r.seat} className="list-row stat-row">
                  <span className="grow">
                    <span style={{ fontWeight: 600 }}>{r.seat}</span>
                    <span className="footnote" style={{ display: 'block' }}>
                      {plural(r.chances, 'chance')}, chart {pct(chart)}
                    </span>
                  </span>
                  <span className="num stat-col">{pct(r.rate)}</span>
                  <span className={`pill ${off ? 'pill-warn' : 'pill-good'}`}>{off ? (r.rate > chart ? 'Loose' : 'Tight') : 'In range'}</span>
                </div>
              );
            })}
          </div>
          <div className="section-footer">
            Seats are matched by how many players are left to act, so a 6-max cutoff is compared with the 9-handed cutoff chart. Only cash hands at least
            60bb deep without a straddle count. A seat is flagged only when the chart rate falls outside your 95% range.
          </div>
        </section>
      )}

      {stats && (
        <section>
          <h2 className="section-title">Opening hands the chart plays differently</h2>
          {leaks.length === 0 ? (
            <div className="card" style={{ padding: '1rem' }}>
              <p className="import-copy" style={{ margin: 0 }}>
                None found. Every open and fold either matched the chart or was a hand the chart mixes.
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
                          ? 'You limped. The chart raises or folds.'
                          : l.kind === 'too loose'
                            ? `You opened. The chart opens it ${pct(l.chartRaise)} of the time.`
                            : `You folded. The chart opens it ${pct(l.chartRaise)} of the time.`}
                      </span>
                    </span>
                    <span className={`pill ${l.kind === 'too tight' ? 'pill-tint' : 'pill-warn'}`}>{l.count}×</span>
                  </div>
                ))}
              </div>
              <button className="btn btn-tinted btn-block" style={{ marginTop: '0.75rem' }} disabled={drilled} onClick={() => void drillLeaks()} data-haptic="off">
                {drilled ? 'Added to your review' : `Add ${plural(Math.min(leaks.length, 50), 'hand')} to your review`}
              </button>
            </>
          )}
          <div className="section-footer">
            Compared with Felt’s approximate starter charts, which assume 2.5bb online opens. Only near pure differences show: opening a hand the chart
            opens 5% of the time or less, or folding one it opens 95% or more. Small blind limps are a valid strategy and are not listed.
          </div>
        </section>
      )}

      <section>
        <h2 className="section-title">Live sessions</h2>
        <div className="card stack import-card">
          <p className="import-copy">Import a CSV from a bankroll app or spreadsheet with a date, a session length and a result (or buy in and cash out).</p>
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
        <div className="section-footer">
          Imported results feed your win rate on <Link to="/you">You</Link>.
        </div>
      </section>

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
          Remove imported data
        </button>
      )}
    </div>
  );
}
