import { type Chart, chartFormatLabel, currentRating, isProvisional, SKILL_DOMAINS, stakesLabel, tierLabel, type SkillRating } from '@felt/core';
import { useEffect, useState } from 'react';
import { spotLine } from '../drills/labels';
import { api, type ServerUser, serverFeatures, useSession } from './api';
import { getChart } from './charts';
import { db } from './db';
import { EXPERIENCE, GOALS } from './goals';
import { entryFor } from './lessons';
import { DOMAIN_LABELS, ratingSnapshot } from './rating';
import type { AppSettings, Experience } from './settings';

/**
 * Felt's AI coach, on the Felt server. The app sends the conversation and a
 * small summary of the player's own study data; the server holds the key,
 * the prompt and the daily limit. The chat lives in this tab's session
 * storage, so it survives a reload and is gone when the tab closes.
 */

// Context -----------------------------------------------------------------------

interface RatingLine {
  rating: number;
  tier: string;
  stillSettling: boolean;
  answers: number;
}

/** A chart decision, described for the coach with the chart's own numbers. */
export interface CoachSpot {
  chart: string;
  game: string;
  hero: string;
  situation?: string;
  hand: string;
  chartMix: string;
  basis: 'baseline' | 'exploit';
  source: string;
  chose?: string;
  verdict?: string;
}

export interface CoachMiss {
  kind: 'chart decision' | 'lesson question';
  spot?: CoachSpot;
  lesson?: string;
  verdict: string;
}

/** What the coach knows about the player. Matches the fields the server keeps. */
export interface CoachContext {
  rating?: { overall: RatingLine; areas: (RatingLine & { area: string })[] };
  experience?: string;
  goals?: string[];
  target?: string;
  game?: { format: string; venue: string; tableSize: number; stackBb: number; stakes: string };
  recentMisses?: CoachMiss[];
  spot?: CoachSpot;
}

/** A spot handed to the coach from a drill, through navigation state. */
export interface CoachSpotRef {
  chartId: string;
  hand: string;
  chose?: string;
  verdict?: string;
}

const SOURCE_LABEL: Record<Chart['spec']['source'], string> = {
  'starter-approx': 'Felt starter chart (approximate)',
  'solver-import': 'Felt chart imported from a solver',
  custom: 'Custom chart',
};

/** "Raise 2.5bb 60%, Fold 40%", in the chart's action order, without zero entries. */
export function chartMixText(chart: Chart, hand: string): string {
  const mix = chart.mixes.get(hand) ?? { fold: 1 };
  const order = [...chart.spec.actions.map((a) => ({ id: a.id, label: a.label })), { id: 'fold', label: 'Fold' }];
  const parts = order.filter((a) => (mix[a.id] ?? 0) > 0.005).map((a) => `${a.label} ${Math.round((mix[a.id] ?? 0) * 100)}%`);
  return parts.length ? parts.join(', ') : 'Fold 100%';
}

export function chartSpot(ref: CoachSpotRef): CoachSpot | undefined {
  const chart = getChart(ref.chartId);
  if (!chart) return undefined;
  return {
    chart: chart.spec.title,
    game: chartFormatLabel(chart.spec),
    hero: chart.spec.hero,
    situation: spotLine(chart) || undefined,
    hand: ref.hand,
    chartMix: chartMixText(chart, ref.hand),
    basis: chart.spec.basis === 'exploit' ? 'exploit' : 'baseline',
    source: SOURCE_LABEL[chart.spec.source],
    chose: ref.chose,
    verdict: ref.verdict,
  };
}

const verdictFor = (score: number) => (score >= 0.6 ? 'Close' : 'Not quite');

/** The latest misses, newest first, one per decision. Only chart decisions and lesson questions. */
export async function recentMisses(limit = 6): Promise<CoachMiss[]> {
  const recent = await db.answers.orderBy('at').reverse().limit(300).toArray();
  const seen = new Set<string>();
  const out: CoachMiss[] = [];
  for (const a of recent) {
    if (out.length >= limit) break;
    if (seen.has(a.itemId)) continue;
    seen.add(a.itemId);
    // A later right answer to the same decision means it is no longer a miss.
    if (a.score >= 1) continue;
    if (a.itemId.startsWith('chart:')) {
      const rest = a.itemId.slice('chart:'.length);
      const cut = rest.lastIndexOf(':');
      const spot = cut > 0 ? chartSpot({ chartId: rest.slice(0, cut), hand: rest.slice(cut + 1) }) : undefined;
      if (spot) out.push({ kind: 'chart decision', spot, verdict: verdictFor(a.score) });
    } else if (a.itemId.startsWith('quiz:')) {
      const entry = entryFor(a.itemId.slice('quiz:'.length).split('#')[0]);
      if (entry) out.push({ kind: 'lesson question', lesson: `${entry.trackTitle}: ${entry.title}`, verdict: 'Not quite' });
    }
  }
  return out;
}

