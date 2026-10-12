import { CURRICULUM } from '@felt/content';

export function LearnPage() {
  return (
    <div className="stack">
      <div>
        <h1>Learn</h1>
        <p className="muted">
          Every lesson is short, ends in drills, and feeds its cards into spaced review. Lesson content arrives in Phase 1 and
          beyond; this is the full map.
        </p>
      </div>
      {CURRICULUM.map((track) => (
        <section key={track.id} className="card stack" style={{ gap: '0.75rem' }}>
          <div>
            <h2>{track.title}</h2>
            <p className="muted">{track.summary}</p>
          </div>
          <div className="grid-3">
            {track.modules.map((m) => (
              <div key={m.id}>
                <strong>{m.title}</strong>
                <ul style={{ margin: '0.35rem 0 0', paddingLeft: '1.1rem' }}>
                  {m.lessons.map((l) => (
                    <li key={l.id}>
                      {l.title} <span className="muted" style={{ fontSize: '0.75rem' }}>{l.drills.join(', ')}</span>
                    </li>
                  ))}
                </ul>
              </div>
            ))}
          </div>
        </section>
      ))}
    </div>
  );
}
