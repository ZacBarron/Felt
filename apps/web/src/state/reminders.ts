import { buildIcs, nextAt } from '@felt/core';
import { cueCopy } from './goals';

/** Saves a calendar file; on phones it opens straight into the calendar app. */
export function downloadIcs(filename: string, ics: string) {
  const url = URL.createObjectURL(new Blob([ics], { type: 'text/calendar;charset=utf-8' }));
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}

/** A daily event at the time of the player's study cue. */
export function studyReminder(cueId: string | undefined, minutes: number) {
  const cue = cueCopy(cueId);
  const [h, m] = cue?.time ?? [19, 0];
  downloadIcs(
    'felt-study.ics',
    buildIcs({
      uid: 'felt-daily-study@felt',
      title: `Poker study, ${minutes} min`,
      start: nextAt(h, m),
      minutes,
      daily: true,
      alarmMinutes: 0,
      description: cue ? `When you ${cue.phrase}, open Felt for your plan.` : 'Open Felt for your plan.',
      url: `${location.origin}/`,
    }),
  );
}

/** A one time event two days before a trial ends. */
export function trialReminder(trialEndsAt: string) {
  const end = new Date(trialEndsAt);
  const at = new Date(end.getTime() - 2 * 86_400_000);
  at.setHours(10, 0, 0, 0);
  downloadIcs(
    'felt-trial-ends.ics',
    buildIcs({
      uid: `felt-trial-${end.getTime()}@felt`,
      title: 'Felt Pro trial ends in 2 days',
      start: at,
      minutes: 15,
      alarmMinutes: 0,
      description: `Your free trial ends on ${end.toLocaleDateString()}. To keep Felt Pro, do nothing. To cancel, open Felt, then Account, then Manage subscription.`,
    }),
  );
}
