import { botById, typeShort } from '@felt/content';
import { useEffect, useMemo, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Sheet, SessionSummary, SheetHead } from '../components/PlaySheet';
import { haptic } from '../haptics';
import { deleteCustomTable, money, toLobbyTable, useCustomTables } from '../state/customTables';
import { lastSeat, LOBBY, type LobbyTable, sitDown, tableBots, useLastStats } from '../state/playTable';
import { BotPortrait } from '../ui/BotPortrait';
import { HeroPattern } from '../ui/Brand';
import { ChevronRightIcon, PlusIcon } from '../ui/icons';
import { PageHeader } from '../ui/PageHeader';
import { Section } from '../ui/Section';
import { Segmented } from '../ui/Segmented';

/**
 * Set when the lobby pushes the table onto the history, so leaving can step
 * back to the lobby instead of adding a second lobby entry.
 */
let pushedSeat = false;

/** Whether the lobby opened the table on the history. Reading it clears it. */
export function takePushedSeat(): boolean {
  const was = pushedSeat;
  pushedSeat = false;
  return was;
}

/** Sits down and opens the table as its own page, so the back gesture leaves it. */
function useSit() {
  const navigate = useNavigate();
  return (table: LobbyTable, buyIn: number, stack?: number) => {
    sitDown(table, buyIn, stack);
    pushedSeat = true;
    navigate('/play/seat');
  };
}

const facesOf = (table: LobbyTable) => tableBots(table).map((id) => botById(id)!).filter(Boolean);

const fmtBb = (n: number) => (Number.isInteger(n) ? String(n) : n.toFixed(1));

/** Buy in range in words, such as 50 to 150bb. */
const buyInRange = (t: LobbyTable) => (t.buyIns[0] === t.buyIns[2] ? `${t.buyIns[0]}bb` : `${t.buyIns[0]} to ${t.buyIns[2]}bb`);

/** The Play lobby: one tap to sit at the last table, your own tables and the presets. */
export function Lobby() {
  const last = useLastStats();
  const custom = useCustomTables();
  const mine = useMemo(() => custom.map(toLobbyTable), [custom]);
  const [picking, setPicking] = useState<LobbyTable>();
  return (
    <div className="stack" style={{ gap: '1.5rem' }}>
      <PageHeader title="Play" />
      <QuickSeat />
      {last && <SessionSummary stats={last} />}
      <Section title="Your tables" footer={mine.length ? undefined : 'Pick the seats, stakes and bots. Your tables stay on this device.'}>
        <div className="list">
          {mine.map((t) => (
            <TableRow key={t.id} table={t} onPick={() => setPicking(t)} />
          ))}
          <Link to="/play/new" className="list-row play-create-row">
            <span className="play-create-icon" aria-hidden="true">
              <PlusIcon size={18} />
            </span>
            <span className="grow">Create a table</span>
            <ChevronRightIcon size={16} className="chev" />
          </Link>
        </div>
      </Section>
      <Section title="Tables" footer="Bot play after the flop is approximate.">
        <div className="list">
          {LOBBY.map((t) => (
            <TableRow key={t.id} table={t} onPick={() => setPicking(t)} />
          ))}
        </div>
      </Section>
      <BuyInSheet table={picking} onClose={() => setPicking(undefined)} />
    </div>
  );
}

function TableRow({ table, onPick }: { table: LobbyTable; onPick: () => void }) {
  const bots = facesOf(table);
  return (
    <button className="list-row play-lobby-row" aria-label={`Sit down at ${table.name}`} onClick={onPick}>
      <span className="grow" style={{ minWidth: 0 }}>
        <span className="play-lobby-name">{table.name}</span>
        <span className="footnote" style={{ display: 'block' }}>
          {table.blurb}
        </span>
        <span className="play-lobby-meta num">
          <span className="play-lobby-faces" aria-hidden="true">
            {bots.slice(0, 5).map((b) => (
              <BotPortrait key={b.id} bot={b} size={22} />
            ))}
          </span>
          {table.seats} seats · {buyInRange(table)}
        </span>
      </span>
      <ChevronRightIcon size={16} className="chev" />
    </button>
  );
}

