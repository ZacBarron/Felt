import type { BotCharacter } from '@felt/content';
import { useId } from 'react';

/**
 * A drawn bot portrait in the app's tint: line art on a tinted disc, the same
 * family as the tile icons. Drawn, never a photo, so a bot never passes for a
 * person.
 */
export function BotPortrait({ look, size = 40, active = false }: { look: BotCharacter['look']; size?: number; active?: boolean }) {
  const hair = 'var(--tint)';
  const clip = useId();
  return (
    <svg className={`bot-portrait${active ? ' active' : ''}`} width={size} height={size} viewBox="0 0 40 40" aria-hidden="true">
      <circle cx="20" cy="20" r="20" fill="color-mix(in srgb, var(--tint) 16%, var(--surface))" />
      <clipPath id={clip}>
        <circle cx="20" cy="20" r="20" />
      </clipPath>
      <g clipPath={`url(#${clip})`} stroke="var(--tint)" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round">
        {look.extra === 'hood' && <path d="M8 40V22a12 12 0 0 1 24 0v18" fill="color-mix(in srgb, var(--tint) 30%, var(--surface))" />}
        <path d="M6 42c1.5-7 7-10.5 14-10.5S32.5 35 34 42" fill="color-mix(in srgb, var(--tint) 34%, var(--surface))" />
        {look.hair === 'long' && <path d="M11 30V17a9 9 0 0 1 18 0v13" fill={hair} />}
        <circle cx="20" cy="18" r="7.6" fill="var(--surface)" />
        {look.hair === 'short' && <path d="M12.6 17a7.6 7.6 0 0 1 14.8-1.6c-3.6.2-8.4-.6-11.4-3.1-.9 1.8-2 3.5-3.4 4.7z" fill={hair} stroke="none" />}
        {look.hair === 'long' && <path d="M12.4 17.5a7.6 7.6 0 0 1 15.2 0c-4-.4-6.8-2.4-8-4.8-1.4 2.6-3.6 4.2-7.2 4.8z" fill={hair} stroke="none" />}
        {look.hair === 'curly' &&
          [13.5, 16.5, 20, 23.5, 26.5].map((x, i) => <circle key={x} cx={x} cy={i % 2 ? 10.6 : 11.8} r="2.6" fill={hair} stroke="none" />)}
        {look.hair === 'bun' && (
          <>
            <circle cx="20" cy="8.6" r="3" fill={hair} stroke="none" />
            <path d="M12.6 17a7.6 7.6 0 0 1 14.8 0c-3-.8-5.4-2.4-7.4-4.6-2 2.2-4.4 3.8-7.4 4.6z" fill={hair} stroke="none" />
          </>
        )}
        {look.hair === 'bald' && <path d="M15 12.6c1.4-.9 3.1-1.4 5-1.4" />}
        {look.extra === 'cap' && (
          <>
            <path d="M12.4 15.6a7.6 7.6 0 0 1 15.2 0z" fill={hair} />
            <path d="M26 15.6h5.2" strokeWidth="2.2" />
          </>
        )}
        {look.extra === 'shades' ? (
          <path d="M14.2 17.6h11.6v1.6a1.8 1.8 0 0 1-1.8 1.8h-2.4l-1.6-1.4-1.6 1.4H16a1.8 1.8 0 0 1-1.8-1.8z" fill={hair} />
        ) : (
          <>
            <circle cx="17.2" cy="18.4" r="0.9" fill="var(--tint)" stroke="none" />
            <circle cx="22.8" cy="18.4" r="0.9" fill="var(--tint)" stroke="none" />
          </>
        )}
        {look.extra === 'glasses' && (
          <>
            <circle cx="17.2" cy="18.4" r="2.4" fill="none" />
            <circle cx="22.8" cy="18.4" r="2.4" fill="none" />
            <path d="M19.6 18.4h0.8" />
          </>
        )}
        {look.extra === 'beard' ? <path d="M13.2 20.4c.6 4.4 3.4 5.6 6.8 5.6s6.2-1.2 6.8-5.6c-2 1.4-4.4 1.8-6.8 1.8s-4.8-.4-6.8-1.8z" fill={hair} /> : <path d="M17.6 22.2c1.4 1 3.4 1 4.8 0" />}
      </g>
    </svg>
  );
}
