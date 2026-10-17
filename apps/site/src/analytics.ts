import { ATTRIBUTION_KEYS, cleanTag, type ClientEventName, type EventProps, referrerHost } from '@felt/core/analytics';
import { browserEnv, cachedConfig, flag, flushOnHide, observeErrors, observeVitals, refreshConfig, storedAttribution } from '../../web/src/analytics/browser';
import { type Analytics, createAnalytics } from '../../web/src/analytics/client';

/**
 * The site's analytics: cookieless, anonymous, sent to Aced's own server.
 * The same queue as the app (apps/web/src/analytics). Every event and its
 * properties are listed in docs/ANALYTICS.md.
 */

let client: Analytics | undefined;

export function track<N extends ClientEventName>(name: N, props?: EventProps<N>) {
  client?.track(name, props);
}

/** The tests this visitor is in, as the inline head script bucketed them. */
export function abVariants(): Record<string, string> {
  return (window as Window & { __acedAb?: Record<string, string> }).__acedAb ?? {};
}

/** hero_cta:daily,sticky_bar:off, for page views and CTA clicks. */
export const variantTag = (ab: Record<string, string>) =>
  Object.entries(ab)
    .map(([k, v]) => `${k}:${v}`)
    .join(',') || undefined;

/** Logs that this visitor saw a test's variant. Once per install and test. */
export function exposed(exp: string) {
  const v = abVariants()[exp];
  if (v) client?.exposure(exp, v);
}

/**
 * Stores first touch attribution (felt.attribution.v1) on the first visit:
 * the link tags if any, the landing path and the referring site. The app
 * reads the same key, since both live on one origin.
 */
export function storeFirstTouch(storage: Pick<Storage, 'getItem' | 'setItem'> | null, url: URL, referrer: string) {
  if (!storage) return;
  try {
    if (storage.getItem('felt.attribution.v1')) return;
    const found: Record<string, string | number> = {};
    for (const k of ATTRIBUTION_KEYS) {
      const v = cleanTag(url.searchParams.get(k));
      if (v) found[k] = v;
    }
    const ref = referrerHost(referrer, url.hostname);
    if (ref) found.referrer = ref;
    storage.setItem('felt.attribution.v1', JSON.stringify({ ...found, landing: url.pathname, at: Date.now() }));
  } catch {
    // Storage blocked: the page still works.
  }
}

export function startSiteAnalytics(apiUrl: string, platform: string, inApp: boolean) {
  const env = browserEnv();
  const url = new URL(location.href);
  storeFirstTouch(env.storage, url, document.referrer);
  const config = cachedConfig(env.storage);
  void refreshConfig(apiUrl, env.storage);
  if (!flag(config, 'analytics.enabled', true)) return undefined;
  client = createAnalytics({ app: 'site', endpoint: `${apiUrl}/api/events`, env, warn: import.meta.env.DEV ? (m) => console.warn(m) : undefined });
  flushOnHide(client);
  observeErrors(client, () => 'site');
  observeVitals(client, flag(config, 'analytics.vitals_sample', 0.25), () => 'site');

  const ab = abVariants();
  const attr = storedAttribution(env.storage) ?? {};
  // This visit's own tags, falling back to the first touch.
  const tag = (k: (typeof ATTRIBUTION_KEYS)[number]) => cleanTag(url.searchParams.get(k)) ?? attr[k];
  track('page_view', {
    utm_source: tag('utm_source'),
    utm_medium: tag('utm_medium'),
    utm_campaign: tag('utm_campaign'),
    utm_content: tag('utm_content'),
    src: tag('src'),
    loc: tag('loc'),
    ref: tag('ref'),
    path: cleanTag(url.pathname) ?? '/',
    referrer: referrerHost(document.referrer, url.hostname),
    platform,
    in_app: inApp,
    variant: variantTag(ab),
  });
  // The hero is above the fold: everyone in the hero test sees it on arrival.
  exposed('hero_cta');
  instrument(variantTag(ab));
  return client;
}

/** Listeners for the parts of the page that need no state from main.ts. */
function instrument(variant: string | undefined) {
  document.addEventListener(
    'click',
    (e) => {
      const el = (e.target as Element | null)?.closest<HTMLElement>('[data-cta], .nav-links a, [data-platform-link]');
      if (!el) return;
      if (el.dataset.cta) track('cta_click', { cta: el.dataset.cta, pos: el.dataset.pos, variant });
      else if (el.matches('[data-platform-link]')) track('platform_link_click', { platform: document.documentElement.dataset.platform });
      else track('nav_click', { target: cleanTag(el.getAttribute('href')?.replace(/^#/, '')) });
    },
    { capture: true },
  );

  if (!('IntersectionObserver' in window)) return;
  // Each section once, when half of it (or most of the screen) is in view.
  const seen = new Set<string>();
  const io = new IntersectionObserver(
    (entries) => {
      for (const e of entries) {
        if (!e.isIntersecting) continue;
        const el = e.target as HTMLElement;
        const name = el.id || el.classList[0];
        io.unobserve(el);
        if (!name || seen.has(name)) continue;
        seen.add(name);
        track('section_view', { section: cleanTag(name) });
      }
    },
    { threshold: 0.35 },
  );
  for (const s of document.querySelectorAll<HTMLElement>('main section')) io.observe(s);

  // Story steps once each.
  const steps = new Set<string>();
  const stepIo = new IntersectionObserver(
    (entries) => {
      for (const e of entries) {
        const step = (e.target as HTMLElement).dataset.story;
        if (e.isIntersecting && step && !steps.has(step)) {
          steps.add(step);
          track('story_step', { step });
        }
      }
    },
    { rootMargin: '-45% 0px -45% 0px' },
  );
  for (const s of document.querySelectorAll<HTMLElement>('[data-story]')) stepIo.observe(s);

  // The comparison table, once the player swipes it.
  const wrap = document.querySelector<HTMLElement>('.compare .table-wrap');
  let swiped = false;
  wrap?.addEventListener(
    'scroll',
    () => {
      if (swiped || wrap.scrollLeft < 24) return;
      swiped = true;
      track('compare_scrolled');
    },
    { passive: true },
  );

  // FAQ answers opened, by position.
  document.querySelectorAll<HTMLDetailsElement>('[data-faq] details').forEach((d, q) => {
    d.addEventListener('toggle', () => {
      if (d.open) track('faq_opened', { q });
    });
  });

  // Each clip, the first time it plays.
  const played = new Set<string>();
  for (const v of document.querySelectorAll<HTMLVideoElement>('video[data-clip]')) {
    v.addEventListener('playing', () => {
      const clip = v.dataset.clip;
      if (clip && !played.has(clip)) {
        played.add(clip);
        track('video_played', { clip });
      }
    });
  }
}
