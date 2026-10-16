import {
  type Chart,
  type DrillOutcome,
  type HandMix,
  type MixBrush,
  mixBrushes,
  type MixPaintScore,
  scoreMixPainting,
  scorePainting,
} from "@felt/core";
import { useRef, useState } from "react";
import { actionColor } from "../components/actionColors";
import { RangeGrid } from "../components/RangeGrid";
import { untimedMs, useSettings } from "../state/settings";
import { plural } from "../ui/format";
import { SeatStrip } from "../components/SeatStrip";
import { haptic } from "../haptics";
import { BottomBar } from "../ui/BottomBar";
import { UndoIcon } from "../ui/icons";
import { ProgressRing } from "../ui/ProgressRing";
import { Segmented } from "../ui/Segmented";
import { Toggle } from "../ui/Toggle";
import { actionLabels, spotLine } from "./labels";

type PaintScoreLike = ReturnType<typeof scorePainting>;

interface Props {
  chart: Chart;
  targetMs: number;
  onAnswer: (outcome: DrillOutcome) => void;
  onNext: () => void;
  /** The page above already names the chart and its seats (Ranges), so skip the header and the rule. */
  compact?: boolean;
}

/** How a painted hand is graded, for the drill footnote or an info panel. */
export function paintRule(mixes: boolean): string {
  return mixes
    ? "Paint how often you take each action. A hand counts as right when your mix is within 20% of the chart."
    : "A mixed hand counts as right if you paint any action it takes 25% of the time or more.";
}

/** Paint the whole chart from memory, then compare against the answer. */
export function PaintDrill({
  chart,
  targetMs,
  onAnswer,
  onNext,
  compact,
}: Props) {
  const started = useRef(performance.now());
  const { settings, update } = useSettings();
  const untimed = !!settings.study.untimed;
  const mixes = settings.study.paintMixes !== false;
  const labels = actionLabels(chart);
  const short = Object.fromEntries(
    Object.entries(labels).map(([id, l]) => [
      id,
      l.replace(/\s+[\d.]+bb$/, ""),
    ]),
  );
  const brushes: MixBrush[] = mixes
    ? mixBrushes(chart, short)
    : chart.spec.actions.map((a) => ({
        id: a.id,
        label: short[a.id],
        mix: { [a.id]: 1 },
      }));
  const [brushId, setBrushId] = useState(brushes[0].id);
  const brush = brushes.find((b) => b.id === brushId) ?? brushes[0];
  const [erase, setErase] = useState(false);
  const [painted, setPainted] = useState<Map<string, HandMix>>(new Map());
  const [result, setResult] = useState<
    MixPaintScore | (PaintScoreLike & { closeness?: undefined })
  >();
  const [view, setView] = useState<"answer" | "yours">("answer");
  // A repaint right after seeing the answer is practice: it is never rated.
  const [retry, setRetry] = useState(false);

  const key = (m?: HandMix) => (m ? JSON.stringify(m) : "fold");

  const paint = (hand: string) => {
    const want = erase ? undefined : brush.mix;
    if (key(painted.get(hand)) === key(want)) return;
    haptic("select");
    setPainted((prev) => {
      const next = new Map(prev);
      if (!want) next.delete(hand);
      else next.set(hand, want);
      return next;
    });
  };

  const submit = () => {
    const score = mixes
      ? scoreMixPainting(chart, painted)
      : scorePainting(
          chart,
          new Map([...painted].map(([h, m]) => [h, Object.keys(m)[0]])),
        );
    haptic(
      score.accuracy >= 0.9
        ? "success"
        : score.accuracy >= 0.6
          ? "warning"
          : "error",
    );
    setResult(score);
    if (retry) return;
    onAnswer({
      accuracy: score.accuracy,
      responseMs: untimed
        ? untimedMs(targetMs)
        : performance.now() - started.current,
      targetMs,
    });
  };

  const scoreColor = !result
    ? undefined
    : result.accuracy >= 0.9
      ? "var(--green)"
      : result.accuracy >= 0.6
        ? "var(--orange)"
        : "var(--red)";

  return (
    <div className="stack">
      <div
        className={compact ? "stack" : "card stack"}
        style={{ gap: "0.8rem" }}
      >
        {!compact && (
          <>
            <div>
              <div className="footnote">Paint from memory</div>
              <div
                style={{
                  fontWeight: 700,
                  fontSize: "1.3rem",
                  letterSpacing: "-0.02em",
                }}
              >
                {chart.spec.title}{" "}
                <span
                  className="muted"
                  style={{ fontWeight: 500, fontSize: "1rem" }}
                >
                  {chart.spec.tableSize}-handed, {chart.spec.stackBb}bb
                </span>
              </div>
            </div>
            <SeatStrip spec={chart.spec} />
            <div className="footnote">
              {spotLine(chart) && (
                <span style={{ display: "block" }}>{spotLine(chart)}</span>
              )}
              {paintRule(mixes)}
            </div>
          </>
        )}

        {result && (
          <div className="row reveal" style={{ gap: "1rem" }}>
            <ProgressRing
              value={result.accuracy}
              size={74}
              stroke={8}
              color={scoreColor}
              label={`${Math.round(result.accuracy * 100)}% right`}
            >
              <span
                className="num"
                style={{ fontWeight: 700, fontSize: "1.05rem" }}
              >
                {Math.round(result.accuracy * 100)}%
              </span>
            </ProgressRing>
            <div
              className="stack"
              style={{ gap: "0.4rem", flex: 1, minWidth: 160 }}
            >
              <strong role="status">
                {result.wrong.length === 0
                  ? "Perfect chart"
                  : `${plural(result.wrong.length, "hand")} missed`}
              </strong>
              {retry && (
                <span className="footnote">
                  Practice round. It does not change your rating.
                </span>
              )}
              <span className="footnote">
                {result.closeness !== undefined &&
                  `Your frequencies match ${Math.round(result.closeness * 100)}% of the chart. `}
                {result.wrong.length > 0 && "Hands you missed have an outline."}
              </span>
              <Segmented
                value={view}
                onChange={setView}
                ariaLabel="Show"
                options={[
                  { value: "answer", label: "Correct chart" },
                  { value: "yours", label: "Your chart" },
                ]}
              />
            </div>
          </div>
        )}

        {/* Brushes above the grid: the brush you paint with stays in view, not under the bar. */}
        {!result && (
          <div className="brush-rows" role="radiogroup" aria-label="Brush">
            {groupBrushes(brushes).map((row) => (
              <div key={row.key} className="brush-row">
                <span className="brush-name">
                  <MixSwatch mix={row.brushes[0].mix} />
                  {row.name}
                </span>
                <span className="brush-levels">
                  {row.brushes.map((b) => (
                    <button
                      key={b.id}
                      role="radio"
                      aria-checked={!erase && b.id === brush.id}
                      aria-label={b.label}
                      className={`brush${!erase && b.id === brush.id ? " on" : ""}`}
                      data-haptic="select"
                      onClick={() => {
                        setBrushId(b.id);
                        setErase(false);
                      }}
                    >
                      {row.levels ? (
                        <span className="num">{levelOf(b)}</span>
                      ) : (
                        b.label
                      )}
                    </button>
                  ))}
                </span>
              </div>
            ))}
            <div className="brush-row">
              <span className="brush-name">
                <MixSwatch mix={{ fold: 1 }} />
                Fold
              </span>
              <span className="brush-levels">
                <button
                  role="radio"
                  aria-checked={erase}
                  className={`brush${erase ? " on" : ""}`}
                  data-haptic="select"
                  onClick={() => setErase(true)}
                >
                  Erase
                </button>
              </span>
            </div>
          </div>
        )}
        <RangeGrid
          mixes={result && view === "answer" ? chart.mixes : painted}
          reach={chart.reach}
          onPaint={result ? undefined : paint}
          marked={result ? new Set(result.wrong) : undefined}
        />
        {!result && (
          <div className="stack" style={{ gap: "0.6rem" }}>
            <div className="row between">
              <span
                className="row"
                style={{ gap: "0.6rem", fontSize: "0.9rem" }}
              >
                <Toggle
                  checked={mixes}
                  label="Paint mixes"
                  onChange={(on) => {
                    update({
                      ...settings,
                      study: { ...settings.study, paintMixes: on },
                    });
                    setPainted(new Map());
                    setBrushId("");
                  }}
                />
                <span aria-hidden="true">Paint mixes</span>
              </span>
              <span className="footnote num">
                {plural(painted.size, "hand")} painted
              </span>
            </div>
          </div>
        )}
      </div>

      <BottomBar>
        {!result ? (
          <div
            style={{
              display: "grid",
              gridTemplateColumns: "auto 1fr",
              gap: 10,
            }}
          >
            <button
              className="btn btn-lg glass"
              onClick={() => setPainted(new Map())}
              disabled={painted.size === 0}
              aria-label="Clear all"
            >
              <UndoIcon size={20} />
            </button>
            <button
              className="btn btn-primary btn-lg"
              onClick={submit}
              data-haptic="off"
            >
              Check my chart
            </button>
          </div>
        ) : (
          <div
            style={{
              display: "grid",
              gridTemplateColumns: result.wrong.length ? "1fr 1fr" : "1fr",
              gap: 10,
            }}
          >
            {result.wrong.length > 0 && (
              <button
                className="btn btn-lg glass swap-in"
                onClick={() => {
                  setRetry(true);
                  setResult(undefined);
                  setPainted(new Map());
                  setView("answer");
                  window.scrollTo({ top: 0 });
                }}
              >
                Paint it again
              </button>
            )}
            <button
              className="btn btn-primary btn-lg swap-in"
              onClick={onNext}
              autoFocus
            >
              Next chart
            </button>
          </div>
        )}
      </BottomBar>
    </div>
  );
}

