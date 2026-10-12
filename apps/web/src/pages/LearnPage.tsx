import { CURRICULUM } from '@felt/content';
import { Brain, Calculator, Crosshair, Grid3x3, Spline, type LucideIcon } from 'lucide-react';

const TRACK_ICONS: Record<string, { icon: LucideIcon; color: string }> = {
  foundations: { icon: Calculator, color: 'var(--suit-d)' },
  preflop: { icon: Grid3x3, color: 'var(--act-raise)' },
  postflop: { icon: Spline, color: 'var(--accent)' },
  exploit: { icon: Crosshair, color: 'var(--gold)' },
  mindset: { icon: Brain, color: '#b392f0' },
};

const DRILL_LABELS: Record<string, string> = {
  'range-recall': 'ranges',
  'spot-action': 'spots',
  frequency: 'frequencies',
  math: 'math',
  'equity-estimate': 'equity',
  concept: 'concepts',
};

export function LearnPage() {
  return (
    <div className="stack" style={{ gap: '1.1rem' }}>
      <div>
        <h1>Learn</h1>
        <p className="muted" style={{ margin: 0 }}>
          Short lessons that end in drills and feed your daily review. Lesson content is on the way; this is the full map.
        </p>
      </div>
      {CURRICULUM.map((track) => {
        const { icon: Icon, color } = TRACK_ICONS[track.id] ?? { icon: Grid3x3, color: 'var(--muted)' };
        const lessons = track.modules.reduce((n, m) => n + m.lessons.length, 0);
        return (
          <section key={track.id} className="card stack" style={{ gap: '0.9rem' }}>
            <div className="row" style={{ flexWrap: 'nowrap', alignItems: 'flex-start' }}>
              <span className="tile">
                <span className="icon" style={{ marginBottom: 0, width: 42, height: 42, borderRadius: 12, color }}>
                  <Icon size={21} />
                </span>
              </span>
              <div style={{ flex: 1 }}>
                <h2 style={{ margin: 0 }}>{track.title}</h2>
                <div className="muted" style={{ fontSize: '0.88rem' }}>
                  {track.summary}
                </div>
              </div>
              <span className="pill num">{lessons} lessons</span>
            </div>
            <div className="grid-3" style={{ gap: '0.75rem' }}>
              {track.modules.map((m) => (
                <div key={m.id} className="card-flat" style={{ padding: '0.8rem 0.9rem' }}>
                  <div style={{ fontWeight: 700, marginBottom: '0.4rem' }}>{m.title}</div>
                  <div className="stack" style={{ gap: '0.45rem' }}>
                    {m.lessons.map((l) => (
                      <div key={l.id} style={{ display: 'flex', gap: '0.55rem', alignItems: 'baseline' }}>
                        <span style={{ width: 6, height: 6, borderRadius: 3, background: color, flex: 'none', transform: 'translateY(-2px)' }} />
                        <div>
                          <div style={{ fontSize: '0.9rem' }}>{l.title}</div>
                          <div className="faint" style={{ fontSize: '0.72rem' }}>
                            {l.drills.map((d) => DRILL_LABELS[d] ?? d).join(' · ')}
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          </section>
        );
      })}
    </div>
  );
}
