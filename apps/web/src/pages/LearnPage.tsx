import { CURRICULUM } from '@felt/content';
import { ChevronRightIcon } from '../ui/icons';
import { PageHeader } from '../ui/PageHeader';

const DRILL_LABELS: Record<string, string> = {
  'range-recall': 'Ranges',
  'spot-action': 'Spots',
  frequency: 'Frequencies',
  math: 'Math',
  'equity-estimate': 'Equity',
  concept: 'Concepts',
};

export function LearnPage() {
  return (
    <div className="stack" style={{ gap: '1.6rem' }}>
      <PageHeader title="Learn" subtitle="Short lessons that end in drills and feed your daily review. Lesson content is on the way." />
      {CURRICULUM.map((track) => (
        <section key={track.id}>
          <div className="section-title">{track.title}</div>
          <div className="list">
            {track.modules.map((m) => (
              <details key={m.id}>
                <summary className="list-row" data-haptic="select">
                  <span className="grow">{m.title}</span>
                  <span className="detail">{m.lessons.length}</span>
                  <ChevronRightIcon size={16} className="chev" />
                </summary>
                <div style={{ padding: '0 1rem 0.6rem' }}>
                  {m.lessons.map((l) => (
                    <div key={l.id} style={{ padding: '0.45rem 0 0.45rem 0.9rem', borderLeft: '2px solid var(--fill-2)' }}>
                      <div style={{ fontSize: '0.95rem' }}>{l.title}</div>
                      <div className="caption">{l.drills.map((d) => DRILL_LABELS[d] ?? d).join(', ')}</div>
                    </div>
                  ))}
                </div>
              </details>
            ))}
          </div>
          <div className="section-footer">{track.summary}</div>
        </section>
      ))}
    </div>
  );
}