/** A tiny cell showing a brush's mix the way the range grid draws it. */
function MixSwatch({ mix }: { mix: HandMix }) {
  const parts = Object.entries(mix).filter(([a]) => a !== "fold");
  const fold = 1 - parts.reduce((t, [, f]) => t + f, 0);
  return (
    <span className="swatch" aria-hidden="true">
      {parts.map(([a, f]) => (
        <span
          key={a}
          style={{ width: `${f * 100}%`, background: actionColor(a) }}
        />
      ))}
      {fold > 1e-9 && (
        <span
          style={{
            width: `${fold * 100}%`,
            background: actionColor("fold"),
            opacity: 0.22,
          }}
        />
      )}
    </span>
  );
}

/** Brushes laid out as one row per action, with the even splits on their own row. */
function groupBrushes(
  brushes: MixBrush[],
): { key: string; name: string; levels: boolean; brushes: MixBrush[] }[] {
  const rows: {
    key: string;
    name: string;
    levels: boolean;
    brushes: MixBrush[];
  }[] = [];
  for (const b of brushes) {
    const action = b.id.includes("+") ? "+" : b.id.split(":")[0];
    let row = rows.find((r) => r.key === action);
    if (!row) {
      row = {
        key: action,
        name: action === "+" ? "Split" : b.label,
        levels: action !== "+",
        brushes: [],
      };
      rows.push(row);
    }
    row.brushes.push(b);
  }
  return rows;
}

const levelOf = (b: MixBrush) =>
  `${Math.round(Object.values(b.mix)[0] * 100)}%`;
