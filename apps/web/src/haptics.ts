/**
 * Haptic feedback for the web.
 *
 * Android browsers support the Vibration API, so each kind gets its own
 * pattern. iOS Safari has no Vibration API, but since iOS 18 toggling a
 * `<input type="checkbox" switch>` plays the system selection tick, so iOS
 * gets one light tick per event (no patterns or strengths are possible).
 * Calls must come from a user gesture (a click) to be allowed.
 */

export type HapticKind = 'tap' | 'select' | 'success' | 'warning' | 'error' | 'heavy';

const PATTERNS: Record<HapticKind, number | number[]> = {
  select: 6,
  tap: 10,
  heavy: 22,
  success: [12, 70, 18],
  warning: [18, 90, 18],
  error: [28, 60, 28, 60, 28],
};

let enabled = true;
let iosSwitch: HTMLLabelElement | null = null;

const canVibrate = typeof navigator !== 'undefined' && typeof navigator.vibrate === 'function';
const isIOS =
  typeof navigator !== 'undefined' &&
  (/iPad|iPhone|iPod/.test(navigator.userAgent) || (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1));

export function setHapticsEnabled(on: boolean) {
  enabled = on;
}

export function hapticsSupported(): boolean {
  return canVibrate || isIOS;
}

function iosTick() {
  if (!iosSwitch) {
    const input = document.createElement('input');
    input.type = 'checkbox';
    input.setAttribute('switch', '');
    input.id = 'felt-haptic-switch';
    input.tabIndex = -1;
    input.setAttribute('aria-hidden', 'true');
    iosSwitch = document.createElement('label');
    iosSwitch.htmlFor = input.id;
    iosSwitch.setAttribute('aria-hidden', 'true');
    iosSwitch.dataset.haptic = 'off';
    iosSwitch.style.cssText = 'position:fixed;left:0;top:0;width:1px;height:1px;opacity:0;pointer-events:none;overflow:hidden;';
    iosSwitch.appendChild(input);
    document.body.appendChild(iosSwitch);
  }
  const active = document.activeElement as HTMLElement | null;
  iosSwitch.click();
  // Do not steal focus from whatever the user was typing in.
  if (active && active !== document.body) active.focus({ preventScroll: true });
}

export function haptic(kind: HapticKind = 'tap') {
  if (!enabled) return;
  try {
    if (canVibrate) navigator.vibrate(PATTERNS[kind]);
    else if (isIOS) iosTick();
  } catch {
    // Haptics are a nicety; never let them break an interaction.
  }
}

/**
 * One delegated listener gives every button, link and tab a light tap.
 * Elements that play their own feedback (answer buttons) opt out with
 * data-haptic="off"; others can pick a kind with data-haptic="select".
 */
export function installGlobalHaptics() {
  document.addEventListener(
    'click',
    (e) => {
      const el = (e.target as HTMLElement | null)?.closest<HTMLElement>('button, a, [role="tab"], [data-haptic]');
      if (!el || el.dataset.haptic === 'off' || (el as HTMLButtonElement).disabled) return;
      haptic((el.dataset.haptic as HapticKind | undefined) ?? 'tap');
    },
    { capture: true },
  );
  // iOS only applies :active styles when a touch listener exists.
  document.addEventListener('touchstart', () => {}, { passive: true });
}
