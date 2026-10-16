/**
 * When Suited suggests saving progress to an account. Sign up is deferred
 * until after the player has something worth keeping (Duolingo asks after
 * the first lesson; see docs/MONETIZATION.md). It is asked once at the end
 * of onboarding, then at most one gentle card later: only after real
 * progress, at most once a week, and never again after two dismissals.
 */

const KEY = 'felt.accountPrompt.v1';
const DAY = 86_400_000;

export interface PromptState {
  /** When the end of onboarding offered an account. */
  onboardingAt?: string;
  /** When the Today card last appeared. */
  cardShownAt?: string;
  /** Times the Today card was closed. */
  dismissals: number;
  lastDismissedAt?: string;
}

export interface PromptProgress {
  lessonsDone: number;
  streak: number;
}

export const CARD_RULES = { lessons: 3, streak: 3, maxDismissals: 2, weekMs: 7 * DAY, visibleMs: DAY, afterOnboardingMs: 3 * DAY };

export function readPrompt(): PromptState {
  try {
    const saved = JSON.parse(localStorage.getItem(KEY) ?? '{}') as Partial<PromptState>;
    return { ...saved, dismissals: saved.dismissals ?? 0 };
  } catch {
    return { dismissals: 0 };
  }
}

function writePrompt(next: PromptState) {
  try {
    localStorage.setItem(KEY, JSON.stringify(next));
  } catch {
    // Storage blocked: the card may show again, which is harmless.
  }
}

/**
 * Whether the Today card shows. Pure, so the rules are tested. Once shown,
 * it stays for the rest of that day, then rests for a week.
 */
export function shouldShowCard(state: PromptState, progress: PromptProgress, now = new Date()): boolean {
  const t = now.getTime();
  const since = (iso?: string) => (iso ? t - Date.parse(iso) : Infinity);
  if (state.dismissals >= CARD_RULES.maxDismissals) return false;
  if (progress.lessonsDone < CARD_RULES.lessons && progress.streak < CARD_RULES.streak) return false;
  if (since(state.onboardingAt) < CARD_RULES.afterOnboardingMs) return false;
  if (since(state.lastDismissedAt) < CARD_RULES.weekMs) return false;
  const shown = since(state.cardShownAt);
  return shown < CARD_RULES.visibleMs || shown >= CARD_RULES.weekMs;
}

export function noteOnboardingPrompt(now = new Date()) {
  writePrompt({ ...readPrompt(), onboardingAt: now.toISOString() });
}

/** Records that the card appeared, unless it is already in its visible day. */
export function noteCardShown(now = new Date()) {
  const s = readPrompt();
  if (s.cardShownAt && now.getTime() - Date.parse(s.cardShownAt) < CARD_RULES.visibleMs) return;
  writePrompt({ ...s, cardShownAt: now.toISOString() });
}

export function noteCardDismissed(now = new Date()) {
  const s = readPrompt();
  writePrompt({ ...s, dismissals: s.dismissals + 1, lastDismissedAt: now.toISOString() });
}
