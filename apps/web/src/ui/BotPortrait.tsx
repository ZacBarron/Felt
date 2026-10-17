import type { BotCharacter } from '@felt/content';
import { type CSSProperties, useState } from 'react';

/** Where a bot's pre-drawn portrait lives: `public/bots`, drawn by `scripts/make-bot-avatars.mjs`. */
export function botAvatarUrl(seed: string, base: string = import.meta.env.BASE_URL ?? '/'): string {
  return `${base.endsWith('/') ? base : `${base}/`}bots/${encodeURIComponent(seed)}.svg`;
}

/**
 * A bot's drawn portrait on a disc tinted by its player type, so a lineup
 * shows its mix at a glance. Drawn, never a photo, so a bot never passes for
 * a person. The image is a small static file, loaded only when shown and
 * cached for offline play. If it cannot load, the disc shows the initial.
 */
export function BotPortrait({ bot, size = 40, active = false }: { bot: Pick<BotCharacter, 'avatar' | 'type' | 'name'>; size?: number; active?: boolean }) {
  const [failed, setFailed] = useState(false);
  return (
    <span
      className={`bot-portrait${active ? ' active' : ''}`}
      style={{ width: size, height: size, fontSize: size * 0.42, '--bot-bg': `var(--bot-${bot.type}, var(--fill-2))` } as CSSProperties}
      aria-hidden="true"
    >
      {failed ? (
        bot.name.slice(0, 1)
      ) : (
        <img src={botAvatarUrl(bot.avatar)} alt="" width={size} height={size} decoding="async" draggable={false} onError={() => setFailed(true)} />
      )}
    </span>
  );
}
