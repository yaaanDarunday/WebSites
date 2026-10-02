const HOURS = [ // index = weekday, Sunday = 0; [open hour, close hour]
  [8, 16], [7, 17], [7, 17], [7, 17], [7, 17], [7, 17], [8, 16],
];
const SLOT_MINUTES = 15;
const DAYS_AHEAD = 2; // today and tomorrow

function tzParts(date, tz) {
  const f = new Intl.DateTimeFormat("en-CA", {
    timeZone: tz, hourCycle: "h23",
    year: "numeric", month: "2-digit", day: "2-digit", hour: "2-digit", minute: "2-digit", second: "2-digit",
  });
  const p = Object.fromEntries(f.formatToParts(date).map((x) => [x.type, x.value]));
  return { y: +p.year, m: +p.month, d: +p.day, h: +p.hour, min: +p.minute, s: +p.second };
}

function tzOffsetMs(date, tz) {
  const p = tzParts(date, tz);
  return Date.UTC(p.y, p.m - 1, p.d, p.h, p.min, p.s) - Math.floor(date.getTime() / 1000) * 1000;
}

// Wall-clock time in `tz` → the real instant. Two passes settle DST boundaries.
function zonedToUtc(y, m, d, h, min, tz) {
  const guess = Date.UTC(y, m - 1, d, h, min);
  let t = guess - tzOffsetMs(new Date(guess), tz);
  t = guess - tzOffsetMs(new Date(t), tz);
  return new Date(t);
}

function listSlotTimes(now, { tz, leadMinutes }) {
  const out = [];
  const today = tzParts(now, tz);
  for (let i = 0; i < DAYS_AHEAD; i++) {
    const day = new Date(Date.UTC(today.y, today.m - 1, today.d + i));
    const y = day.getUTCFullYear(), m = day.getUTCMonth() + 1, d = day.getUTCDate();
    const [open, close] = HOURS[day.getUTCDay()];
    for (let mins = open * 60; mins + SLOT_MINUTES <= close * 60; mins += SLOT_MINUTES) {
      const at = zonedToUtc(y, m, d, Math.floor(mins / 60), mins % 60, tz);
      if (at.getTime() >= now.getTime() + leadMinutes * 60_000) out.push(at);
    }
  }
  return out;
}

module.exports = { HOURS, SLOT_MINUTES, zonedToUtc, listSlotTimes };
