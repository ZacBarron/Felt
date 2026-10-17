import { CHART_LIBRARY } from '@felt/content';
import { chartOpenBb, type ChartMeta, openSize, spotKey } from '@felt/core';
import { type CSSProperties, useEffect, useMemo, useRef } from 'react';
import { type Family, FAMILIES, familiesOf, familyLabel, optionFor, resolveVariant, type SpotOption, spotOptions, variantAxes, variantsOf } from '../state/chartPicker';
import { useSettings } from '../state/settings';
import { Chips } from '../ui/Chips';
import { ChevronDownIcon, ChevronLeftIcon, ChevronRightIcon } from '../ui/icons';
import { Segmented } from '../ui/Segmented';
import { gameLine } from './GameSheet';

/** What the picker shows: a chart, the spot type it is listed under and the villain seat chosen. */
export interface ChartSelection {
  id: string;
  family: Family;
  villain?: string;
}

export const selectionFor = (m: ChartMeta, villain?: string): ChartSelection => ({ id: m.id, family: familiesOf(m)[0], villain: villain ?? m.villains?.[0] });

const tableLabel = (n: number) => (n === 6 ? '6-max' : `${n}-handed`);
const bbText = (n: number) => `${Number.isInteger(n) ? n : n.toFixed(1)}bb`;

/** "9-handed, 100bb, 2.5bb open" for a chart. */
export function variantLine(m: ChartMeta): string {
  return `${tableLabel(m.tableSize)}, ${bbText(m.stackBb)}, ${bbText(chartOpenBb(m))} open`;
}

function libraryAt(tableSize: number) {
  return CHART_LIBRARY.filter((m) => m.tableSize === tableSize && m.game === 'cash');
}

/**
 * One row that names the current chart. The capsule opens a sheet to pick
 * any chart by spot type, seats, stack and open size. The arrows step to the
 * spot before or after at the same stack and size.
 */
export function ChartPicker({
  value,
  selection,
  onChange,
  open,
  onOpen,
  onClose,
  onEditGame,
}: {
  value: ChartMeta;
  selection: ChartSelection;
  onChange: (s: ChartSelection) => void;
  open: boolean;
  onOpen: () => void;
  onClose: () => void;
  /** Opens the game sheet, to change the game every chart and drill follows. */
  onEditGame: () => void;
}) {
  const library = useMemo(() => libraryAt(value.tableSize), [value.tableSize]);
  const options = useMemo(() => spotOptions(library, selection.family), [library, selection.family]);
  const current = optionFor(options, value, selection.villain);
  const index = current ? options.indexOf(current) : -1;
  const stepTo = (o: SpotOption | undefined) => {
    if (!o) return;
    const m = resolveVariant(library, o.key, value.stackBb, chartOpenBb(value));
    if (m) onChange({ id: m.id, family: selection.family, villain: o.second });
  };
  const prev = index > 0 ? options[index - 1] : undefined;
  const next = index >= 0 && index < options.length - 1 ? options[index + 1] : undefined;

  return (
    <>
      <div className="chart-nav">
        <button type="button" className="chart-step" aria-label={prev ? `Previous chart, ${prev.label}` : 'Previous chart'} disabled={!prev} data-haptic="select" onClick={() => stepTo(prev)}>
          <ChevronLeftIcon size={20} />
        </button>
        <button type="button" className="chart-select" aria-haspopup="dialog" aria-label={`Chart: ${value.title}, ${variantLine(value)}. Change chart`} onClick={onOpen}>
          <span className="chart-select-text" aria-hidden="true">
            <span className="chart-select-top">
              <span className="chart-select-spot">{familyLabel(selection.family)}</span>
              <span className="chart-select-title">{current?.label ?? value.title}</span>
            </span>
            <span className="chart-select-meta">{variantLine(value)}</span>
          </span>
          <ChevronDownIcon size={16} className="chart-select-chev" />
        </button>
        <button type="button" className="chart-step" aria-label={next ? `Next chart, ${next.label}` : 'Next chart'} disabled={!next} data-haptic="select" onClick={() => stepTo(next)}>
          <ChevronRightIcon size={20} />
        </button>
      </div>
      <ChartSheet open={open} value={value} selection={selection} onClose={onClose} onChange={onChange} onEditGame={onEditGame} />
    </>
  );
}

