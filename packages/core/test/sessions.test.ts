import { describe, expect, it } from 'vitest';
import { parseDuration, parseSessionsCsv, sessionTotals, splitCsvLine, stakesBigBlind } from '../src';

describe('session import', () => {
  it('reads a typical bankroll export with buy in and cash out', () => {
    const csv = [
      'Date,Game,Stakes,Buy In,Cash Out,Duration',
      '2026-09-01,NLH,1/3,$300,$520,4:30',
      '2026-09-04,NLH,1/3,"$1,000","$640",5h 15m',
      '2026-09-07,NLH,1/3,$300,,3',
    ].join('\n');
    const r = parseSessionsCsv(csv);
    expect(r.columns).toMatchObject({ date: 'date', hours: 'duration', buyIn: 'buy in', cashOut: 'cash out', stakes: 'stakes', type: 'game' });
    expect(r.sessions).toHaveLength(2);
    expect(r.skipped).toBe(1);
    expect(r.sessions[0]).toMatchObject({ hours: 4.5, profit: 220, stakes: '1/3', bb: 3 });
    expect(r.sessions[1]).toMatchObject({ hours: 5.25, profit: -360 });
    expect(r.sessions[0].date).toEqual(new Date(2026, 8, 1));
    expect(sessionTotals(r.sessions)).toEqual({ sessions: 2, hours: 9.75, profit: -140, perHour: -140 / 9.75 });
  });

  it('reads semicolons, minutes and a signed profit column, and ignores per hour columns', () => {
    const csv = ['start;minutes;net result;$/h', '09/15/2026;270;-85.50;-19', '09/16/2026;120;(40);-20'].join('\n');
    const r = parseSessionsCsv(csv);
    expect(r.columns.profit).toBe('net result');
    expect(r.sessions.map((s) => [s.hours, s.profit])).toEqual([
      [4.5, -85.5],
      [2, -40],
    ]);
    expect(r.sessions[0].date).toEqual(new Date(2026, 8, 15));
  });

  it('leaves tournaments out and reads the big blind from the stakes', () => {
    const r = parseSessionsCsv('date,type,stakes,hours,profit\n2026-09-01,Cash,$2/$5,6,400\n2026-09-02,Tournament,$150,8,-150\n2026-09-03,Cash,5/10/20,5,-300');
    expect(r.tournaments).toBe(1);
    expect(r.sessions.map((x) => x.bb)).toEqual([5, 10]);
    expect(stakesBigBlind('1-2')).toBe(2);
    expect(stakesBigBlind('NLH')).toBeUndefined();
  });

  it('parses durations and quoted cells', () => {
    expect(parseDuration('4:30')).toBe(4.5);
    expect(parseDuration('90 min')).toBe(1.5);
    expect(parseDuration('2h')).toBe(2);
    expect(parseDuration('45', true)).toBe(0.75);
    expect(splitCsvLine('a,"b, c","d ""e"""', ',')).toEqual(['a', 'b, c', 'd "e"']);
  });
});
