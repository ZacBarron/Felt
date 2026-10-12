import { Fragment } from 'react';

/** Renders **bold** spans in lesson copy. */
export function Rich({ text }: { text: string }) {
  const parts = text.split('**');
  return (
    <>
      {parts.map((p, i) => (i % 2 === 1 ? <strong key={i}>{p}</strong> : <Fragment key={i}>{p}</Fragment>))}
    </>
  );
}
