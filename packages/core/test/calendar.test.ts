import { describe, expect, it } from 'vitest';
import { buildIcs, icsText, nextAt } from '../src';

describe('calendar reminders', () => {
  it('builds a daily study event with an alarm, in local time', () => {
    const ics = buildIcs(
      { uid: 'felt-study@felt', title: 'Study poker, 10 min', start: new Date(2026, 9, 13, 8, 0), minutes: 10, daily: true, alarmMinutes: 0, url: 'https://felt.app/' },
      new Date(Date.UTC(2026, 9, 12, 12, 0, 0)),
    );
    expect(ics).toContain('DTSTART:20261013T080000');
    expect(ics).toContain('DTEND:20261013T081000');
    expect(ics).toContain('RRULE:FREQ=DAILY');
    expect(ics).toContain('TRIGGER:-PT0M');
    expect(ics).toContain('DTSTAMP:20261012T120000Z');
    expect(ics.split('\r\n').every((l) => l.length <= 75)).toBe(true);
    expect(ics.startsWith('BEGIN:VCALENDAR\r\n')).toBe(true);
  });

  it('escapes text and folds long lines', () => {
    expect(icsText('a, b; c\nd')).toBe('a\\, b\; c\\nd');
    const long = buildIcs({ uid: 'x', title: 'y'.repeat(200), start: new Date(2026, 0, 1, 9), minutes: 5 });
    expect(long).toContain('\r\n y');
  });

  it('picks the next occurrence of a time', () => {
    expect(nextAt(8, 0, new Date(2026, 9, 12, 7, 0))).toEqual(new Date(2026, 9, 12, 8, 0));
    expect(nextAt(8, 0, new Date(2026, 9, 12, 9, 0))).toEqual(new Date(2026, 9, 13, 8, 0));
  });
});