function ratingLine(r: SkillRating): RatingLine {
  const now = currentRating(r);
  return { rating: Math.round(now.rating), tier: tierLabel(now), stillSettling: now.games === 0 || isProvisional(now), answers: now.games };
}

export async function buildCoachContext(settings: AppSettings, spot?: CoachSpotRef): Promise<CoachContext> {
  const [snap, misses] = await Promise.all([ratingSnapshot(), recentMisses()]);
  const { profile, game } = settings;
  const areas = SKILL_DOMAINS.filter((d) => snap.domains[d].games > 0).map((d) => ({ area: DOMAIN_LABELS[d], ...ratingLine(snap.domains[d]) }));
  const experience = EXPERIENCE.find((e) => e.id === profile.experience);
  const goals = (profile.goals ?? []).map((g) => GOALS.find((x) => x.id === g)?.label ?? g);
  const current = spot ? chartSpot(spot) : undefined;
  return {
    ...(snap.overall.games > 0 ? { rating: { overall: ratingLine(snap.overall), areas } } : {}),
    ...(experience ? { experience: `${experience.label}. ${experience.note}` } : {}),
    ...(goals.length ? { goals } : {}),
    ...(profile.target ? { target: profile.target } : {}),
    game: {
      format: game.format === 'mtt' ? 'tournament' : 'cash',
      venue: game.venue,
      tableSize: game.tableSize,
      stackBb: game.stackBb,
      stakes: `${stakesLabel(game.stakes)} ${game.stakes.currency}`,
    },
    ...(misses.length ? { recentMisses: misses } : {}),
    ...(current ? { spot: current } : {}),
  };
}

// The conversation ---------------------------------------------------------------------

export interface ChatMessage {
  role: 'user' | 'assistant';
  content: string;
  /** The coach declined. The exchange stays on screen but is not sent again. */
  refused?: boolean;
}

export interface Chat {
  messages: ChatMessage[];
  spot?: CoachSpotRef;
}

const CHAT_KEY = 'felt.coach.chat.v1';

export function loadChat(): Chat {
  try {
    const raw = JSON.parse(sessionStorage.getItem(CHAT_KEY) ?? 'null') as Chat | null;
    if (raw && Array.isArray(raw.messages)) return raw;
  } catch {
    // Storage blocked or damaged: start fresh.
  }
  return { messages: [] };
}

export function saveChat(chat: Chat) {
  try {
    if (chat.messages.length || chat.spot) sessionStorage.setItem(CHAT_KEY, JSON.stringify(chat));
    else sessionStorage.removeItem(CHAT_KEY);
  } catch {
    // Storage blocked: the chat lasts until the page closes.
  }
}

/** Server limits, kept a little under so a long chat drops its oldest turns instead of failing. */
const SEND_MESSAGES = 24;
const SEND_CHARS = 24_000;

/**
 * The turns sent with a new question: refused exchanges are left out, then
 * the newest turns that fit, starting with a question.
 */
export function historyForRequest(messages: readonly ChatMessage[]): { role: 'user' | 'assistant'; content: string }[] {
  const kept: ChatMessage[] = [];
  for (let i = 0; i < messages.length; i++) {
    const m = messages[i];
    if (m.refused) continue;
    // The question that drew a refusal goes too.
    if (m.role === 'user' && messages[i + 1]?.refused) continue;
    kept.push(m);
  }
  const out: { role: 'user' | 'assistant'; content: string }[] = [];
  let chars = 0;
  for (let i = kept.length - 1; i >= 0 && out.length < SEND_MESSAGES; i--) {
    chars += kept[i].content.length;
    if (chars > SEND_CHARS && out.length > 0) break;
    out.unshift({ role: kept[i].role, content: kept[i].content });
  }
  while (out.length && out[0].role !== 'user') out.shift();
  return out;
}

