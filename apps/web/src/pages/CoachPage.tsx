import { type FormEvent, type KeyboardEvent, useEffect, useMemo, useRef, useState } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { MixBar } from '../components/MixBar';
import { actionLabels } from '../drills/labels';
import { haptic } from '../haptics';
import { ApiError, refreshMe, useSession } from '../state/api';
import { getChart } from '../state/charts';
import {
  askCoach,
  buildCoachContext,
  type Chat,
  type ChatMessage,
  type CoachContext,
  type CoachSpotRef,
  coachStatus,
  loadChat,
  MAX_QUESTION_CHARS,
  parseReply,
  type ReplyInline,
  saveChat,
  serverPro,
  starterPrompts,
  useCoachAvailable,
} from '../state/coach';
import { useSettings } from '../state/settings';
import { BottomBar } from '../ui/BottomBar';
import { CoachIcon, SendIcon } from '../ui/icons';
import { PageHeader } from '../ui/PageHeader';
import { EmptyState, Section } from '../ui/Section';
import { useBodyClass } from '../ui/useBodyClass';
import './coach.css';
import './screens.css';

const sameSpot = (a?: CoachSpotRef, b?: CoachSpotRef) => !!a && !!b && a.chartId === b.chartId && a.hand === b.hand && a.chose === b.chose;

/** A spot sent from a drill starts a fresh chat about it; otherwise the chat in this tab carries on. */
function initialChat(incoming?: CoachSpotRef): Chat {
  const saved = loadChat();
  if (incoming && !sameSpot(saved.spot, incoming)) return { messages: [], spot: incoming };
  return saved;
}

/**
 * The AI coach: questions about the player's own game, answered with their
 * Suited Rating, goals, game and recent misses in view. It needs the Suited
 * server with the coach turned on, a signed in player and Suited Pro.
 */