/** A wrapping grid of seat buttons, like a radio group. */
function SeatChoice({ label, options, value, onPick }: { label: string; options: string[]; value?: string; onPick: (v: string) => void }) {
  const wide = options.some((o) => o.length > 6);
  return (
    <section className="chart-sheet-group">
      <h3 className="section-title">{label}</h3>
      <div className="seat-grid" role="radiogroup" aria-label={label} style={{ '--seat-min': wide ? '128px' : '64px' } as CSSProperties}>
        {options.map((o) => (
          <button key={o} type="button" role="radio" aria-checked={o === value} className={`seat-pick${o === value ? ' on' : ''}`} data-haptic="select" onClick={() => onPick(o)}>
            {o}
          </button>
        ))}
      </div>
    </section>
  );
}

function Axis({ label, values, value, unit, onPick }: { label: string; values: number[]; value: number; unit: (n: number) => string; onPick: (n: number) => void }) {
  if (values.length < 2)
    return (
      <section className="chart-sheet-group">
        <h3 className="section-title">{label}</h3>
        <p className="footnote chart-sheet-only">This spot has {unit(values[0] ?? value)} only.</p>
      </section>
    );
  return (
    <section className="chart-sheet-group">
      <h3 className="section-title">{label}</h3>
      <Segmented<number> ariaLabel={label} stretch value={value} onChange={onPick} options={values.map((v) => ({ value: v, label: unit(v) }))} />
    </section>
  );
}