export interface CoachReply {
  reply: string;
  remaining: number;
  refused?: boolean;
}

export const MAX_QUESTION_CHARS = 2000;

export function askCoach(messages: readonly ChatMessage[], context: CoachContext): Promise<CoachReply> {
  // Thinking takes a while; the server gives up first.
  return api<CoachReply>('/coach', { body: { messages: historyForRequest(messages), context }, timeoutMs: 150_000 });
}

export interface CoachStatus {
  on: boolean;
  pro: boolean;
  limit: number;
  remaining: number;
}

export const coachStatus = () => api<CoachStatus>('/coach');

// Availability -------------------------------------------------------------------------

/** Whether the server offers the coach: undefined while checking, false without a server. */
export function useCoachAvailable(): boolean | undefined {
  const [on, setOn] = useState<boolean>();
  useEffect(() => {
    let live = true;
    void serverFeatures().then((f) => live && setOn(!!f?.coach));
    return () => {
      live = false;
    };
  }, []);
  return on;
}

/** Pro as the server sees it. The server decides who can use the coach. */
export function serverPro(user: ServerUser | undefined, now = new Date()): boolean {
  if (!user?.access.pro) return false;
  return !user.access.until || new Date(user.access.until) > now;
}

/** True when this player can ask the coach right now: the server offers it and they are Pro there. */
export function useCanAskCoach(): boolean {
  const available = useCoachAvailable();
  const session = useSession();
  return !!available && serverPro(session?.user);
}

// Starter questions --------------------------------------------------------------------

/** Starter questions that fit the player: their spot, their misses, their weakest area, or the basics. */
export function starterPrompts(context: CoachContext | undefined, spot?: CoachSpotRef, experience?: Experience): string[] {
  if (spot) return [`Why is ${spot.hand} played this way here?`, 'Explain the mix for this hand', 'When would I play it differently?', 'What should I study next?'];
  const prompts: string[] = [];
  // What the player said at setup wins. Without it, a rating that is still settling suggests someone new.
  const beginner = experience ? experience === 'new' || experience === 'casual' : !context?.rating || context.rating.overall.stillSettling;
  if (context?.recentMisses?.length) prompts.push('Why did I miss my last hand?');
  prompts.push('What should I study next?');
  if (context?.rating?.areas.length) prompts.push('Explain my weakest area');
  if (beginner) prompts.push('Explain how stakes work', 'What does position mean?');
  else prompts.push('How do I play a mixed hand at the table?');
  prompts.push('How big should my bankroll be?');
  return prompts;
}

// Replies ------------------------------------------------------------------------------

export type ReplyInline = { text: string; bold?: boolean };
export type ReplyBlock = { kind: 'p'; parts: ReplyInline[] } | { kind: 'list'; items: ReplyInline[][] };

function inline(text: string): ReplyInline[] {
  return text
    .split(/(\*\*[^*]+\*\*)/)
    .filter(Boolean)
    .map((t) => (t.startsWith('**') && t.endsWith('**') && t.length > 4 ? { text: t.slice(2, -2), bold: true } : { text: t }));
}

/** The light Markdown the coach writes: paragraphs, "- " bullets and **bold**. Everything else stays text. */
export function parseReply(text: string): ReplyBlock[] {
  const blocks: ReplyBlock[] = [];
  for (const chunk of text.split(/\n\s*\n/)) {
    const lines = chunk.split('\n').map((l) => l.trim()).filter(Boolean);
    let para: string[] = [];
    let list: ReplyInline[][] = [];
    const flushPara = () => {
      if (para.length) blocks.push({ kind: 'p', parts: inline(para.join(' ').replace(/^#+\s*/, '')) });
      para = [];
    };
    const flushList = () => {
      if (list.length) blocks.push({ kind: 'list', items: list });
      list = [];
    };
    for (const line of lines) {
      const bullet = /^(?:[-*•]|\d+[.)])\s+(.*)$/.exec(line);
      if (bullet) {
        flushPara();
        list.push(inline(bullet[1]));
      } else {
        flushList();
        para.push(line);
      }
    }
    flushPara();
    flushList();
  }
  return blocks;
}
