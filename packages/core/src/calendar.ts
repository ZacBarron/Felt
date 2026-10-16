/**
 * Calendar files (iCalendar, RFC 5545). A reminder the player adds to their
 * own calendar fires without a server: it turns the study cue chosen at
 * onboarding into an actual prompt (Gollwitzer 1999), and lets a trial end
 * reminder be real rather than promised.
 */

export interface CalendarEvent {
  uid: string;
  title: string;
  start: Date;
  minutes: number;
  description?: string;
  url?: string;
  /** Repeat every day. */
  daily?: boolean;
  /** Alert this many minutes before. */
  alarmMinutes?: number;
}

const pad = (n: number) => String(n).padStart(2, '0');

/** Floating local time, so the event stays at the same clock time wherever the player is. */
function localStamp(d: Date): string {
  return `${d.getFullYear()}${pad(d.getMonth() + 1)}${pad(d.getDate())}T${pad(d.getHours())}${pad(d.getMinutes())}00`;
}

function utcStamp(d: Date): string {
  return `${d.getUTCFullYear()}${pad(d.getUTCMonth() + 1)}${pad(d.getUTCDate())}T${pad(d.getUTCHours())}${pad(d.getUTCMinutes())}${pad(d.getUTCSeconds())}Z`;
}

/** Escapes text values: backslash, semicolon, comma and newlines. */
export function icsText(s: string): string {
  return s.replace(/\\/g, '\\\\').replace(/;/g, '\;').replace(/,/g, '\\,').replace(/\r?\n/g, '\\n');
}

/** Folds lines longer than 75 octets, as the format requires. */
function fold(line: string): string {
  const out: string[] = [];
  let rest = line;
  while (rest.length > 74) {
    out.push(rest.slice(0, 74));
    rest = ' ' + rest.slice(74);
  }
  out.push(rest);
  return out.join('\r\n');
}

export function buildIcs(event: CalendarEvent, now = new Date()): string {
  const end = new Date(event.start.getTime() + event.minutes * 60_000);
  const lines = [
    'BEGIN:VCALENDAR',
    'VERSION:2.0',
    'PRODID:-//Suited//Study reminders//EN',
    'CALSCALE:GREGORIAN',
    'BEGIN:VEVENT',
    `UID:${event.uid}`,
    `DTSTAMP:${utcStamp(now)}`,
    `DTSTART:${localStamp(event.start)}`,
    `DTEND:${localStamp(end)}`,
    `SUMMARY:${icsText(event.title)}`,
    ...(event.description ? [`DESCRIPTION:${icsText(event.description)}`] : []),
    ...(event.url ? [`URL:${event.url}`] : []),
    ...(event.daily ? ['RRULE:FREQ=DAILY'] : []),
    ...(event.alarmMinutes !== undefined
      ? ['BEGIN:VALARM', 'ACTION:DISPLAY', `DESCRIPTION:${icsText(event.title)}`, `TRIGGER:-PT${event.alarmMinutes}M`, 'END:VALARM']
      : []),
    'END:VEVENT',
    'END:VCALENDAR',
  ];
  return lines.map(fold).join('\r\n') + '\r\n';
}

/** The next time today or tomorrow at hour:minute. */
export function nextAt(hour: number, minute: number, now = new Date()): Date {
  const d = new Date(now.getFullYear(), now.getMonth(), now.getDate(), hour, minute);
  if (d <= now) d.setDate(d.getDate() + 1);
  return d;
}
