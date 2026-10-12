import { cardStrength } from '@felt/core';
import { useLiveQuery } from 'dexie-react-hooks';
import { useState } from 'react';
import { Link } from 'react-router-dom';
import { SolverSpotQuiz } from '../drills/SavedCard';
import { db, type SavedItem, type StoredCard } from '../state/db';
import { lessonPath } from '../state/lessons';
import { SAVED_CHART } from '../state/review';
import { savedCardId, setNote, unsave } from '../state/saved';
import { BottomBar } from '../ui/BottomBar';
import { BookmarkIcon, LearnIcon, SolverIcon } from '../ui/icons';
import { PageHeader } from '../ui/PageHeader';

type Filter = 'all' | 'lesson-step' | 'solver-spot';

function dueLabel(card?: StoredCard) {
  if (!card) return 'New in review';
  const days = Math.round((card.due.getTime() - Date.now()) / 86_400_000);
  if (days <= 0) return 'Due now';
  return days === 1 ? 'Back tomorrow' : `Back in ${days} days`;
}

const STRENGTH = { new: 'New', learning: 'Learning', solid: 'Solid' } as const;

function SavedRow({ item, card }: { item: SavedItem; card?: StoredCard }) {
  const [open, setOpen] = useState(false);
  const [note, setNoteText] = useState(item.note ?? '');
  const Icon = item.kind === 'solver-spot' ? SolverIcon : LearnIcon;
  const strength = cardStrength(card?.fsrs);
  return (
    <div className="saved-item">
      <button className="list-row" aria-expanded={open} onClick={() => setOpen((o) => !o)}>
        <span className="saved-row-icon">
          <Icon size={18} />
        </span>
        <span className="grow" style={{ minWidth: 0 }}>
          <span className="saved-title">{item.title}</span>
          <span className="footnote">
            {item.source} · {dueLabel(card)}
          </span>
        </span>
        <span className={`pill ${strength === 'solid' ? 'pill-good' : strength === 'learning' ? 'pill-tint' : ''}`}>{STRENGTH[strength]}</span>
      </button>
      {open && (
        <div className="saved-detail reveal">
          {item.kind === 'solver-spot' && item.spot && <SolverSpotQuiz spot={item.spot} footer={false} />}
          <textarea
            className="saved-note-input"
            aria-label="Note"
            rows={2}
            placeholder="Why does this matter to you?"
            value={note}
            onChange={(e) => setNoteText(e.target.value)}
            onBlur={() => void setNote(item.id, note)}
          />
          <div className="row">
            {item.lessonKey && (
              <Link to={`${lessonPath(item.lessonKey)}?step=${item.step}`} className="btn">
                Open in lesson
              </Link>
            )}
            <button className="btn" style={{ color: 'var(--red)' }} onClick={() => void unsave(item.id)}>
              Remove
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

/** Everything the player kept, each one also a card in their review deck. */
export function SavedPage() {
  const [filter, setFilter] = useState<Filter>('all');
  const items = useLiveQuery(() => db.saved.orderBy('createdAt').reverse().toArray(), [], []);
  const cards = useLiveQuery(
    async () => new Map((await db.cards.where('chartId').equals(SAVED_CHART).toArray()).map((c) => [c.id, c])),
    [],
    new Map<string, StoredCard>(),
  );
  const shown = items.filter((i) => filter === 'all' || i.kind === filter);
  const due = items.filter((i) => {
    const c = cards.get(savedCardId(i.id));
    return !c || c.due <= new Date();
  }).length;

  return (
    <div className="stack" style={{ gap: '1.4rem' }}>
      <PageHeader title="Saved" back={{ to: '/more', label: 'More' }} subtitle={items.length ? `${items.length} saved, ${due} ready to review` : undefined} />

      {items.length === 0 ? (
        <div className="card stack" style={{ alignItems: 'center', textAlign: 'center', padding: '2.2rem 1.25rem', gap: '0.8rem' }}>
          <span className="saved-row-icon" style={{ width: 56, height: 56, borderRadius: 16 }}>
            <BookmarkIcon size={26} />
          </span>
          <h2 className="display" style={{ fontSize: '1.8rem', fontWeight: 400 }}>
            Keep what matters
          </h2>
          <p className="muted" style={{ margin: 0, maxWidth: 340 }}>
            Tap the bookmark on any lesson screen to save it. You can also save hands in the solver. Everything you save comes back in your daily review.
          </p>
          <Link to="/learn" className="btn btn-primary">
            Go to Learn
          </Link>
        </div>
      ) : (
        <>
          <div className="chips" role="group" aria-label="Filter">
            {(
              [
                ['all', 'All'],
                ['lesson-step', 'Lessons'],
                ['solver-spot', 'Solver spots'],
              ] as const
            ).map(([id, label]) => (
              <button key={id} className="chip" aria-pressed={filter === id} data-haptic="select" onClick={() => setFilter(id)}>
                {label}
              </button>
            ))}
          </div>
          <div className="list">
            {shown.map((i) => (
              <SavedRow key={i.id} item={i} card={cards.get(savedCardId(i.id))} />
            ))}
          </div>
          <BottomBar>
            <Link to="/review?deck=saved" className="btn btn-primary btn-lg btn-block">
              {due > 0 ? `Review ${due} saved ${due === 1 ? 'item' : 'items'}` : `Review all ${items.length} again`}
            </Link>
          </BottomBar>
        </>
      )}
    </div>
  );
}
