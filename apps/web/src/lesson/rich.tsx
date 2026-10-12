import { Fragment } from 'react';

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

/** Renders **bold** spans and suit symbols in lesson copy. */
export function Rich({ text }: { text: string }) {
  const parts = text.split('**');
  return (
    <>
      {parts.map((p, i) =>
        i % 2 === 1 ? (
          <strong key={i}>
            <Suits text={p} />
          </strong>
        ) : (
          <Suits key={i} text={p} />
        ),
      )}
    </>
  );
}
