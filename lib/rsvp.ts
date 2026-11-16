import type { Answer, Guest, Kind, Reply, RsvpEvent } from "@/lib/types";

/*
  The rules of an invitation, as plain functions with no Firebase, so tests/rsvp.test.ts checks them
  all: dates and countdowns, how many seats are taken and left, who has replied and who hasn't,
  the food and needs list, the WhatsApp messages, the calendar file and the spreadsheet (CSV).

  Dates are yyyy-mm-dd and times are minutes after midnight (14:30 is 870), so an event means the
  same thing on every phone.
*/

export const KINDS: Record<Kind, { label: string; word: string; hint: string }> = {
  wedding: { label: "Wedding", word: "wedding", hint: "Thandi & Sipho's wedding" },
  engagement: { label: "Engagement or lobola", word: "celebration", hint: "Zanele's engagement party" },
  birthday: { label: "Birthday or braai", word: "party", hint: "Lerato turns 30" },
  baby: { label: "Baby shower", word: "baby shower", hint: "Naledi's baby shower" },
  other: { label: "Something else", word: "event", hint: "Our year-end function" },
};

export const LIMITS = { title: 60, hosts: 60, venue: 60, address: 100, note: 200, name: 40, phone: 20, diet: 60, message: 140, party: 10, capacity: 2000, guests: 300 };

export const ANSWERS: Record<Answer, { label: string; short: string }> = {
  yes: { label: "Joyfully accepts", short: "Coming" },
  maybe: { label: "Not sure yet", short: "Maybe" },
  no: { label: "Regretfully declines", short: "Can't come" },
};

/* ── Dates and times ─────────────────────────────────────────────────────────────────────────── */

/** 870 → "14:30" */
export function clock(minutes: number) {
  return `${String(Math.floor(minutes / 60)).padStart(2, "0")}:${String(minutes % 60).padStart(2, "0")}`;
}

/** "14:30" → 870, or NaN */
export function minutesOf(text: string) {
  const m = /^(\d{1,2}):(\d{2})$/.exec(text.trim());
  if (!m) return NaN;
  const h = Number(m[1]);
  const min = Number(m[2]);
  return h < 24 && min < 60 ? h * 60 + min : NaN;
}

