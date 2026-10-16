import { type SkillRating, type Tier, TIERS, tierProgress, type TierProgress } from '@felt/core';
import { useEffect, useRef, useState } from 'react';
import { ChevronRightIcon } from '../ui/icons';
import { Section } from '../ui/Section';
import './tiers.css';

/** Points to one decimal under 10, whole points above. Never rounded up for the player. */
const pts = (x: number) => (x >= 10 ? Math.round(x) : Math.round(x * 10) / 10).toLocaleString();

const range = (t: Tier) => (t.min === -Infinity ? `Below ${TIERS[1].min}` : `From ${t.min}`);

function settleLine(p: TierProgress) {
  const { atLevel, inPractice } = p.answersToSettle!;
  const n = atLevel === inPractice ? `${atLevel}` : `${atLevel} to ${inPractice}`;
  return `Your rating settles after about ${n} more answers. Then you get a tier.`;
}

/**
 * Your tier on the You page: how players at this rating think, how far the
 * next tier is in points and in answers, and a tap to the whole ladder. The
 * answer count is our estimate from the rating's own update rule.
 */
export function TierCard({ rating }: { rating: SkillRating }) {
  const [open, setOpen] = useState(false);
  const p = tierProgress(rating);
  const info = (
    <>
      <p>
        Each tier names the question players at that rating tend to ask. Felt measures your answers, not your thoughts. So the questions are a guide
        and the rating is the measurement.
      </p>
      {!p.settling && (
        <p>
          Questions at your level are ones you get right about half the time. There a right answer adds about {pts(p.perRight)} points and a miss
          takes {pts(p.perRight)} away. In practice you get about {Math.round(p.practice.expected * 10)} in 10 right. A right answer there adds about{' '}
          {pts(p.practice.perRight)} points and a miss costs about {pts(p.practice.perMiss)}. Your rating climbs when you beat what it expects.
        </p>
      )}
      <p>The count of answers is our estimate. It depends on the questions you get.</p>
    </>
  );
  return (
    <Section title="Your tier" info={info}>
      <div className="list tier-card">
        <div className="tier-card-body">
          <div className="row between" style={{ alignItems: 'baseline', flexWrap: 'nowrap' }}>
            <span className="display tier-card-name">{p.settling ? 'Still settling' : p.tier.name}</span>
            {!p.settling && <span className="footnote num">{range(p.tier)}</span>}
          </div>
          {p.settling ? (
            <p className="tier-card-line">{settleLine(p)}</p>
          ) : (
            <>
              <p className="tier-card-thinks">“{p.tier.thinks}”</p>
              {p.next ? (
                <div className="tier-card-progress">
                  <div className="row between footnote">
                    <span className="num">
                      {p.pointsAway} points to {p.next.name}
                    </span>
                    <span className="num">{p.next.min}</span>
                  </div>
                  <span
                    className="tier-card-bar"
                    role="progressbar"
                    aria-label={`Progress to ${p.next.name}`}
                    aria-valuemin={0}
                    aria-valuemax={100}
                    aria-valuenow={Math.round(p.progress! * 100)}
                  >
                    <span style={{ width: `${Math.max(2, p.progress! * 100)}%` }} />
                  </span>
                  <p className="tier-card-line">
                    That is about <span className="num">{p.rightAnswers}</span> more right answers than misses at your level.
                  </p>
                </div>
              ) : (
                <p className="tier-card-line">You are in the top tier. Felt cannot measure higher than this yet.</p>
              )}
            </>
          )}
        </div>
        <button className="list-row" onClick={() => setOpen(true)}>
          <span className="grow" style={{ color: 'var(--tint)', fontWeight: 600 }}>
            See all tiers
          </span>
          <ChevronRightIcon size={16} className="chev" />
        </button>
      </div>
      <TierLadderSheet open={open} onClose={() => setOpen(false)} progress={p} />
    </Section>
  );
}

/** Every tier, top first, with where you are and what comes next. */
export function TierLadderSheet({ open, onClose, progress }: { open: boolean; onClose: () => void; progress: TierProgress }) {
  const ref = useRef<HTMLDialogElement>(null);
  useEffect(() => {
    const d = ref.current;
    if (!d) return;
    if (open && !d.open) {
      d.showModal();
      // Start with your tier in view; a low tier sits near the bottom of the ladder.
      d.querySelector('.ladder-row.here')?.scrollIntoView({ block: 'nearest' });
    }
    if (!open && d.open) d.close();
  }, [open]);
  const here = progress.settling ? undefined : progress.tier.name;
  const next = progress.next?.name;
  return (
    <dialog
      ref={ref}
      className="sheet"
      aria-labelledby="ladder-title"
      onClose={onClose}
      onClick={(e) => {
        // A tap on the dimmed backdrop closes the sheet.
        if (e.target === ref.current) onClose();
      }}
    >
      <div className="sheet-body stack" style={{ gap: '1rem' }}>
        <div className="sheet-grabber" aria-hidden="true" />
        <div className="row between">
          <h2 id="ladder-title" style={{ margin: 0, fontSize: '1.25rem' }}>
            The tiers
          </h2>
          <button className="btn btn-plain" onClick={onClose}>
            Done
          </button>
        </div>
        <p className="footnote ladder-intro">
          Each tier asks a deeper question about the hand. Felt measures your answers, not your thoughts. So the questions are a guide.
        </p>
        <ol className="list ladder-list">
          {[...TIERS].reverse().map((t) => (
            <li key={t.name} className={`list-row ladder-row${t.name === here ? ' here' : ''}`} aria-current={t.name === here ? 'step' : undefined}>
              <span className="grow" style={{ minWidth: 0 }}>
                <span className="row between" style={{ flexWrap: 'nowrap', gap: '0.5rem' }}>
                  <span className="ladder-name">{t.name}</span>
                  <span className="row" style={{ gap: '0.4rem', flexWrap: 'nowrap' }}>
                    {t.name === here && <span className="pill pill-tint">You are here</span>}
                    {t.name === next && <span className="pill ladder-next">Next</span>}
                    <span className="footnote num">{range(t)}</span>
                  </span>
                </span>
                <span className="ladder-thinks">“{t.thinks}”</span>
                <span className="footnote ladder-skills">{t.skills}</span>
              </span>
            </li>
          ))}
        </ol>
        {progress.settling && <p className="footnote ladder-intro">{settleLine(progress)}</p>}
      </div>
    </dialog>
  );
}
