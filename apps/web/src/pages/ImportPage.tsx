import { createScheduler, heroStats, openDeviations, RECALL_TARGET_MS, sessionTotals } from '@felt/core';
import { useLiveQuery } from 'dexie-react-hooks';
import { useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import { haptic } from '../haptics';
import { db } from '../state/db';
import { asHeroHand, chartIdFor, chartOpenFreq, clearImports, type HandImportSummary, importHandText, importSessionCsv } from '../state/imports';
import { useSettings } from '../state/settings';
import { PageHeader } from '../ui/PageHeader';

/** Fewer hands than this and results are mostly luck (Potter van Loon et al. 2015). */
const NOISE_HANDS = 1500;

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
  const all = hands.map(asHeroHand);
  const stats = cash.length ? heroStats(cash) : undefined;
  const allStats = all.length ? heroStats(all) : undefined;
  // Standard deviation per 100 hands from the hands themselves.
  const sd100 =
    cash.length > 1
      ? Math.sqrt(cash.reduce((s, h) => s + (h.netBb - stats!.netBb / cash.length) ** 2, 0) / (cash.length - 1)) * 10
      : undefined;
  const leaks = openDeviations(
    all.filter((h) => h.openChance),
    (pos, hand) => {
      const sample = hands.find((x) => x.position === pos);
      return chartOpenFreq(sample?.tableMax ?? 9)(pos, hand);
    },
  );
  const totals = sessions.length ? sessionTotals(sessions) : undefined;

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
          ? `${r.sessions.length} sessions read (date: ${r.columns.date ?? 'none'}, length: ${r.columns.hours ?? 'none'}, result: ${r.columns.profit ?? `${r.columns.cashOut} minus ${r.columns.buyIn}`})${r.skipped ? `, ${r.skipped} rows skipped` : ''}.`
          : 'No sessions found. Felt looks for a length column (hours, duration or minutes) and a result column (profit, net, result, or buy in and cash out).',
      );
    }
    setCsvResult(parts.join(' '));
    setBusy(false);
    haptic('success');
  };

  const drillLeaks = async () => {
    const scheduler = createScheduler();
    const now = new Date();
    for (const l of leaks) {
      const sample = hands.find((h) => h.position === l.position);
      const chartId = chartIdFor(sample?.tableMax ?? 9, l.position);
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
      <PageHeader title="Import" subtitle="Bring in your real hands and sessions" />

      <section>
        <h2 className="section-title">Hand histories</h2>
        <div className="card stack import-card">
          <p className="import-copy">
            Import hand history text files from PokerStars, GGPoker and other sites that use the same format. Felt finds your seat, results,
            positions and preflop decisions.
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
            <textarea className="saved-note-input" rows={5} value={paste} onChange={(e) => setPaste(e.target.value)} placeholder="PokerStars Hand #..." />
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
            <div className={`explain ${handResult.added ? 'good' : 'bad'} reveal`}>
              <strong>{handResult.added} hands added.</strong>
              {handResult.duplicates > 0 && ` ${handResult.duplicates} already imported.`}
              {handResult.noHero > 0 && ` ${handResult.noHero} had no hero cards and were skipped.`}
              {handResult.errors > 0 && ` ${handResult.errors} could not be read.`}
            </div>
          )}
        </div>
        <div className="section-footer">
          <strong>PokerTracker 4 or Holdem Manager 3:</strong> Felt cannot open their databases directly, because they run on your computer. Export
          your hands from the tracker as hand history text (PokerStars format), then import the files here. Everything stays on this device.
        </div>
      </section>

      {stats && (
        <section>
          <h2 className="section-title">Cash results from {stats.hands.toLocaleString()} hands</h2>
          <div className="card stack" style={{ padding: '1rem', gap: '0.7rem' }}>
            <div className="row between" style={{ alignItems: 'flex-end' }}>
              <div>
                <div className="display num winrate-main">
                  {stats.bbPer100 >= 0 ? '+' : ''}
                  {stats.bbPer100.toFixed(1)}
                  <span className="winrate-unit"> bb/100</span>
                </div>
                {sd100 !== undefined && (
                  <div className="footnote num">
                    95% range {(stats.bbPer100 - (1.96 * sd100) / Math.sqrt(stats.hands / 100)).toFixed(0)} to{' '}
                    {(stats.bbPer100 + (1.96 * sd100) / Math.sqrt(stats.hands / 100)).toFixed(0)}, standard deviation {sd100.toFixed(0)} bb/100
                  </div>
                )}
              </div>
            </div>
            {stats.hands < NOISE_HANDS && (
              <div className="explain bad">
                <strong>Too few hands to read yet.</strong> Under about {NOISE_HANDS.toLocaleString()} hands, results are mostly luck. Your Felt
                Rating is a better guide for now.
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
                <span className="num">{pct(stats.wentToShowdown)}</span>
                <span className="footnote">Showdown</span>
              </div>
            </div>
          </div>
          <div className="list" style={{ marginTop: '0.75rem' }}>
            {stats.byPosition.map((p) => (
              <div key={p.position} className="list-row">
                <span className="grow" style={{ fontWeight: 600 }}>
                  {p.position}
                </span>
                <span className="footnote num" style={{ minWidth: 70 }}>
                  {p.hands} hands
                </span>
                <span className="footnote num" style={{ minWidth: 56 }}>
                  VPIP {pct(p.vpip)}
                </span>
                <span className="num" style={{ minWidth: 74, textAlign: 'right', color: p.bbPer100 >= 0 ? 'var(--green)' : 'var(--red)' }}>
                  {p.bbPer100 >= 0 ? '+' : ''}
                  {p.bbPer100.toFixed(0)}
                </span>
              </div>
            ))}
          </div>
          <div className="section-footer">bb/100 by seat. The blinds lose money for everyone; compare them with each other, not with the button.</div>
        </section>
      )}

      {allStats && (
        <section>
          <h2 className="section-title">First in decisions against your charts</h2>
          {leaks.length === 0 ? (
            <div className="card" style={{ padding: '1rem' }}>
              <p className="import-copy" style={{ margin: 0 }}>
                No clear opening leaks: every first in raise and fold matched the charts or was a mixed hand.
              </p>
            </div>
          ) : (
            <>
              <div className="list">
                {leaks.slice(0, 12).map((l) => (
                  <div key={`${l.position}:${l.hand}:${l.kind}`} className="list-row">
                    <span className="grow">
                      <span style={{ fontWeight: 650 }}>
                        {l.hand} from {l.position}
                      </span>
                      <span className="footnote" style={{ display: 'block' }}>
                        {l.kind === 'limp'
                          ? 'You limped; the chart raises or folds'
                          : l.kind === 'too loose'
                            ? `You raised; the chart opens it ${pct(l.chartRaise)} of the time`
                            : `You folded; the chart opens it ${pct(l.chartRaise)} of the time`}
                      </span>
                    </span>
                    <span className={`pill ${l.kind === 'too tight' ? 'pill-tint' : 'pill-warn'}`}>{l.count}x</span>
                  </div>
                ))}
              </div>
              <button className="btn btn-primary btn-block" style={{ marginTop: '0.75rem' }} disabled={drilled} onClick={() => void drillLeaks()} data-haptic="off">
                {drilled ? 'Added to your review' : `Drill these ${Math.min(leaks.length, 50)} hands in review`}
              </button>
            </>
          )}
          <div className="section-footer">
            Compared with Felt’s starter charts, which are approximate. Mixed hands are never flagged. Live tables play differently, so treat this
            as a list to review, not a verdict.
          </div>
        </section>
      )}

      <section>
        <h2 className="section-title">Live sessions</h2>
        <div className="card stack import-card">
          <p className="import-copy">
            Import a CSV from a bankroll app or spreadsheet. Felt reads any file with a date, a session length and a result (or buy in and cash out).
          </p>
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
          <button className="btn btn-primary" disabled={busy} onClick={() => csvInput.current?.click()}>
            Choose a CSV file
          </button>
          {csvResult && <div className="explain good reveal">{csvResult}</div>}
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
                <span className="num">{Math.round(totals.profit).toLocaleString()}</span>
                <span className="footnote">Profit ({settings.game.stakes.currency})</span>
              </div>
              <div>
                <span className="num">{totals.perHour.toFixed(0)}</span>
                <span className="footnote">Per hour</span>
              </div>
            </div>
          )}
        </div>
        <div className="section-footer">
          Imported results feed the win rate on <Link to="/you">You</Link>.
        </div>
      </section>

      {(hands.length > 0 || sessions.length > 0) && (
        <button
          className="btn btn-block"
          style={{ color: 'var(--red)' }}
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