/** A date as yyyy-mm-dd, on this device's calendar */
export function isoDate(d: Date) {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

/** yyyy-mm-dd → a Date at midnight */
export function dateOf(iso: string) {
  const [y, m, d] = iso.split("-").map(Number);
  return new Date(y, m - 1, d);
}

export function addDays(iso: string, n: number) {
  const d = dateOf(iso);
  d.setDate(d.getDate() + n);
  return isoDate(d);
}

/** Whole days from one date to another (negative when `to` is earlier). Counts calendar days, so daylight saving can't shift it. */
export function daysBetween(from: string, to: string) {
  const a = dateOf(from);
  const b = dateOf(to);
  return Math.round((Date.UTC(b.getFullYear(), b.getMonth(), b.getDate()) - Date.UTC(a.getFullYear(), a.getMonth(), a.getDate())) / 86400000);
}

/** "Sat 5 Dec" or, long, "Saturday 5 December 2026" */
export function dayLabel(iso: string, long = false) {
  return dateOf(iso).toLocaleDateString("en-ZA", long ? { weekday: "long", day: "numeric", month: "long", year: "numeric" } : { weekday: "short", day: "numeric", month: "short" });
}

/** "Today", "Tomorrow", "In 12 days", "In 3 weeks", "Yesterday", "4 days ago" */
export function countdown(date: string, today: string) {
  const n = daysBetween(today, date);
  if (n === 0) return "Today";
  if (n === 1) return "Tomorrow";
  if (n === -1) return "Yesterday";
  if (n < 0) return `${-n} days ago`;
  if (n < 21) return `In ${n} days`;
  return `In ${Math.round(n / 7)} weeks`;
}

/** Whether replies are being taken: open, running late (past the reply-by date), or closed (the host switched it off, or the day has passed) */
export function replyState(event: Pick<RsvpEvent, "date" | "replyBy" | "open">, today: string): "open" | "late" | "closed" {
  if (!event.open || today > event.date) return "closed";
  return event.replyBy && today > event.replyBy ? "late" : "open";
}

/** "Saturday 5 December 2026 at 14:00" */
export const whenLine = (e: Pick<RsvpEvent, "date" | "time">) => `${dayLabel(e.date, true)} at ${clock(e.time)}`;

/* ── Text typed by people ────────────────────────────────────────────────────────────────────── */

/** Tidies typed text: no spaces at the ends or twice in a row, and not too long */
export function clean(raw: string, max: number) {
  return raw.replace(/\s+/g, " ").trim().slice(0, max).trim();
}

/** A phone number with only digits, plus and spaces */
export function cleanPhone(raw: string) {
  return raw.replace(/[^\d+ ]/g, "").replace(/\s+/g, " ").trim().slice(0, LIMITS.phone);
}

/**
 * A South African number in the form WhatsApp links need (no plus, no zero): "082 555 0123" and
 * "+27 82 555 0123" both become "27825550123". null when it isn't a plausible number.
 */
export function waNumber(raw: string) {
  const d = raw.replace(/[^\d]/g, "");
  if (d.length === 10 && d.startsWith("0")) return `27${d.slice(1)}`;
  if (d.length === 11 && d.startsWith("27")) return d;
  return null;
}

/** Opens WhatsApp with a message ready: to that number, or (no number) for the host to pick a chat */
export const waLink = (phone: string, text: string) => {
  const n = waNumber(phone);
  return `https://wa.me/${n ? n : ""}?text=${encodeURIComponent(text)}`;
};

/** Several names pasted in, one a line, each with an optional phone number after a comma or tab */
export function parseGuestLines(raw: string, defaultParty = 1) {
  const seen = new Set<string>();
  const out: { name: string; phone: string; party: number }[] = [];
  for (const line of raw.split(/\r?\n/)) {
    const [first, second = "", third = ""] = line.split(/[,\t;]/);
    const name = clean(first, LIMITS.name);
    if (!name) continue;
    const key = name.toLowerCase();
    if (seen.has(key)) continue; // the same name twice in the list is a copy-and-paste slip
    seen.add(key);
    const maybeParty = Number(third.trim() || (/^\d{1,2}$/.test(second.trim()) ? second.trim() : ""));
    const party = Number.isInteger(maybeParty) && maybeParty >= 1 && maybeParty <= LIMITS.party ? maybeParty : defaultParty;
    const phone = /^\d{1,2}$/.test(second.trim()) ? "" : cleanPhone(second);
    out.push({ name, phone, party });
    if (out.length >= LIMITS.guests) break;
  }
  return out;
}

/* ── Seats ───────────────────────────────────────────────────────────────────────────────────── */

/** The seats people have said yes to */
export const seatsTaken = (replies: Pick<Reply, "answer" | "party">[]) => replies.reduce((s, r) => s + (r.answer === "yes" ? r.party : 0), 0);

/** Seats left, or null when there's no limit */
export const seatsLeft = (capacity: number, seats: number) => (capacity > 0 ? Math.max(0, capacity - seats) : null);

/**
 * Can this person say yes for `party` people? `mine` is what they'd already said yes for (changing
 * your mind doesn't use up seats twice). `left` is how many they could confirm, or null for no limit.
 */
export function canConfirm(capacity: number, seats: number, mine: number, party: number) {
  if (capacity <= 0) return { ok: true, left: null as number | null };
  const left = Math.max(0, capacity - (seats - mine));
  return { ok: party <= left, left };
}

/** How many people one reply can bring: the event's limit, and the guest's own invitation if they were invited */
export const partyLimit = (event: Pick<RsvpEvent, "maxParty">, guest?: Pick<Guest, "party"> | null) => Math.max(1, Math.min(event.maxParty, guest?.party ?? event.maxParty));

/* ── Who has replied ─────────────────────────────────────────────────────────────────────────── */

export type Row = {
  key: string;
  name: string;
  guestId: string; // "" for people who weren't on the list
  invited: number; // seats they were invited for (0 when not on the list)
  phone: string;
  reply: Reply | null;
  status: Answer | "waiting";
};

/** Every invited guest with their answer (or "waiting"), then anyone who replied without being on the list, by name */
export function summarise(guests: Guest[], replies: Reply[]) {
  const byGuest = new Map<string, Reply>();
  const loose: Reply[] = [];
  for (const r of replies) {
    if (r.guestId) {
      const was = byGuest.get(r.guestId);
      if (!was || r.updatedAt >= was.updatedAt) byGuest.set(r.guestId, r);
    } else loose.push(r);
  }
  const byName = (a: Row, b: Row) => a.name.localeCompare(b.name, "en-ZA");
  const listed: Row[] = guests
    .map((g) => {
      const reply = byGuest.get(g.id) ?? null;
      return { key: g.id, name: g.name, guestId: g.id, invited: g.party, phone: g.phone, reply, status: reply ? reply.answer : ("waiting" as const) };
    })
    .sort(byName);
  const unlisted: Row[] = loose.map((r) => ({ key: r.id, name: r.name, guestId: "", invited: 0, phone: "", reply: r, status: r.answer })).sort(byName);
  const rows = [...listed, ...unlisted];
  const people = (a: Answer) => rows.reduce((s, r) => s + (r.reply?.answer === a ? r.reply.party : 0), 0);
  const count = (s: Row["status"]) => rows.filter((r) => r.status === s).length;
  return {
    rows,
    yes: { replies: count("yes"), people: people("yes") },
    maybe: { replies: count("maybe"), people: people("maybe") },
    no: { replies: count("no"), people: 0 },
    waiting: { replies: count("waiting"), people: listed.filter((r) => r.status === "waiting").reduce((s, r) => s + r.invited, 0) },
    invitedPeople: guests.reduce((s, g) => s + g.party, 0),
  };
}

/** Food and needs, counted: "Vegetarian" typed three different ways is one line. Only people who are coming or maybe. */
export function dietSummary(rows: Row[]) {
  const groups = new Map<string, { label: string; replies: number; names: string[] }>();
  for (const r of rows) {
    if (!r.reply || r.reply.answer === "no") continue;
    const typed = clean(r.reply.diet, LIMITS.diet);
    if (!typed) continue;
    const label = typed[0].toUpperCase() + typed.slice(1);
    const key = typed.toLowerCase().replace(/[.!]+$/, "");
    const g = groups.get(key) ?? { label, replies: 0, names: [] };
    g.replies++;
    g.names.push(r.name);
    groups.set(key, g);
  }
  return [...groups.values()].sort((a, b) => b.replies - a.replies || a.label.localeCompare(b.label, "en-ZA"));
}

/** Filters the guest list: everyone, or one answer, or the people still waiting */
export const filterRows = (rows: Row[], filter: Answer | "waiting" | "all", search = "") => {
  const q = search.trim().toLowerCase();
  return rows.filter((r) => (filter === "all" || r.status === filter) && (!q || r.name.toLowerCase().includes(q)));
};

/** Messages for what guests did on their own phones since the last update ("Zanele is coming, with 2 people") */
export function replyChanges(before: Reply[], after: Reply[]) {
  const old = new Map(before.map((r) => [r.id, r]));
  const out: string[] = [];
  for (const r of after) {
    if (r.byHost) continue;
    const was = old.get(r.id);
    if (was && was.answer === r.answer && was.party === r.party) continue;
    out.push(r.answer === "yes" ? `${r.name} is coming${r.party > 1 ? `, with ${r.party - 1} other${r.party > 2 ? "s" : ""}` : ""}` : r.answer === "maybe" ? `${r.name} might come` : `${r.name} can't come`);
  }
  return out;
}

/* ── Messages ────────────────────────────────────────────────────────────────────────────────── */

export const inviteLink = (origin: string, code: string, guestId = "") => `${origin}/rsvp?c=${code}${guestId ? `&g=${guestId}` : ""}`;

/** The message the host shares to everyone (a group chat, a status) */
export function inviteText(event: Pick<RsvpEvent, "title" | "hosts" | "date" | "time" | "venue" | "replyBy">, link: string) {
  return [
    `You're invited! ${event.title}`,
    `${whenLine(event)}${event.venue ? `, ${event.venue}` : ""}`,
    event.replyBy ? `Please reply by ${dayLabel(event.replyBy)}:` : "Please let us know if you can come:",
    link,
  ].join("\n");
}

/** A gentle reminder to one guest who hasn't answered, with their own link */
export function reminderText(event: Pick<RsvpEvent, "title" | "date" | "replyBy">, name: string, link: string) {
  const first = name.split(" ")[0];
  return `Hi ${first}! Just checking if you can make ${event.title} on ${dayLabel(event.date)}. ${event.replyBy ? `We need replies by ${dayLabel(event.replyBy)}. ` : ""}It takes a minute: ${link}`;
}

/** A map search for the venue */
export const mapsLink = (e: Pick<RsvpEvent, "venue" | "address">) => `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent([e.venue, e.address].filter(Boolean).join(", "))}`;

/* ── Files ───────────────────────────────────────────────────────────────────────────────────── */

/**
 * A calendar file (.ics) so a guest can add the event to their phone. Times are "floating" local
 * times (no time zone), which every calendar reads as the time on the phone: right for guests in
 * the same country. It reminds them a day before, and lasts `hours` hours.
 */
export function icsFile(e: Pick<RsvpEvent, "id" | "title" | "date" | "time" | "venue" | "address" | "note">, hours = 5, now = new Date()) {
  const stamp = (date: string, minutes: number) => `${date.replace(/-/g, "")}T${clock(minutes).replace(":", "")}00`;
  const end = e.time + hours * 60;
  const endDate = end >= 1440 ? addDays(e.date, 1) : e.date;
  const escape = (s: string) => s.replace(/([\\,;])/g, "\\$1").replace(/\n/g, "\\n");
  const utc = now.toISOString().replace(/[-:]/g, "").replace(/\.\d+Z$/, "Z");
  const where = [e.venue, e.address].filter(Boolean).join(", ");
  return [
    "BEGIN:VCALENDAR",
    "VERSION:2.0",
    "PRODID:-//RSVPme//EN",
    "BEGIN:VEVENT",
    `UID:${e.id}@rsvpme`,
    `DTSTAMP:${utc}`,
    `DTSTART:${stamp(e.date, e.time)}`,
    `DTEND:${stamp(endDate, end % 1440)}`,
    `SUMMARY:${escape(e.title)}`,
    ...(where ? [`LOCATION:${escape(where)}`] : []),
    ...(e.note ? [`DESCRIPTION:${escape(e.note)}`] : []),
    "BEGIN:VALARM",
    "TRIGGER:-P1D",
    "ACTION:DISPLAY",
    `DESCRIPTION:${escape(`${e.title} is tomorrow`)}`,
    "END:VALARM",
    "END:VEVENT",
    "END:VCALENDAR",
  ].join("\r\n");
}

/**
 * The guest list as a CSV file for a spreadsheet. A cell starting with = + - or @ would be run as
 * a formula by Excel (a guest could type one in as their name or message), so those get a quote in front.
 */
export function guestCsv(rows: Row[]) {
  const cell = (v: string | number) => {
    let s = String(v);
    if (/^[=+\-@\t\r]/.test(s)) s = `'${s}`;
    return /[",\r\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
  };
  const head = ["Name", "Answer", "People coming", "Invited for", "Food and needs", "Message", "Phone"];
  const lines = rows.map((r) => [r.name, r.status === "waiting" ? "No reply yet" : ANSWERS[r.status].short, r.reply?.answer === "no" || !r.reply ? 0 : r.reply.party, r.invited, r.reply?.diet ?? "", r.reply?.message ?? "", r.phone]);
  return [head, ...lines].map((l) => l.map(cell).join(",")).join("\r\n");
}