export function CoachPage() {
  const available = useCoachAvailable();
  const session = useSession();
  const location = useLocation();
  const incoming = (location.state as { spot?: CoachSpotRef } | null)?.spot;
  const [status, setStatus] = useState<{ pro: boolean; limit: number; remaining: number }>();

  useEffect(() => {
    if (!available || !session) return;
    // The server decides who can use the coach, so ask it rather than trusting this device.
    void refreshMe().catch(() => undefined);
    coachStatus()
      .then((s) => setStatus({ pro: s.pro, limit: s.limit, remaining: s.remaining }))
      .catch(() => undefined);
    // Once per visit and sign in.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [available, session?.token]);

  const pro = status ? status.pro : serverPro(session?.user);

  return (
    <div className="stack coach-page" style={{ gap: '1.2rem' }}>
      {available === undefined ? (
        <PageHeader title="Coach" back={{ to: '/learn', label: 'Learn' }} />
      ) : !available ? (
        <>
          <PageHeader title="Coach" back={{ to: '/learn', label: 'Learn' }} />
          <EmptyState
            art={<Art />}
            title="The coach is coming"
            body="Soon you can ask about any hand you play."
          />
        </>
      ) : !session ? (
        <>
          <PageHeader title="Coach" back={{ to: '/learn', label: 'Learn' }} />
          <Pitch signIn />
        </>
      ) : !pro ? (
        <>
          <PageHeader title="Coach" back={{ to: '/learn', label: 'Learn' }} />
          <Pitch />
        </>
      ) : (
        <Conversation incoming={incoming} limit={status?.limit} remaining={status?.remaining} onRemaining={(remaining) => setStatus((s) => (s ? { ...s, remaining } : s))} onLostPro={() => setStatus((s) => (s ? { ...s, pro: false } : s))} />
      )}
    </div>
  );
}

function Art() {
  return (
    <span className="sc-art-tile">
      <CoachIcon size={34} />
    </span>
  );
}

const PITCH = [
  { title: 'Ask why', body: 'Get the reason behind any chart answer you missed.' },
  { title: 'Know where to work', body: 'It reads your Suited Rating and recent misses. Then it picks what to study next.' },
  { title: 'Honest about numbers', body: 'It uses Suited’s charts when it has them. Anything else it labels as an estimate.' },
];

/**
 * For players without Suited Pro: what the coach does, the questions it would
 * start with for this player (from their own misses and weakest area), then
 * one way in. Guests also get a way to sign in, for when they already have Pro.
 */
function Pitch({ signIn = false }: { signIn?: boolean }) {
  const { settings } = useSettings();
  const [context, setContext] = useState<CoachContext>();
  useEffect(() => {
    void buildCoachContext(settings).then(setContext);
    // Once per visit.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);
  const prompts = starterPrompts(context, undefined, settings.profile.experience).slice(0, 3);
  return (
    <>
      <EmptyState art={<Art />} title="Your own poker coach" body="Ask about any hand or chart. Answers fit your level and your game." />
      <Section title="You could ask">
        <div className="list coach-asks">
          {prompts.map((p) => (
            <Link key={p} to="/pro?from=coach" className="list-row coach-ask">
              <span className="grow">{p}</span>
              <span className="pill">Pro</span>
            </Link>
          ))}
        </div>
      </Section>
      <div className="list coach-pitch">
        {PITCH.map((p) => (
          <div key={p.title} className="list-row">
            <span className="grow">
              <span style={{ display: 'block', fontWeight: 600 }}>{p.title}</span>
              <span className="footnote" style={{ display: 'block' }}>
                {p.body}
              </span>
            </span>
          </div>
        ))}
      </div>
      {signIn && (
        <p className="coach-signin footnote">
          Have Suited Pro already? <Link to="/account?next=/coach">Sign in to use it</Link>
        </p>
      )}
      <BottomBar>
        <Link to="/pro?from=coach" className="btn btn-primary btn-lg btn-block">
          See Suited Pro
        </Link>
      </BottomBar>
    </>
  );
}

interface ConversationProps {
  incoming?: CoachSpotRef;
  limit?: number;
  remaining?: number;
  onRemaining: (n: number) => void;
  onLostPro: () => void;
}

function Conversation({ incoming, limit, remaining, onRemaining, onLostPro }: ConversationProps) {
  useBodyClass('coach-mode');
  const { settings } = useSettings();
  const navigate = useNavigate();
  const [chat, setChat] = useState<Chat>(() => initialChat(incoming));
  // A missed question arrives as a draft, so the player reads it before it is sent.
  const location = useLocation();
  const [draft, setDraft] = useState(() => (location.state as { question?: string } | null)?.question ?? '');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<{ message: string; retry: boolean }>();
  const [preview, setPreview] = useState<CoachContext>();
  const end = useRef<HTMLDivElement>(null);
  const input = useRef<HTMLTextAreaElement>(null);

  useEffect(() => saveChat(chat), [chat]);

  // What the starter questions are tailored to. Sent context is rebuilt fresh with each question.
  useEffect(() => {
    void buildCoachContext(settings).then(setPreview);
    // Once per visit.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    if (chat.messages.length === 0 && !busy) return;
    end.current?.scrollIntoView({ behavior: matchMedia('(prefers-reduced-motion: reduce)').matches ? 'auto' : 'smooth', block: 'end' });
  }, [chat.messages.length, busy, error]);

  // The textarea grows with the question, up to about five lines.
  useEffect(() => {
    const el = input.current;
    if (!el) return;
    el.style.height = 'auto';
    el.style.height = `${Math.min(el.scrollHeight, 140)}px`;
  }, [draft]);

  const outOfMessages = remaining === 0;
  const last = chat.messages[chat.messages.length - 1];
  const unanswered = !busy && !error && last?.role === 'user';

  async function run(messages: ChatMessage[]) {
    setBusy(true);
    setError(undefined);
    try {
      const context = await buildCoachContext(settings, chat.spot);
      const res = await askCoach(messages, context);
      setChat((c) => ({ ...c, messages: [...messages, { role: 'assistant', content: res.reply, ...(res.refused ? { refused: true } : {}) }] }));
      onRemaining(res.remaining);
    } catch (e) {
      const status = e instanceof ApiError ? e.status : 0;
      if (status === 429) onRemaining(0);
      if (status === 403) onLostPro();
      haptic('error');
      setError({
        message: e instanceof Error ? e.message : 'The coach had a problem. Try again in a moment.',
        retry: status !== 429 && status !== 403 && status !== 400 && status !== 413,
      });
    } finally {
      setBusy(false);
    }
  }

  function send(text: string) {
    const question = text.trim().slice(0, MAX_QUESTION_CHARS);
    if (!question || busy || outOfMessages) return;
    const messages: ChatMessage[] = [...chat.messages, { role: 'user', content: question }];
    setChat((c) => ({ ...c, messages }));
    setDraft('');
    void run(messages);
  }

  function newChat() {
    setChat({ messages: [] });
    setError(undefined);
    setDraft('');
    // Drop the drill's spot from history too, so a reload does not bring it back.
    navigate('/coach', { replace: true, state: null });
  }

  const onSubmit = (e: FormEvent) => {
    e.preventDefault();
    send(draft);
  };

  // Enter sends on a keyboard; on a phone the return key adds a line.
  const onKeyDown = (e: KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey && !e.nativeEvent.isComposing && !matchMedia('(pointer: coarse)').matches) {
      e.preventDefault();
      send(draft);
    }
  };

  const prompts = useMemo(() => starterPrompts(preview, chat.spot, settings.profile.experience), [preview, chat.spot, settings.profile.experience]);
  const left = remaining === undefined ? undefined : remaining === 1 ? '1 message left today' : `${remaining} messages left today`;

  return (
    <>
      <PageHeader
        title="Coach"
        back={{ to: '/learn', label: 'Learn' }}
        trailing={
          (chat.messages.length > 0 || chat.spot) && (
            <button type="button" className="btn btn-tinted coach-new" onClick={newChat} disabled={busy}>
              Start new chat
            </button>
          )
        }
      />

      {chat.spot && <SpotCard spot={chat.spot} />}

      {chat.messages.length === 0 && (
        <div className={`coach-empty${chat.spot ? ' with-spot' : ''}`}>
          {!chat.spot && (
            <div className="coach-hello">
              <h2 className="coach-hello-title">{settings.profile.name?.trim() ? `Hi ${settings.profile.name.trim()}.` : 'Hi.'} What should we work on?</h2>
              <p className="coach-hello-sub">The coach knows your Suited Rating and your recent misses.</p>
            </div>
          )}
          <Section
            title="Try asking"
            info={
              <p>
                The coach uses Claude, an AI model made by Anthropic. Each question goes to it with a short summary of your study. The summary holds your Suited Rating, goals, game settings and recent misses.
              </p>
            }
            footer="The coach can be wrong. Check big decisions against your charts."
          >
            <div className="list coach-asks" role="group" aria-label="Starter questions">
              {prompts.map((p) => (
                <button key={p} type="button" className="list-row coach-ask" data-haptic="select" onClick={() => send(p)} disabled={busy || outOfMessages}>
                  <span className="grow">{p}</span>
                  <SendIcon size={16} className="coach-ask-icon" />
                </button>
              ))}
            </div>
          </Section>
        </div>
      )}

      {chat.messages.length > 0 && (
        <div className="coach-log" role="log" aria-label="Conversation with the coach">
          {chat.messages.map((m, i) =>
            m.role === 'user' ? (
              <div key={i} className="coach-msg coach-msg-user">
                <span className="sr-only">You: </span>
                {m.content}
              </div>
            ) : (
              <div key={i} className="coach-msg coach-msg-coach">
                <span className="sr-only">Coach: </span>
                <Reply text={m.content} />
                {!m.refused && <p className="coach-note">The coach can be wrong. Numbers are estimates unless they come from Suited’s charts.</p>}
              </div>
            ),
          )}
          {busy && (
            <div className="coach-msg coach-msg-coach coach-thinking" aria-label="The coach is thinking">
              <span />
              <span />
              <span />
            </div>
          )}
        </div>
      )}

      {error && (
        <div className="explain bad coach-error" role="alert">
          <p>{error.message}</p>
          {error.retry && (
            <button type="button" className="btn btn-tinted" onClick={() => void run(chat.messages)}>
              Try again
            </button>
          )}
        </div>
      )}
      {unanswered && (
        <div className="explain coach-error">
          <p>That question has no answer yet.</p>
          <button type="button" className="btn btn-tinted" onClick={() => void run(chat.messages)} disabled={outOfMessages}>
            Ask again
          </button>
        </div>
      )}
      <div ref={end} className="coach-end" />

      <BottomBar>
        <form className="coach-composer" onSubmit={onSubmit}>
          <textarea
            ref={input}
            rows={1}
            value={draft}
            maxLength={MAX_QUESTION_CHARS}
            onChange={(e) => setDraft(e.target.value)}
            onKeyDown={onKeyDown}
            placeholder={outOfMessages ? 'More messages at midnight' : 'Ask the coach'}
            aria-label="Your question"
            disabled={outOfMessages}
            enterKeyHint="send"
          />
          <button type="submit" className="coach-send" aria-label="Send question" disabled={busy || outOfMessages || !draft.trim()}>
            <SendIcon size={20} strokeWidth={2.25} />
          </button>
        </form>
        <p className="coach-left" aria-live="polite">
          {outOfMessages
            ? limit
              ? `You used all ${limit} messages today. You get more at midnight.`
              : 'You used today’s messages. You get more at midnight.'
            : (left ?? '\u00a0')}
        </p>
      </BottomBar>
    </>
  );
}

/** The drill hand the chat is about, with the chart's mix. */
function SpotCard({ spot }: { spot: CoachSpotRef }) {
  const chart = getChart(spot.chartId);
  if (!chart) return null;
  const mix = chart.mixes.get(spot.hand) ?? { fold: 1 };
  return (
    <div className="card stack coach-spot" style={{ gap: '0.6rem' }}>
      <div className="row between">
        <div>
          <div className="footnote">About this hand</div>
          <div className="coach-spot-title">
            {spot.hand} <span className="muted">{chart.spec.title}</span>
          </div>
        </div>
        {spot.verdict && <span className="pill">{spot.verdict}</span>}
      </div>
      <MixBar mix={mix} labels={actionLabels(chart)} />
      <p className="footnote" style={{ margin: 0 }}>
        {spot.chose ? `You chose ${spot.chose}. ` : ''}
        {chart.spec.source === 'starter-approx' ? 'The mix is from a Suited starter chart. It is approximate.' : 'The mix is from Suited’s chart.'}
      </p>
    </div>
  );
}

function Inline({ parts }: { parts: ReplyInline[] }) {
  return (
    <>
      {parts.map((p, i) => (p.bold ? <strong key={i}>{p.text}</strong> : <span key={i}>{p.text}</span>))}
    </>
  );
}

/** The coach's light Markdown, rendered as React elements. Nothing from the reply is treated as HTML. */
function Reply({ text }: { text: string }) {
  const blocks = useMemo(() => parseReply(text), [text]);
  return (
    <>
      {blocks.map((b, i) =>
        b.kind === 'p' ? (
          <p key={i}>
            <Inline parts={b.parts} />
          </p>
        ) : (
          <ul key={i}>
            {b.items.map((item, j) => (
              <li key={j}>
                <Inline parts={item} />
              </li>
            ))}
          </ul>
        ),
      )}
    </>
  );
}
