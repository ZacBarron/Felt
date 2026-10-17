import { describe, expect, it } from 'vitest';
import { lastOpen } from '../src/push.ts';
import { CLOSING_AFTER_DAYS, inQuietHours, outsideQuietHours, safeZone, shouldRemind, underPushCaps } from '../src/services.ts';

const tz = 'America/New_York';
// 15:00 UTC on Wed 2026-10-14 is 11:00 in New York.
const now = new Date('2026-10-14T15:00:00Z');
const hoursAgo = (h: number) => new Date(now.getTime() - h * 3_600_000).toISOString();
const daysAgo = (d: number) => hoursAgo(d * 24);

describe('quiet hours', () => {
  it('runs from 9 pm to 8 am', () => {
    expect(inQuietHours(21 * 60)).toBe(true);
    expect(inQuietHours(23 * 60 + 59)).toBe(true);
    expect(inQuietHours(0)).toBe(true);
    expect(inQuietHours(7 * 60 + 59)).toBe(true);
    expect(inQuietHours(8 * 60)).toBe(false);
    expect(inQuietHours(20 * 60 + 59)).toBe(false);
  });

  it('uses the player time zone', () => {
    // 11:00 in New York, 16:00 in London, 00:00 in Tokyo.
    expect(outsideQuietHours(now, tz)).toBe(true);
    expect(outsideQuietHours(now, 'Europe/London')).toBe(true);
    expect(outsideQuietHours(now, 'Asia/Tokyo')).toBe(false);
  });

  it('falls back to UTC for a missing or unknown zone', () => {
    expect(safeZone(null)).toBe('UTC');
    expect(safeZone('Mars/Olympus')).toBe('UTC');
    expect(safeZone(tz)).toBe(tz);
  });
});

describe('push caps', () => {
  it('allows one push a local day', () => {
    expect(underPushCaps([], now, tz)).toBe(true);
    // 2 hours ago is still today in New York.
    expect(underPushCaps([hoursAgo(2)], now, tz)).toBe(false);
    // 13 hours ago was yesterday evening in New York.
    expect(underPushCaps([hoursAgo(13)], now, tz)).toBe(true);
  });

  it('allows four in any 7 days', () => {
    const three = [daysAgo(1), daysAgo(2), daysAgo(3)];
    expect(underPushCaps(three, now, tz)).toBe(true);
    expect(underPushCaps([...three, daysAgo(6)], now, tz)).toBe(false);
    // A push 8 days ago has rolled out of the week.
    expect(underPushCaps([...three, daysAgo(8)], now, tz)).toBe(true);
  });

  it('ignores times in the future', () => {
    expect(underPushCaps([new Date(now.getTime() + 60_000).toISOString()], now, tz)).toBe(true);
  });
});

describe('the daily reminder with caps and the closing note', () => {
  const base = { tz, cueMinutes: 11 * 60, lastStudyDay: null, sentSinceStudy: [] as string[], lastOpenAt: daysAgo(1) };

  it('holds back when the caps are full', () => {
    expect(shouldRemind({ ...base, pushesSent: [hoursAgo(1)] }, now)).toMatchObject({ send: false, why: 'cap' });
    expect(shouldRemind({ ...base, pushesSent: [daysAgo(1), daysAgo(2), daysAgo(3), daysAgo(4)] }, now)).toMatchObject({ send: false, why: 'cap' });
    expect(shouldRemind({ ...base, pushesSent: [daysAgo(1)] }, now)).toMatchObject({ send: true, kind: 'reminder' });
  });

  it('is not held by quiet hours at a time the player picked', () => {
    // 22:30 in New York is 02:30 UTC the next day.
    const late = new Date('2026-10-15T02:40:00Z');
    expect(shouldRemind({ ...base, cueMinutes: 22 * 60 + 30 }, late)).toMatchObject({ send: true, kind: 'reminder' });
  });

  it('sends one closing note after 14 days without a visit', () => {
    const ignored = ['2026-10-13', '2026-10-10', '2026-10-07', '2026-10-04', '2026-10-03'];
    const away = { ...base, sentSinceStudy: ignored, lastOpenAt: daysAgo(CLOSING_AFTER_DAYS) };
    expect(shouldRemind(away, now)).toEqual({ send: true, day: '2026-10-14', kind: 'closing' });
    // 13 days away: the normal decay rules apply (the last reminder was yesterday).
    expect(shouldRemind({ ...away, lastOpenAt: daysAgo(13) }, now)).toMatchObject({ send: false, why: 'decay' });
    // Even after decay has stopped reminders, the closing note still goes once.
    const seven = ['2026-10-11', '2026-10-08', '2026-10-05', '2026-10-04', '2026-10-03', '2026-10-02', '2026-10-01'];
    expect(shouldRemind({ ...away, sentSinceStudy: seven }, now)).toMatchObject({ send: true, kind: 'closing' });
  });

  it('needs reminders that went unanswered before closing', () => {
    expect(shouldRemind({ ...base, lastOpenAt: daysAgo(30) }, now)).toMatchObject({ send: true, kind: 'reminder' });
  });

  it('stays quiet after the closing note until the player comes back', () => {
    const closed = { ...base, sentSinceStudy: ['2026-10-01'], lastOpenAt: daysAgo(20), closingSentAt: daysAgo(5) };
    expect(shouldRemind(closed, now)).toMatchObject({ send: false, why: 'closed' });
    expect(shouldRemind({ ...closed, lastOpenAt: null }, now)).toMatchObject({ send: false, why: 'closed' });
    // A visit after the note starts reminders again.
    expect(shouldRemind({ ...closed, lastOpenAt: daysAgo(1), sentSinceStudy: [] }, now)).toMatchObject({ send: true, kind: 'reminder' });
  });

  it('keeps the decay rules: every third day after 3 ignored, none after 7', () => {
    expect(shouldRemind({ ...base, sentSinceStudy: ['2026-10-12', '2026-10-11', '2026-10-10'] }, now)).toMatchObject({ send: false, why: 'decay' });
    expect(shouldRemind({ ...base, sentSinceStudy: ['2026-10-11', '2026-10-10', '2026-10-09'] }, now)).toMatchObject({ send: true });
    const seven = ['2026-10-11', '2026-10-08', '2026-10-05', '2026-10-04', '2026-10-03', '2026-10-02', '2026-10-01'];
    expect(shouldRemind({ ...base, sentSinceStudy: seven }, now)).toMatchObject({ send: false, why: 'stopped' });
  });
});

describe('last visit', () => {
  it('takes the later of the last visit and the last study day', () => {
    expect(lastOpen(null, null)).toBeNull();
    expect(lastOpen('2026-10-10T12:00:00.000Z', null)).toBe('2026-10-10T12:00:00.000Z');
    expect(lastOpen(null, '2026-10-11')).toBe('2026-10-11T00:00:00.000Z');
    expect(lastOpen('2026-10-10T12:00:00.000Z', '2026-10-11')).toBe('2026-10-11T00:00:00.000Z');
    expect(lastOpen('2026-10-12T12:00:00.000Z', '2026-10-11')).toBe('2026-10-12T12:00:00.000Z');
  });
});
