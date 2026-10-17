import {
  currentRating,
  isProvisional,
  ratingInterval,
  SKILL_DOMAINS,
  type SkillRating,
  tierLabel,
} from "@felt/core";
import { useLiveQuery } from "dexie-react-hooks";
import { useEffect, useState } from "react";
import { Link, useSearchParams } from "react-router-dom";
import { db } from "../state/db";
import {
  activityDates,
  DOMAIN_LABELS,
  ratingSnapshot,
  streakNow,
} from "../state/rating";
import { useSettings } from "../state/settings";
import { useWinRate } from "../state/winrate";
import { gameSummary } from "./SettingsPage";
import { signed } from "../ui/format";
import { ChevronRightIcon, FlameIcon, SettingsIcon, ShareIcon } from "../ui/icons";
import { BrandFooter } from "../ui/Brand";
import { HandsRows, MoreRows, ProCard } from "../components/YouLinks";
import { AvatarPicker } from "../ui/Avatar";
import { ShareSheet } from "../components/ShareSheet";
import { bestSettled, type ShareKind } from "../state/share";
import { PageHeader } from "../ui/PageHeader";
import { Section } from "../ui/Section";
import { useCountUp } from "../ui/useCountUp";
import "./you.css";

function Sparkline({ points }: { points: { rating: number; rd: number }[] }) {
  if (points.length < 2) return null;
  const pts = points.slice(-200);
  const lo = Math.min(...pts.map((p) => p.rating - p.rd * 0.5));
  const hi = Math.max(...pts.map((p) => p.rating + p.rd * 0.5));
  const w = 320;
  const h = 70;
  const x = (i: number) => (i / (pts.length - 1)) * w;
  const y = (r: number) => h - ((r - lo) / Math.max(1, hi - lo)) * h;
  const line = pts
    .map(
      (p, i) => `${i ? "L" : "M"}${x(i).toFixed(1)},${y(p.rating).toFixed(1)}`,
    )
    .join(" ");
  const band =
    pts
      .map(
        (p, i) =>
          `${i ? "L" : "M"}${x(i).toFixed(1)},${y(p.rating + p.rd * 0.5).toFixed(1)}`,
      )
      .join(" ") +
    " " +
    [...pts]
      .reverse()
      .map(
        (p, i) =>
          `L${x(pts.length - 1 - i).toFixed(1)},${y(p.rating - p.rd * 0.5).toFixed(1)}`,
      )
      .join(" ") +
    " Z";
  return (
    <svg
      className="sparkline"
      viewBox={`0 0 ${w} ${h}`}
      preserveAspectRatio="none"
      aria-hidden="true"
    >
      <path d={band} className="band" />
      <path d={line} className="line" />
    </svg>
  );
}

function DomainRow({ label, r }: { label: string; r: SkillRating }) {
  const pct = Math.max(0.04, Math.min(1, (r.rating - 800) / 1400));
  return (
    <div className="list-row domain-row">
      <span className="grow" style={{ minWidth: 0 }}>
        <span className="row between">
          <span style={{ fontWeight: 600 }}>{label}</span>
          <span className={`num${r.games ? "" : " muted"}`}>
            {r.games ? Math.round(r.rating) : "–"}
          </span>
        </span>
        <span className="domain-bar">
          <span
            style={{
              width: r.games ? `${pct * 100}%` : 0,
              opacity: isProvisional(r) ? 0.45 : 1,
            }}
          />
        </span>
        {r.games > 0 && (
          <span className="footnote">
            {tierLabel(r)}, {r.games} {r.games === 1 ? "answer" : "answers"}
          </span>
        )}
      </span>
    </div>
  );
}

