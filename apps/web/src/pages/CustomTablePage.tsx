import { LINEUP_LABELS, LINEUP_TYPES, type LineupType, lineupBots, botById } from '@felt/content';
import { seededRng } from '@felt/core';
import { useMemo, useRef, useState } from 'react';
import { Navigate, useNavigate, useParams } from 'react-router-dom';
import { haptic } from '../haptics';
import {
  BUY_IN,
  type CustomTable,
  customTableById,
  fitLineup,
  lineupCounts,
  mixLineup,
  money,
  NAME_MAX,
  newTable,
  OPEN_SIZES,
  saveCustomTable,
  SEATS,
  STAKES,
  stakesOf,
  type TableField,
  validateTable,
} from '../state/customTables';
import { BotPortrait } from '../ui/BotPortrait';
import { BottomBar } from '../ui/BottomBar';
import { Chips } from '../ui/Chips';
import { PageHeader } from '../ui/PageHeader';
import { Section } from '../ui/Section';
import { Segmented } from '../ui/Segmented';
import { Stepper } from '../ui/Stepper';
import { Toggle } from '../ui/Toggle';
import './play.css';

const randomSeed = () => (Math.random() * 2 ** 31) | 0;
const byType = (a: LineupType, b: LineupType) => LINEUP_TYPES.indexOf(a) - LINEUP_TYPES.indexOf(b);

/** Create a table, or edit one, for the Play lobby. Saved on this device. */
export function CustomTablePage() {
  const { id } = useParams();
  const existing = id ? customTableById(id) : undefined;
  if (id && !existing) return <Navigate to="/play" replace />;
  return <TableForm key={id ?? 'new'} initial={existing} />;
}

