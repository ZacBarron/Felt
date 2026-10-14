import { findTerms, type LessonStep } from '@felt/content';
import { createContext, Fragment, useContext } from 'react';
import { Term } from '../ui/Term';

const SUIT_CLASS: Record<string, string> = { '♠': 'suit-s', '♥': 'suit-h', '♦': 'suit-d', '♣': 'suit-c' };
const SUIT_NAME: Record<string, string> = { '♠': 'spades', '♥': 'hearts', '♦': 'diamonds', '♣': 'clubs' };

/** Colors suit symbols with the four color deck and names them for screen readers. */
function Suits({ text }: { text: string }) {
  const parts = text.split(/([♠♥♦♣])️?/);
  if (parts.length === 1) return <>{text}</>;
  return (
    <>
      {parts.map((p, i) =>
        i % 2 === 1 ? (
          <span key={i} className={SUIT_CLASS[p]} role="img" aria-label={SUIT_NAME[p]}>
            {p}
            {'︎'}
          </span>
        ) : (
          <Fragment key={i}>{p}</Fragment>
        ),
      )}
    </>
  );
}

/**
 * Which glossary terms a screen may underline. A lesson sets it per step so a
 * term is underlined only where it first appears, and a screen never carries
 * more than a few. Outside lessons nothing is set and each block links freely.
 */
export const TermScope = createContext<ReadonlySet<string> | undefined>(undefined);

/** Every string a step shows, for finding the terms it uses. */
function stepStrings(value: unknown): string[] {
  if (typeof value === 'string') return [value];
  if (Array.isArray(value)) return value.flatMap(stepStrings);
  if (value && typeof value === 'object') return Object.entries(value).flatMap(([k, v]) => (k === 'kind' || k === 'chartId' ? [] : stepStrings(v)));
  return [];
}

/** At most this many underlines on one screen. Abbreviations come first: they are the hardest to guess. */
const PER_SCREEN = 3;

/**
 * The terms step `index` of a lesson may underline: ones not seen in an
 * earlier step, abbreviations first, then in reading order, capped per screen.
 */
export function termsForStep(steps: readonly LessonStep[], index: number): Set<string> {
  const seen = new Set(steps.slice(0, index).flatMap((s) => stepStrings(s).flatMap((t) => findTerms(t).map((m) => m.id))));
  const here: { id: string; abbr: boolean }[] = [];
  for (const t of stepStrings(steps[index])) {
    for (const m of findTerms(t)) {
      if (seen.has(m.id) || here.some((h) => h.id === m.id)) continue;
      here.push({ id: m.id, abbr: /^[A-Z0-9+/$]{2,}/.test(t.slice(m.start, m.end)) });
    }
  }
  return new Set([...here.filter((h) => h.abbr), ...here.filter((h) => !h.abbr)].slice(0, PER_SCREEN).map((h) => h.id));
}

/**
 * Underlines glossary terms in plain text, each term once per block (`seen`
 * is shared across a block's parts). Bold text is not linked: a bold term is
 * the one being defined right there.
 */
function Glossed({ text, seen }: { text: string; seen: Set<string> }) {
  const allowed = useContext(TermScope);
  const out: React.ReactNode[] = [];
  let at = 0;
  for (const m of findTerms(text)) {
    if (seen.has(m.id) || (allowed && !allowed.has(m.id))) continue;
    seen.add(m.id);
    if (m.start > at) out.push(<Suits key={`t${at}`} text={text.slice(at, m.start)} />);
    out.push(
      <Term key={`g${m.start}`} id={m.id}>
        {text.slice(m.start, m.end)}
      </Term>,
    );
    at = m.end;
  }
  if (out.length === 0) return <Suits text={text} />;
  if (at < text.length) out.push(<Suits key={`t${at}`} text={text.slice(at)} />);
  return <>{out}</>;
}

/** Renders **bold** spans, suit symbols and tappable glossary terms in lesson copy. */
export function Rich({ text, terms = true }: { text: string; terms?: boolean }) {
  const parts = text.split('**');
  const seen = new Set<string>();
  // Terms defined in bold here are explained in place, so they are not linked again in this block.
  if (terms) parts.forEach((p, i) => i % 2 === 1 && findTerms(p).forEach((m) => seen.add(m.id)));
  return (
    <>
      {parts.map((p, i) =>
        i % 2 === 1 ? (
          <strong key={i}>
            <Suits text={p} />
          </strong>
        ) : terms ? (
          <Glossed key={i} text={p} seen={seen} />
        ) : (
          <Suits key={i} text={p} />
        ),
      )}
    </>
  );
}
