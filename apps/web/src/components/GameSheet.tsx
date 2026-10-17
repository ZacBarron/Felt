import { type GameSettings, MAX_TABLE_SIZE, MIN_TABLE_SIZE, PRESETS, sameGame, stakesLabel } from '@felt/core';
import { useEffect, useRef } from 'react';
import { Link } from 'react-router-dom';
import { chartsForGame } from '../state/charts';
import { useSettings } from '../state/settings';
import { CheckIcon } from '../ui/icons';
import { Segmented } from '../ui/Segmented';
import { Stepper } from '../ui/Stepper';


/** Short line for the game you play, like "9 handed, 100bb". */
export function gameLine(g: GameSettings): string {
  return `${g.tableSize === 2 ? 'Heads up' : `${g.tableSize} handed`}, ${g.stackBb}bb`;
}

/** Capsule that shows your game and opens the game sheet. */
export function GameChip({ onOpen }: { onOpen: () => void }) {
  const { settings } = useSettings();
  return (
    <button className="game-chip" onClick={onOpen} aria-haspopup="dialog">
      {gameLine(settings.game)}
      <svg width="10" height="10" viewBox="0 0 10 10" aria-hidden="true">
        <path d="M2 3.5 5 6.5 8 3.5" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" />
      </svg>
    </button>
  );
}

/** Bottom sheet to change the game every chart and drill follows. */
export function GameSheet({ open, onClose }: { open: boolean; onClose: () => void }) {
  const ref = useRef<HTMLDialogElement>(null);
  const { settings, update } = useSettings();
  const g = settings.game;
  const fit = chartsForGame(g);
  const setGame = (patch: Partial<GameSettings>) => update({ ...settings, game: { ...g, ...patch } });

  useEffect(() => {
    const d = ref.current;
    if (!d) return;
    if (open && !d.open) d.showModal();
    if (!open && d.open) d.close();
  }, [open]);

  return (
    <dialog
      ref={ref}
      className="sheet"
      aria-label="Your game"
      onClose={onClose}
      onClick={(e) => {
        // A tap on the dimmed backdrop closes the sheet.
        if (e.target === ref.current) onClose();
      }}
    >
      <div className="sheet-body stack" style={{ gap: '1.2rem' }}>
        <div className="sheet-grabber" aria-hidden="true" />
        <div className="row between">
          <h2 style={{ margin: 0, fontSize: '1.25rem' }}>Your game</h2>
          <button className="btn btn-plain" onClick={onClose}>
            Done
          </button>
        </div>

        <section>
          <div className="list">
            <div className="list-row">
              <span className="grow">Players</span>
              <Stepper label="players" value={g.tableSize} min={MIN_TABLE_SIZE} max={MAX_TABLE_SIZE} onChange={(tableSize) => setGame({ tableSize })} />
            </div>
            <div className="list-row">
              <span className="grow">Stack</span>
              <Stepper label="big blinds" value={g.stackBb} min={10} max={500} step={10} format={(v) => `${v}bb`} onChange={(stackBb) => setGame({ stackBb })} />
            </div>
            <div className="list-row">
              <span className="grow">Format</span>
              <Segmented
                ariaLabel="Format"
                value={g.format}
                onChange={(format) => setGame({ format })}
                options={[
                  { value: 'cash', label: 'Cash' },
                  { value: 'mtt', label: 'Tournament' },
                ]}
              />
            </div>
          </div>
          <div className="section-footer">
            {!fit.exact
              ? `Charts are built for 6 and 9 handed games. You will see the ${fit.tableSize} handed charts.`
              : Math.abs(g.stackBb - 100) >= 30
                ? 'Charts are built for 100bb. Deeper or shorter stacks change some hands, so treat them as a guide.'
                : 'Every chart, drill and review card follows this game.'}
          </div>
        </section>

        <section>
          <h3 className="section-title">Presets</h3>
          <div className="list">
            {Object.entries(PRESETS).map(([id, p]) => (
              <button key={id} className="list-row" data-haptic="select" onClick={() => update({ ...settings, game: { ...p.settings, openBb: settings.game.openBb } })}>
                <span className="grow">
                  <span style={{ display: 'block' }}>{p.label}</span>
                  <span className="footnote">
                    {stakesLabel(p.settings.stakes)}, {gameLine(p.settings)}
                  </span>
                </span>
                {sameGame(p.settings, g) && <CheckIcon size={20} style={{ color: 'var(--tint)' }} />}
              </button>
            ))}
          </div>
          <div className="section-footer">
            Stakes, rake and venue are in <Link to="/settings/game">Settings</Link>.
          </div>
        </section>
      </div>
    </dialog>
  );
}
