import { findTerms } from '@felt/content';
import { Fragment } from 'react';
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
 * Underlines glossary terms in plain text, each term once per block (`seen`
 * is shared across a block's parts). Bold text is not linked: a bold term is
 * the one being defined right there.
 */
function Glossed({ text, seen }: { text: string; seen: Set<string> }) {
  const out: React.ReactNode[] = [];
  let at = 0;
  for (const m of findTerms(text)) {
    if (seen.has(m.id)) continue;
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