/** The main card, as on Today and Learn: one tap to sit at the table you played last. */
function QuickSeat() {
  const { table, buyIn, stack } = lastSeat();
  const sit = useSit();
  const bots = facesOf(table);
  return (
    <section className="hero learn-hero play-hero">
      <HeroPattern />
      <div className="learn-hero-body">
        <div style={{ minWidth: 0 }}>
          <div className="hero-label">{table.custom ? 'Your table' : 'Cash game'}</div>
          <div className="display learn-hero-title">{table.name}</div>
          <div className="hero-sub">{stack ? `${table.seats} seats. Your ${fmtBb(stack)}bb stack is saved.` : `${table.seats} seats. ${buyIn}bb buy in.`}</div>
          <div className="play-hero-faces" aria-hidden="true">
            {bots.slice(0, 8).map((b) => (
              <BotPortrait key={b.id} bot={b} size={30} />
            ))}
          </div>
        </div>
      </div>
      <button className="btn btn-lg btn-block btn-hero" onClick={() => sit(table, buyIn, stack)}>
        Play now
      </button>
    </section>
  );
}

function BuyInSheet({ table, onClose }: { table?: LobbyTable; onClose: () => void }) {
  const navigate = useNavigate();
  const sit = useSit();
  const [buyIn, setBuyIn] = useState(100);
  const [confirm, setConfirm] = useState(false);
  useEffect(() => {
    if (table) setBuyIn(table.buyIns[1]);
    setConfirm(false);
  }, [table]);
  const choices = table ? [...new Set(table.buyIns)] : [];
  const cash = table?.stakes ? money(table.stakes, buyIn) : undefined;
  return (
    <Sheet open={!!table} onClose={onClose} label="Buy in">
      {table && (
        <>
          <SheetHead title={table.name} action="Cancel" onClose={onClose} />
          <p className="footnote" style={{ margin: 0 }}>
            {table.seats} seats. {table.custom ? table.blurb : 'Blinds are 0.5 and 1bb.'} Amounts are in big blinds.
          </p>
          <ul className="play-faces-row" aria-label="Bots at this table">
            {facesOf(table).map((b) => (
              <li key={b.id} className="play-face">
                <BotPortrait bot={b} size={40} />
                <span className="play-face-name">{b.name}</span>
                <span className="play-face-type">{typeShort(b)}</span>
              </li>
            ))}
          </ul>
          {choices.length > 1 && (
            <Segmented stretch ariaLabel="Buy in" value={buyIn} options={choices.map((v) => ({ value: v, label: `${v}bb` }))} onChange={setBuyIn} />
          )}
          <button
            className="btn btn-primary btn-lg btn-block"
            onClick={() => {
              onClose();
              sit(table, buyIn);
            }}
          >
            Sit down with {buyIn}bb{cash ? ` (${cash})` : ''}
          </button>
          {table.custom &&
            (confirm ? (
              <div className="play-confirm">
                <p className="footnote" style={{ margin: 0, textAlign: 'center' }}>
                  Delete {table.name}? This cannot be undone.
                </p>
                <div className="play-confirm-buttons">
                  <button className="btn btn-tinted" onClick={() => setConfirm(false)}>
                    Keep it
                  </button>
                  <button
                    className="btn play-delete"
                    data-haptic="off"
                    onClick={() => {
                      haptic('warning');
                      deleteCustomTable(table.id);
                      onClose();
                    }}
                  >
                    Delete table
                  </button>
                </div>
              </div>
            ) : (
              <div className="play-confirm-buttons">
                <button
                  className="btn btn-tinted"
                  onClick={() => {
                    onClose();
                    navigate(`/play/table/${table.id}`);
                  }}
                >
                  Edit table
                </button>
                <button className="btn btn-tinted play-delete-soft" onClick={() => setConfirm(true)}>
                  Delete
                </button>
              </div>
            ))}
        </>
      )}
    </Sheet>
  );
}