export function YouPage() {
  const { settings, update } = useSettings();
  const snap = useLiveQuery(ratingSnapshot, []);
  const streak = useLiveQuery(() => streakNow(), []);
  const overview = useLiveQuery(async () => {
    const [lessons, dailies, dates] = await Promise.all([
      db.lessons.where("status").anyOf("done", "tested").count(),
      db.daily.filter((d) => d.finished !== false).count(),
      activityDates(),
    ]);
    const first = dates.length
      ? new Date(Math.min(...dates.map((d) => d.getTime())))
      : undefined;
    return { lessons, dailies, first };
  }, []);
  const win = useWinRate();
  const [sharing, setSharing] = useState<ShareKind>();
  // Arriving from the tier moment's "Share my rating": open the card once.
  const [params, setParams] = useSearchParams();
  const wantsShare = params.get("share") === "1";
  const [editingName, setEditingName] = useState(false);
  const overall = snap ? currentRating(snap.overall) : undefined;
  const shown = Math.round(useCountUp(overall?.rating ?? 0));
  useEffect(() => {
    if (!wantsShare || !overall) return;
    if (overall.games > 0) setSharing("rating");
    setParams(
      (p) => {
        const next = new URLSearchParams(p);
        next.delete("share");
        return next;
      },
      { replace: true },
    );
  }, [wantsShare, overall, setParams]);

  if (!snap || !overall) return null;

  const [lo, hi] = ratingInterval(overall);
  const rated = overall.games > 0;
  const provisional = isProvisional(overall);
  // Personal best counts only settled ratings, so early swings do not set a record.
  const bestRating = bestSettled(snap.history);

  const since = overview?.first?.toLocaleDateString("en-US", {
    month: "short",
    year: "numeric",
  });

  return (
    <div className="stack" style={{ gap: "1.5rem" }}>
      <PageHeader
        title="You"
        trailing={
          <Link to="/settings" className="btn btn-plain header-icon" aria-label="Settings">
            <SettingsIcon size={24} />
          </Link>
        }
      />

      <section className="you-profile">
        <AvatarPicker
          name={settings.profile.name}
          photo={settings.profile.photo}
          onPhoto={(photo) =>
            update({ ...settings, profile: { ...settings.profile, photo } })
          }
        />
        {editingName ? (
          <label className="you-name">
            <span className="footnote">Your name</span>
            <input
              autoFocus
              value={settings.profile.name ?? ""}
              placeholder="Optional"
              maxLength={40}
              autoComplete="nickname"
              enterKeyHint="done"
              onChange={(e) =>
                update({
                  ...settings,
                  profile: {
                    ...settings.profile,
                    name: e.target.value || undefined,
                  },
                })
              }
              onBlur={() => setEditingName(false)}
              onKeyDown={(e) => e.key === "Enter" && setEditingName(false)}
            />
          </label>
        ) : (
          <span className="you-id">
            <span className="you-id-name">
              {settings.profile.name || "You"}
            </span>
            {since && <span className="footnote">Studying since {since}</span>}
            <button
              className="btn btn-plain you-id-edit"
              onClick={() => setEditingName(true)}
            >
              {settings.profile.name ? "Edit name" : "Add your name"}
            </button>
          </span>
        )}
      </section>

      <section className="hero you-hero">
        <div className="hero-label">Suited Rating</div>
        <div className="row" style={{ alignItems: "baseline", gap: "0.6rem" }}>
          {rated ? (
            <span
              className="display num you-rating"
              aria-label={`${provisional ? "About " : ""}${Math.round(overall.rating)}`}
            >
              {shown}
            </span>
          ) : (
            <span className="you-unrated">Not rated yet</span>
          )}
          {rated && (
            <span className="pill pill-on-felt">{tierLabel(overall)}</span>
          )}
        </div>
        <div className="hero-sub">
          {!rated
            ? "A daily challenge rates you in five decisions."
            : provisional
              ? "Your rating is still settling. Each answer makes it more certain."
              : `We are 95% sure your rating is between ${Math.round(lo)} and ${Math.round(hi)}.`}
        </div>
        <Sparkline points={snap.history} />
        <div className="row" style={{ gap: "0.5rem", marginTop: "0.4rem" }}>
          {overall.games > 0 && (
            <span className="pill pill-on-felt num">
              {overall.games} rated {overall.games === 1 ? "answer" : "answers"}
            </span>
          )}
          {bestRating > 0 && (
            <span className="pill pill-on-felt num">
              Best ever {Math.round(bestRating)}
            </span>
          )}
        </div>
        {rated ? (
          <button
            className="btn btn-lg btn-block btn-hero you-share"
            onClick={() => setSharing("rating")}
          >
            <ShareIcon size={20} />
            Share my rating
          </button>
        ) : (
          <Link to="/daily" className="btn btn-lg btn-block btn-hero">
            Play the daily challenge
          </Link>
        )}
      </section>

      <ShareSheet
        open={!!sharing}
        first={sharing ?? "rating"}
        onClose={() => setSharing(undefined)}
      />

      <Section
        title="Progress"
        trailing={
          streak && streak.streak > 0 ? (
            <button
              className="btn btn-plain you-share-streak"
              onClick={() => setSharing("streak")}
            >
              <ShareIcon size={18} />
              Share streak
            </button>
          ) : undefined
        }
      >
        <div className="card you-strip">
          <div className="you-strip-cell">
            <span className="you-stat-value num">
              {streak?.streak ? (
                <FlameIcon size={20} className="you-stat-flame" />
              ) : null}
              {streak?.streak ?? 0}
            </span>
            <span className="you-stat-label">Day streak</span>
            <span className="you-stat-sub num">
              {streak && streak.bank > 0
                ? `${streak.bank} ${streak.bank === 1 ? "freeze" : "freezes"} saved`
                : `Best ${streak?.best ?? 0}`}
            </span>
          </div>
          <div className="you-strip-cell">
            <span className="you-stat-value num">{overview?.lessons ?? 0}</span>
            <span className="you-stat-label">Lessons</span>
          </div>
          <div className="you-strip-cell">
            <span className="you-stat-value num">{overview?.dailies ?? 0}</span>
            <span className="you-stat-label">Dailies</span>
          </div>
        </div>
      </Section>

      <Section
        title="Skills"
        info="Each area has its own rating. Harder questions count for more."
      >
        {SKILL_DOMAINS.some((d) => snap.domains[d].games > 0) ? (
          <div className="list">
            {SKILL_DOMAINS.map((d) => (
              <DomainRow
                key={d}
                label={DOMAIN_LABELS[d]}
                r={currentRating(snap.domains[d])}
              />
            ))}
          </div>
        ) : (
          <div className="card you-skills-empty">
            <span className="footnote">
              Each area gets a rating once you answer questions in it.
            </span>
          </div>
        )}
      </Section>

      <Section title="Win rate">
        <div className="list">
        <Link to="/you/winrate" className="list-row you-winrate">
          <span className="grow" style={{ minWidth: 0 }}>
            {win?.rated ? (
              <span className="you-winrate-value num">
                {signed(win.best.mean, 1)}
                <span className="winrate-unit"> bb/100</span>
              </span>
            ) : (
              <span className="you-winrate-value muted">Needs a rating</span>
            )}
            <span className="footnote" style={{ display: "block" }}>
              Our estimate for {gameSummary(settings.game)}
            </span>
          </span>
          <ChevronRightIcon size={16} className="chev" />
        </Link>
        </div>
      </Section>

      <ProCard />

      <HandsRows />

      <MoreRows />

      <BrandFooter />
    </div>
  );
}
