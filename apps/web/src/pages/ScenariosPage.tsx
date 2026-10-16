import { SCENARIOS, type ScenarioSpec } from '@felt/content';
import { DIFFICULTY, handClassOf, parseCards, scoreRecall } from '@felt/core';
import { useLiveQuery } from 'dexie-react-hooks';
import { useEffect, useMemo, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { PlayingCard } from '../components/PlayingCard';
import { actionColor } from '../components/actionColors';
import { chartChoices } from '../drills/DecisionItem';
import { actionLabels } from '../drills/labels';
import { haptic } from '../haptics';
import type { HandView } from '../solver/protocol';
import { getChart } from '../state/charts';
import { db } from '../state/db';
import { track } from '../state/events';
import { recordRated } from '../state/rating';
import { gradeChoice, type RiverResult, solveRiver } from '../state/scenarioSolve';
import { BottomBar } from '../ui/BottomBar';
import { ChevronRightIcon, CloseIcon } from '../ui/icons';
import { PageHeader } from '../ui/PageHeader';
import { Section } from '../ui/Section';
import './screens.css';
import { useBodyClass } from '../ui/useBodyClass';

export const GRADE_TEXT = { best: 'Best play', good: 'Good play', inaccuracy: 'Inaccuracy', mistake: 'Mistake', blunder: 'Blunder' } as const;

/** Readable action names from solver ids: bet75 is a bet of 75% of the pot. */
export function actionText(id: string, label: string) {
  if (id === 'check') return 'Check';
  if (id === 'call') return 'Call';
  if (id === 'fold') return 'Fold';
  if (id === 'allin') return 'All in';
  const m = id.match(/^(bet|raise)(\d+)$/);
  const bb = label.match(/[\d.]+/)?.[0];
  if (m) return `${m[1] === 'bet' ? 'Bet' : 'Raise'} ${m[2]}% pot${bb ? ` (${bb}bb)` : ''}`;
  return label;
}

export function lineText(id: string, who: string) {
  const you = who === 'You';
  if (id === 'check') return `${who} ${you ? 'check' : 'checks'}.`;
  if (id === 'call') return `${who} ${you ? 'call' : 'calls'}.`;
  const m = id.match(/^(bet|raise)(\d+)$/);
  if (m) return `${who} ${m[1] === 'bet' ? (you ? 'bet' : 'bets') : you ? 'raise' : 'raises'} ${m[2]}% of the pot.`;
  return `${who} ${you ? 'go' : 'goes'} all in.`;
}

export function Board({ cards }: { cards: string }) {
  const list = cards.match(/.{2}/g) ?? [];
  return (
    <div className="row felt-strip scenario-board" style={{ justifyContent: 'center', gap: 8 }}>
      {list.map((c, i) => (
        <PlayingCard key={c} card={parseCards(c)[0]} size="md" deal delayMs={i * 70} />
      ))}
    </div>
  );
}

export function ScenariosPage() {
  const { id } = useParams();
  const scenario = SCENARIOS.find((s) => s.id === id);
  if (id && scenario) return <ScenarioPlayer key={scenario.id} scenario={scenario} />;
  return <ScenarioList />;
}

function HoleCards({ cards, size }: { cards: string; size: 'sm' | 'md' }) {
  return (
    <span className={size === 'md' ? 'sc-next-cards' : 'sc-row-cards'} aria-hidden="true">
      {(cards.match(/.{2}/g) ?? []).map((c) => (
        <PlayingCard key={c} card={parseCards(c)[0]} size={size} />
      ))}
    </span>
  );
}

function ScenarioList() {
  const results = useLiveQuery(() => db.scenarios.toArray(), [], []);
  const byId = new Map(results.map((r) => [r.id, r]));
  const next = SCENARIOS.find((s) => !byId.has(s.id)) ?? SCENARIOS[0];
  return (
    <div className="stack" style={{ gap: '1.4rem' }}>
      <PageHeader title="Scenarios" subtitle="Graded by Suited Solver" back={{ to: '/more', label: 'More' }} />
      {SCENARIOS.length === 0 ? (
        <p className="muted">Scenarios are on their way.</p>
      ) : (
        <>
          {next && (
            <Link to={`/scenarios/${next.id}`} className="sc-next" aria-label={`${byId.size === 0 ? 'Start here' : 'Up next'}: ${next.title}. ${next.summary}`}>
              <HoleCards cards={next.hero.cards} size="md" />
              <span className="grow" style={{ minWidth: 0 }}>
                <span className="sc-next-kicker">{byId.size === 0 ? 'Start here' : 'Up next'}</span>
                <span className="sc-next-title">{next.title}</span>
                <span className="sc-next-meta">
                  {next.hero.seat} vs {next.villain.seat}, 100bb
                </span>
              </span>
              <span className="sc-next-go" aria-hidden="true">
                <ChevronRightIcon size={18} />
              </span>
            </Link>
          )}
          <Section
            title="All scenarios"
            info={
              <p>
                Play each hand street by street. Suited Solver solves the river on your device for the ranges in the hand. The grade is exact for those ranges.
              </p>
            }
          >
            <div className="list" style={{ '--sep-inset': '5.4rem' } as React.CSSProperties}>
              {SCENARIOS.map((s) => {
                const r = byId.get(s.id);
                return (
                  <Link key={s.id} to={`/scenarios/${s.id}`} className="list-row">
                    <HoleCards cards={s.hero.cards} size="sm" />
                    <span className="grow">
                      <span style={{ display: 'block', fontWeight: 600 }}>{s.title}</span>
                      <span className="footnote">
                        {s.hero.seat} vs {s.villain.seat}
                        {s.level === 'advanced' && (
                          <span className="pill" style={{ marginLeft: 6 }}>
                            Advanced
                          </span>
                        )}
                      </span>
                    </span>
                    {r && <span className={`pill grade-pill grade-${r.grade}`}>{GRADE_TEXT[r.grade]}</span>}
                    <ChevronRightIcon size={14} className="chev" />
                  </Link>
                );
              })}
            </div>
          </Section>
        </>
      )}
    </div>
  );
}

type Stage = { kind: 'preflop' } | { kind: 'street'; index: number } | { kind: 'river' } | { kind: 'done' };

function ScenarioPlayer({ scenario }: { scenario: ScenarioSpec }) {
  useBodyClass('focus-mode');
  const navigate = useNavigate();
  const [stage, setStage] = useState<Stage>({ kind: 'preflop' });
  const [preflopChoice, setPreflopChoice] = useState<string>();
  const [river, setRiver] = useState<RiverResult>();
  const [riverError, setRiverError] = useState<string>();
  const [choice, setChoice] = useState<number>();

  // Solve the river as soon as the hand opens, so it is ready by the time you get there.
  useEffect(() => {
    let live = true;
    solveRiver(scenario.river, scenario.hero.cards)
      .then((r) => live && setRiver(r))
      .catch((e) => live && setRiverError(e instanceof Error ? e.message : 'The solver could not finish this spot.'));
    track('scenario_started', { id: scenario.id });
    return () => {
      live = false;
    };
  }, [scenario]);

  const chart = getChart(scenario.preflop.chartId);
  const heroClass = handClassOf(...(parseCards(scenario.hero.cards) as [number, number]));
  const mix = chart?.mixes.get(heroClass) ?? { fold: 1 };
  const labels = chart ? actionLabels(chart) : {};
  const preflopScore = preflopChoice ? scoreRecall(mix, preflopChoice) : undefined;
  const heroSide = scenario.river.hero === 0 ? 'out of position' : 'in position';
  const villain = scenario.villain.seat;

  const next = () => {
    window.scrollTo({ top: 0 });
    setStage((s) =>
      s.kind === 'preflop'
        ? scenario.streets.length
          ? { kind: 'street', index: 0 }
          : { kind: 'river' }
        : s.kind === 'street'
          ? s.index + 1 < scenario.streets.length
            ? { kind: 'street', index: s.index + 1 }
            : { kind: 'river' }
          : { kind: 'done' },
    );
  };

  const chooseRiver = (i: number) => {
    if (!river || choice !== undefined) return;
    setChoice(i);
    const g = gradeChoice(river.hand, i);
    const score = g.grade === 'best' || g.grade === 'good' ? 1 : g.grade === 'inaccuracy' ? 0.5 : 0;
    haptic(score === 1 ? 'success' : score > 0 ? 'warning' : 'error');
    void recordRated({ itemId: `scenario:${scenario.id}`, domain: 'postflop', difficulty: DIFFICULTY.scenarioRiver, score, source: 'review' });
    void db.scenarios.put({ id: scenario.id, at: new Date(), grade: g.grade, preflopRight: preflopScore === 1, lossBb: g.lossBb });
    track('scenario_graded', { id: scenario.id, grade: g.grade });
  };

  const graded = river && choice !== undefined ? gradeChoice(river.hand, choice) : undefined;

  return (
    <div className="stack focus-column scenario">
      <div className="focus-top">
        <button className="icon-btn glass" aria-label="Close scenario" onClick={() => navigate('/scenarios')}>
          <CloseIcon size={18} />
        </button>
        <span className="grow footnote">{scenario.title}</span>
      </div>

      {stage.kind === 'preflop' && (
        <>
          <div className="card stack" style={{ gap: '0.8rem' }}>
            <div>
              <div className="footnote">{chart?.spec.versus ?? 'Folded to you'}</div>
              <div style={{ fontWeight: 700, fontSize: '1.3rem' }}>
                You are {scenario.hero.seat}
                <span className="muted" style={{ fontWeight: 500, fontSize: '1rem' }}>
                  {' '}
                  9-handed, 100bb
                </span>
              </div>
            </div>
            <div className="row felt-strip" style={{ justifyContent: 'center', gap: 12 }}>
              {(scenario.hero.cards.match(/.{2}/g) ?? []).map((c, i) => (
                <PlayingCard key={c} card={parseCards(c)[0]} size="lg" flip delayMs={i * 90} />
              ))}
            </div>
            {preflopChoice && (
              <div className="stack reveal" style={{ gap: '0.4rem' }} role="status">
                <strong className={preflopScore === 1 ? 'green-text' : preflopScore ? 'orange-text' : 'red-text'}>
                  {preflopScore === 1 ? 'Correct' : preflopScore ? 'Part of the mix' : 'Not quite'}
                </strong>
                <span className="footnote">
                  The chart plays {heroClass}:{' '}
                  {Object.entries(mix)
                    .sort((a, b) => b[1] - a[1])
                    .map(([a, f]) => `${labels[a] ?? a} ${Math.round(f * 100)}%`)
                    .join(', ')}
                  .
                </span>
                <p style={{ margin: 0 }}>{scenario.preflop.narrative}</p>
              </div>
            )}
          </div>
          <BottomBar>
            {!preflopChoice && chart ? (
              <div style={{ display: 'grid', gridTemplateColumns: `repeat(${chartChoices(chart).length}, minmax(0, 1fr))`, gap: 8 }}>
                {chartChoices(chart).map((c) => (
                  <button
                    key={c}
                    className="btn btn-lg btn-action"
                    style={{ '--c': actionColor(c) } as React.CSSProperties}
                    onClick={() => setPreflopChoice(c)}
                  >
                    {labels[c] ?? c}
                  </button>
                ))}
              </div>
            ) : (
              <button className="btn btn-primary btn-lg btn-block" onClick={next}>
                Go to the flop
              </button>
            )}
          </BottomBar>
        </>
      )}

      {stage.kind === 'street' && (
        <>
          <div className="card stack" style={{ gap: '0.8rem' }}>
            <div className="footnote">{stage.index === 0 ? 'Flop' : 'Turn'}</div>
            <Board cards={scenario.streets[stage.index].board} />
            <p style={{ margin: 0 }}>{scenario.streets[stage.index].narrative}</p>
            {scenario.streets[stage.index].note && (
              <p className="footnote" style={{ margin: 0 }}>
                {scenario.streets[stage.index].note}
              </p>
            )}
          </div>
          <BottomBar>
            <button className="btn btn-primary btn-lg btn-block" onClick={next}>
              {stage.index + 1 < scenario.streets.length ? 'Go to the turn' : 'Go to the river'}
            </button>
          </BottomBar>
        </>
      )}

      {stage.kind === 'river' && (
        <>
          <div className="card stack" style={{ gap: '0.8rem' }}>
            <div className="row between">
              <span className="footnote">River</span>
              <span className="footnote num">
                Pot {scenario.river.pot}bb, {scenario.river.stack}bb behind
              </span>
            </div>
            <Board cards={scenario.river.board} />
            <p style={{ margin: 0 }}>
              You are {heroSide} with{' '}
              <span className="num" style={{ fontWeight: 650 }}>
                {heroClass}
              </span>
              .{' '}
              {scenario.river.line.length === 0
                ? 'You act first.'
                : scenario.river.line.map((id, i) => lineText(id, (i % 2 === 0) === (scenario.river.hero === 1) ? villain : 'You')).join(' ')}{' '}
              What do you do?
            </p>
            {graded && river && (
              <RiverResultView hand={river.hand} chosen={choice!} graded={graded} explain={scenario.river.explain} exploitability={river.exploitability} />
            )}
            {riverError && (
              <div className="explain bad" role="alert">
                {riverError}
              </div>
            )}
          </div>
          <BottomBar>
            {!river && !riverError ? (
              <button className="btn btn-lg btn-block" disabled>
                Suited Solver is solving the river…
              </button>
            ) : choice === undefined && river ? (
              <div className="stack" style={{ gap: 8 }}>
                {river.hand.actions.map((a, i) => (
                  <button
                    key={a.id}
                    className="btn btn-lg btn-block btn-action"
                    style={{ '--c': actionColor(a.id) } as React.CSSProperties}
                    onClick={() => chooseRiver(i)}
                  >
                    {actionText(a.id, a.label)}
                  </button>
                ))}
              </div>
            ) : (
              <button className="btn btn-primary btn-lg btn-block" onClick={() => setStage({ kind: 'done' })}>
                Finish hand
              </button>
            )}
          </BottomBar>
        </>
      )}

      {stage.kind === 'done' && <ScenarioDone scenario={scenario} />}
    </div>
  );
}

export function RiverResultView({
  hand,
  chosen,
  graded,
  explain,
  exploitability,
}: {
  hand: HandView;
  chosen: number;
  graded: ReturnType<typeof gradeChoice>;
  explain: string;
  exploitability: number;
}) {
  const order = useMemo(() => hand.actions.map((_, i) => i).sort((a, b) => hand.strategy[b] - hand.strategy[a]), [hand]);
  return (
    <div className="stack reveal" style={{ gap: '0.7rem' }} role="status">
      <strong className={`grade-${graded.grade}`} style={{ fontSize: '1.2rem' }}>
        {GRADE_TEXT[graded.grade]}
      </strong>
      <p className="footnote" style={{ margin: 0 }}>
        {graded.grade === 'best'
          ? 'You picked the action with the highest EV for your hand.'
          : `You gave up ${graded.lossBb.toFixed(2)}bb against ${actionText(hand.actions[graded.best].id, hand.actions[graded.best].label).toLowerCase()}. That is ${(graded.lossPct * 100).toFixed(1)}% of the pot.`}
      </p>
      <div className="list scenario-actions">
        {order.map((i) => (
          <div key={hand.actions[i].id} className={`list-row${i === chosen ? ' chosen' : ''}`}>
            <span className="grow">
              <span style={{ display: 'block', fontWeight: i === chosen ? 650 : 500 }}>
                {actionText(hand.actions[i].id, hand.actions[i].label)}
                {i === chosen && <span className="footnote"> (your play)</span>}
              </span>
              <span className="scenario-bar" aria-hidden="true">
                <span style={{ width: `${hand.strategy[i] * 100}%`, background: actionColor(hand.actions[i].id) }} />
              </span>
            </span>
            <span className="footnote num" style={{ textAlign: 'right' }}>
              Solver {Math.round(hand.strategy[i] * 100)}%
              <br />
              EV {hand.evs[i].toFixed(2)}bb
            </span>
          </div>
        ))}
      </div>
      <p style={{ margin: 0 }}>{explain}</p>
      <p className="footnote" style={{ margin: 0 }}>
        Solved by Suited Solver to {exploitability.toFixed(2)}% of the pot. EV here is what your hand wins from this point on average, for the ranges in this
        hand.
      </p>
    </div>
  );
}

function ScenarioDone({ scenario }: { scenario: ScenarioSpec }) {
  const i = SCENARIOS.findIndex((s) => s.id === scenario.id);
  const next = SCENARIOS[i + 1];
  return (
    <>
      <div className="card stack reveal" style={{ gap: '0.6rem', alignItems: 'flex-start' }}>
        <strong style={{ fontSize: '1.2rem' }}>Hand finished</strong>
        <p className="footnote" style={{ margin: 0 }}>
          Your result is saved. Your river decision counted toward your Suited Rating.
        </p>
      </div>
      <BottomBar>
        {next && (
          <Link to={`/scenarios/${next.id}`} className="btn btn-primary btn-lg btn-block">
            Next hand: {next.title}
          </Link>
        )}
        <Link to="/scenarios" className={`btn btn-lg btn-block ${next ? 'btn-plain' : 'btn-primary'}`}>
          All scenarios
        </Link>
      </BottomBar>
    </>
  );
}