function TableForm({ initial }: { initial?: CustomTable }) {
  const navigate = useNavigate();
  const rng = useRef(seededRng(randomSeed()));
  const [t, setT] = useState<CustomTable>(() => initial ?? newTable(rng.current));
  const [tried, setTried] = useState(false);
  const set = (patch: Partial<CustomTable>) => setT((x) => ({ ...x, ...patch }));
  const problems = validateTable(t);
  const problem = (field: TableField) => (tried || field !== 'name' ? problems.find((p) => p.field === field)?.message : undefined);
  const stakes = stakesOf(t.stakes);
  const counts = lineupCounts(t.lineup);
  const seatsLeft = t.seats - 1 - t.lineup.length;
  const faces = useMemo(() => {
    try {
      return lineupBots(t.lineup).map((b) => botById(b)!);
    } catch {
      return [];
    }
  }, [t.lineup]);
  const cash = (bb: number) => money(stakes, bb);
  const range = cash(t.buyInMin) && cash(t.buyInMax) ? `That is ${cash(t.buyInMin)} to ${cash(t.buyInMax)} at ${stakes.label}.` : 'Amounts are in big blinds.';

  function save() {
    setTried(true);
    if (problems.length) {
      haptic('error');
      // Bring the first problem into view, above the bottom bar.
      requestAnimationFrame(() => document.querySelector('.play-form .play-field-error')?.scrollIntoView({ block: 'center', behavior: 'smooth' }));
      return;
    }
    const saved = saveCustomTable(t);
    haptic('success');
    navigate('/play', { replace: true, state: { saved: saved.id } });
  }

  return (
    <div className="stack play-form" style={{ gap: '1.5rem' }}>
      <PageHeader title={initial ? 'Edit table' : 'Create a table'} back={{ to: '/play', label: 'Play' }} />

      <Section title="Name">
        <div className="list">
          <label className="list-row play-name-row">
            <span className="grow">Name</span>
            <input
              value={t.name}
              maxLength={NAME_MAX}
              placeholder="Friday home game"
              aria-label="Table name"
              aria-invalid={!!problem('name')}
              enterKeyHint="done"
              autoComplete="off"
              onChange={(e) => set({ name: e.target.value })}
            />
          </label>
        </div>
        {problem('name') && <p className="play-field-error">{problem('name')}</p>}
      </Section>

      <Section title="Table">
        <div className="list">
          <div className="list-row">
            <span className="grow">
              <span style={{ display: 'block' }}>Seats</span>
              <span className="footnote">{t.seats === 2 ? 'Heads up against 1 bot' : `You and ${t.seats - 1} bots`}</span>
            </span>
            <Stepper
              label="seats"
              value={t.seats}
              min={SEATS.min}
              max={SEATS.max}
              onChange={(seats) => set({ seats, lineup: fitLineup(t.lineup, seats, rng.current), straddle: seats < 3 ? false : t.straddle })}
            />
          </div>
          <div className="list-row play-stack-row">
            <span>Stakes</span>
            <Chips ariaLabel="Stakes" value={t.stakes} options={STAKES.map((s) => ({ value: s.id, label: s.label }))} onChange={(id) => set({ stakes: id })} />
          </div>
          <label className="list-row">
            <span className="grow">
              <span style={{ display: 'block' }}>Straddle</span>
              <span className="footnote">{t.seats < 3 ? 'Heads up has no straddle' : 'The player after the big blind posts 2bb'}</span>
            </span>
            {t.seats >= 3 && <Toggle label="Straddle" checked={t.straddle} onChange={(straddle) => set({ straddle })} />}
          </label>
        </div>
      </Section>

      <Section title="Buy in" footer={problem('buyIn') ? undefined : range}>
        <div className="list">
          <div className="list-row">
            <span className="grow">Smallest</span>
            <Stepper
              label="big blinds for the smallest buy in"
              value={t.buyInMin}
              min={BUY_IN.min}
              max={BUY_IN.max}
              step={BUY_IN.step}
              format={(v) => `${v}bb`}
              onChange={(buyInMin) => set({ buyInMin, buyInMax: Math.max(buyInMin, t.buyInMax) })}
            />
          </div>
          <div className="list-row">
            <span className="grow">Largest</span>
            <Stepper
              label="big blinds for the largest buy in"
              value={t.buyInMax}
              min={BUY_IN.min}
              max={BUY_IN.max}
              step={BUY_IN.step}
              format={(v) => `${v}bb`}
              onChange={(buyInMax) => set({ buyInMax, buyInMin: Math.min(buyInMax, t.buyInMin) })}
            />
          </div>
        </div>
        {problem('buyIn') && <p className="play-field-error">{problem('buyIn')}</p>}
      </Section>

      <Section title="Bots" footer="Bot play after the flop is approximate.">
        <div className="list">
          <div className="list-row play-stack-row">
            <span>
              <span style={{ display: 'block' }}>Their open size</span>
              <span className="footnote">Online games open 2.5bb. Live games open bigger.</span>
            </span>
            <Segmented
              stretch
              ariaLabel="Bot open size"
              value={t.openBb}
              options={OPEN_SIZES.map((v) => ({ value: v, label: v === 2.5 ? '2.5bb online' : `${v}bb live` }))}
              onChange={(openBb) => set({ openBb })}
            />
          </div>
        </div>
        <div className="play-lineup-head">
          <span className="play-lineup-faces" aria-hidden="true">
            {faces.map((b) => (
              <BotPortrait key={b.id} look={b.look} size={26} />
            ))}
          </span>
          <button className="btn btn-tinted play-mix-btn" onClick={() => set({ lineup: mixLineup(t.seats - 1, rng.current) })}>
            Mix
          </button>
        </div>
        <div className="list">
          {LINEUP_TYPES.map((type) => (
            <div key={type} className="list-row">
              <span className="grow">{LINEUP_LABELS[type]}</span>
              <Stepper
                label={LINEUP_LABELS[type]}
                value={counts[type]}
                min={0}
                max={counts[type] + Math.max(0, seatsLeft)}
                onChange={(n) => {
                  const others = t.lineup.filter((x) => x !== type);
                  set({ lineup: [...others, ...Array<LineupType>(n).fill(type)].sort(byType) });
                }}
              />
            </div>
          ))}
        </div>
        <p className={problem('lineup') ? 'play-field-error' : 'section-footer'} role="status">
          {problem('lineup') ?? (t.seats === 2 ? 'The seat is filled.' : `All ${t.seats - 1} seats are filled.`)}
        </p>
      </Section>

      <BottomBar>
        <button className="btn btn-primary btn-lg btn-block" onClick={save}>
          {initial ? 'Save changes' : 'Save table'}
        </button>
      </BottomBar>
    </div>
  );
}