/** Bottom sheet to pick a chart: spot type, seats, stack and open size. Phone first: every choice wraps or scrolls. */
function ChartSheet({
  open,
  value,
  selection,
  onClose,
  onChange,
  onEditGame,
}: {
  open: boolean;
  value: ChartMeta;
  selection: ChartSelection;
  onClose: () => void;
  onChange: (s: ChartSelection) => void;
  onEditGame: () => void;
}) {
  const ref = useRef<HTMLDialogElement>(null);
  const { settings } = useSettings();
  const game = settings.game;

  useEffect(() => {
    const d = ref.current;
    if (!d) return;
    if (open && !d.open) d.showModal();
    if (!open && d.open) d.close();
  }, [open]);

  const library = useMemo(() => libraryAt(value.tableSize), [value.tableSize]);
  const families = FAMILIES.filter((f) => library.some((m) => familiesOf(m).includes(f.id)));
  const options = spotOptions(library, selection.family);
  const current = optionFor(options, value, selection.villain);
  const firsts = [...new Set(options.map((o) => o.first))];
  const seconds = options.filter((o) => o.first === current?.first && o.second !== undefined).map((o) => o.second!);
  const variants = variantsOf(library, spotKey(value));
  const axes = variantAxes(variants);
  const straddle = value.spot === 'straddle';

  const go = (o: SpotOption | undefined, family = selection.family, stack = value.stackBb, size = chartOpenBb(value), lib = library) => {
    if (!o) return;
    const m = resolveVariant(lib, o.key, stack, size);
    if (m) onChange({ id: m.id, family, villain: o.second });
  };

  const pickFamily = (f: Family) => {
    const opts = spotOptions(library, f);
    // Keep your seat when the new spot type has it.
    const same = opts.find((o) => o.first === current?.first) ?? opts[0];
    go(same, f);
  };
  const pickFirst = (first: string) => {
    const opts = options.filter((o) => o.first === first);
    go(opts.find((o) => o.second === selection.villain) ?? opts[opts.length - 1]);
  };
  const pickSecond = (second: string) => go(options.find((o) => o.first === current?.first && o.second === second));
  const pickTable = (size: number) => {
    const lib = libraryAt(size);
    const opts = spotOptions(lib, selection.family);
    const same = opts.find((o) => o.label === current?.label) ?? opts.find((o) => o.first === current?.first) ?? opts[0];
    go(same, selection.family, value.stackBb, chartOpenBb(value), lib);
  };
  const useMyGame = () => {
    const size = game.tableSize <= 7 ? 6 : 9;
    const lib = libraryAt(size);
    const opts = spotOptions(lib, selection.family);
    const same = opts.find((o) => o.label === current?.label) ?? opts[0];
    go(same, selection.family, game.stackBb, openSize(game), lib);
  };

  return (
    <dialog
      ref={ref}
      className="sheet chart-sheet"
      aria-label="Charts"
      onClose={onClose}
      onClick={(e) => {
        // A tap on the dimmed backdrop closes the sheet.
        if (e.target === ref.current) onClose();
      }}
    >
      <div className="sheet-body stack" style={{ gap: '1rem' }}>
        <div className="sheet-grabber" aria-hidden="true" />
        <div className="row between" style={{ flexWrap: 'nowrap' }}>
          <div style={{ minWidth: 0 }}>
            <h2 style={{ margin: 0, fontSize: '1.25rem' }}>Charts</h2>
            <div className="footnote">Your game is {gameLine(game).replace(/^\w/, (c) => c.toLowerCase())}, {bbText(openSize(game))} opens.</div>
          </div>
          <button className="btn btn-plain" onClick={onClose}>
            Done
          </button>
        </div>

        <section className="chart-sheet-group">
          <h3 className="section-title">Spot</h3>
          <Chips<Family> ariaLabel="Spot type" value={selection.family} onChange={pickFamily} options={families.map((f) => ({ value: f.id, label: f.label }))} />
        </section>

        {selection.family === 'squeeze' || selection.family === 'bvb' ? (
          <SeatChoice label="Spot" options={firsts} value={current?.first} onPick={pickFirst} />
        ) : (
          <>
            <SeatChoice label="Your seat" options={firsts} value={current?.first} onPick={pickFirst} />
            {seconds.length > 0 && (
              <SeatChoice
                label={selection.family === 'limpers' ? 'Limpers' : selection.family === 'vs-3bet' ? 'Who 3bets' : selection.family === 'vs-4bet' ? 'Who 4bets' : 'Who opens'}
                options={seconds}
                value={current?.second}
                onPick={pickSecond}
              />
            )}
          </>
        )}

        <Axis label="Stack" values={axes.stacks} value={value.stackBb} unit={bbText} onPick={(s) => go(current, selection.family, s)} />
        <Axis
          label={straddle ? 'Open size (2bb straddle)' : 'Open size'}
          values={axes.opens}
          value={chartOpenBb(value)}
          unit={bbText}
          onPick={(o) => go(current, selection.family, value.stackBb, o)}
        />
        <section className="chart-sheet-group">
          <h3 className="section-title">Table</h3>
          <Segmented<number> ariaLabel="Table" stretch value={value.tableSize} onChange={pickTable} options={[{ value: 9, label: '9-handed' }, { value: 6, label: '6-max' }]} />
        </section>

        <p className="footnote chart-sheet-source">
          {value.source === 'model-approx'
            ? 'Aced derived this chart by rule from a hand written chart. It is an estimate.'
            : value.basis === 'exploit'
              ? 'A hand written exploit chart for live pools.'
              : 'A hand written chart close to published solver results.'}
        </p>
        <div className="chart-sheet-actions">
          <button type="button" className="btn btn-lg" onClick={onEditGame}>
            Change my game
          </button>
          <button type="button" className="btn btn-lg btn-primary" onClick={useMyGame}>
            Match my game
          </button>
        </div>
      </div>
    </dialog>
  );
}
