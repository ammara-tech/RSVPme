"use client";

import { useMemo, useState } from "react";
import Icon from "@/components/Icon";
import ReplyEditor from "@/components/ReplyEditor";
import { addGuests, removeGuest, removeReply, updateGuest } from "@/lib/actions";
import { copyText, fileSafe, saveFile } from "@/lib/browser";
import { addToast, type Detail } from "@/lib/store";
import { ANSWERS, dietSummary, filterRows, guestCsv, inviteLink, LIMITS, parseGuestLines, reminderText, seatsLeft, summarise, waLink, type Row } from "@/lib/rsvp";
import type { Answer, Guest, RsvpEvent } from "@/lib/types";

type Filter = Answer | "waiting" | "all";

/*
  The guest list: who has replied, the seats left, what everyone eats, and a gentle WhatsApp
  reminder for the people who haven't answered, each with their own link.
*/
export default function GuestsTab({ event, detail }: { event: RsvpEvent; detail: Detail }) {
  const [filter, setFilter] = useState<Filter>("all");
  const [search, setSearch] = useState("");
  const [open, setOpen] = useState<string | null>(null); // the row with its panel open
  const [adding, setAdding] = useState(false);
  const sum = useMemo(() => summarise(detail.guests, detail.replies), [detail.guests, detail.replies]);
  const rows = filterRows(sum.rows, filter, search);
  const diets = useMemo(() => dietSummary(sum.rows), [sum.rows]);
  const left = seatsLeft(event.capacity, detail.seats);
  const pct = event.capacity > 0 ? Math.min(100, Math.round((detail.seats / event.capacity) * 100)) : 0;
  const origin = typeof window === "undefined" ? "" : window.location.origin;

  const tiles: { key: Filter; label: string; big: number; small: string; tone: string }[] = [
    { key: "yes", label: "Coming", big: sum.yes.people, small: `${sum.yes.replies} ${sum.yes.replies === 1 ? "reply" : "replies"}`, tone: "text-sage-deep" },
    { key: "maybe", label: "Maybe", big: sum.maybe.people, small: `${sum.maybe.replies} ${sum.maybe.replies === 1 ? "reply" : "replies"}`, tone: "text-gold-text" },
    { key: "no", label: "Can't come", big: sum.no.replies, small: sum.no.replies === 1 ? "reply" : "replies", tone: "text-alert" },
    { key: "waiting", label: "Not replied", big: sum.waiting.replies, small: `${sum.waiting.replies === 1 ? "guest" : "guests"} · ${sum.waiting.people} invited`, tone: "text-ink" },
  ];

  return (
    <div className="space-y-8">
      <section aria-label="Summary" className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        {tiles.map((t) => (
          <button key={t.key} type="button" aria-pressed={filter === t.key} onClick={() => setFilter(filter === t.key ? "all" : t.key)} className="plain-card p-4 text-left hover:border-brand aria-pressed:border-brand aria-pressed:bg-brand-soft">
            <span className="eyebrow">{t.label}</span>
            <span className={`mt-1 block font-serif text-5xl leading-none ${t.tone}`}>{t.big}</span>
            <span className="mt-1 block text-sm text-ink-soft">{t.small}</span>
          </button>
        ))}
      </section>

      <section className="plain-card p-5">
        <p className="flex flex-wrap items-baseline justify-between gap-2">
          <span className="font-serif text-2xl">
            {detail.seats} {detail.seats === 1 ? "seat" : "seats"} taken
            {event.capacity > 0 && <span className="text-ink-soft"> of {event.capacity}</span>}
          </span>
          <span className="text-sm text-ink-soft">{left === null ? "No limit on seats" : left === 0 ? "The event is full" : `${left} left`}</span>
        </p>
        {event.capacity > 0 && (
          <div className="mt-3 h-3 overflow-hidden rounded-full bg-sage-soft" role="img" aria-label={`${pct}% of the seats are taken`}>
            <div className="h-full rounded-full bg-sage-deep" style={{ width: `${pct}%` }} />
          </div>
        )}
        {detail.seats !== sum.yes.people && <p className="mt-3 text-sm text-ink-soft">The list shows {sum.yes.people} coming. If that looks off, refresh the page.</p>}
      </section>

      {diets.length > 0 && (
        <section aria-labelledby="diets" className="plain-card p-5">
          <h2 id="diets" className="flex items-center gap-2 text-2xl">
            <Icon name="utensils" className="h-5 w-5 text-gold-text" /> Food and needs
          </h2>
          <ul className="mt-3 grid gap-2 sm:grid-cols-2">
            {diets.map((d) => (
              <li key={d.label} className="flex items-baseline justify-between gap-3 rounded-md bg-page px-3 py-2">
                <span>
                  <span className="font-medium">{d.label}</span>
                  <span className="block text-sm text-ink-soft">{d.names.join(", ")}</span>
                </span>
                <strong className="font-serif text-2xl">{d.replies}</strong>
              </li>
            ))}
          </ul>
        </section>
      )}

      <section aria-labelledby="list">
        <div className="flex flex-wrap items-end justify-between gap-3">
          <h2 id="list" className="text-3xl">
            The guest list
          </h2>
          <div className="flex flex-wrap gap-2">
            <button type="button" onClick={() => setAdding((a) => !a)} aria-expanded={adding} className="btn py-2">
              <Icon name="userPlus" className="h-4 w-4" /> Add guests
            </button>
            <button type="button" disabled={sum.rows.length === 0} onClick={() => saveFile(`${fileSafe(event.title)}-guests.csv`, guestCsv(sum.rows), "text/csv;charset=utf-8")} className="btn-quiet py-2">
              <Icon name="download" className="h-4 w-4" /> Spreadsheet
            </button>
          </div>
        </div>

        {adding && <AddGuests event={event} count={detail.guests.length} onDone={() => setAdding(false)} />}

        <div className="mt-4 flex flex-wrap items-center gap-2">
          {(["all", "yes", "maybe", "no", "waiting"] as Filter[]).map((f) => (
            <button key={f} type="button" aria-pressed={filter === f} onClick={() => setFilter(f)} className="chip">
              {f === "all" ? "Everyone" : f === "waiting" ? "Not replied" : ANSWERS[f].short}
            </button>
          ))}
          <label className="relative ml-auto block min-w-[11rem] flex-1 sm:max-w-xs">
            <span className="sr-only">Search the list</span>
            <Icon name="search" className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-ink-soft" />
            <input type="search" className="field py-1.5 pl-9" placeholder="Search by name" value={search} onChange={(e) => setSearch(e.target.value)} />
          </label>
        </div>

        {!detail.loaded ? (
          <p className="mt-6 text-ink-soft" role="status">
            Loading the list…
          </p>
        ) : sum.rows.length === 0 ? (
          <div className="plain-card mt-4 px-6 py-10 text-center">
            <Icon name="people" className="mx-auto h-9 w-9 text-gold" />
            <p className="mt-3 font-serif text-2xl">No guests yet</p>
            <p className="mx-auto mt-1 max-w-sm text-ink-soft">Paste your list of names to give each guest their own link. Or just share the invitation link from the Share tab: anyone with it can reply.</p>
          </div>
        ) : rows.length === 0 ? (
          <p className="mt-6 text-ink-soft">Nobody matches. Try another filter or name.</p>
        ) : (
          <ul className="mt-4 divide-y divide-line overflow-hidden rounded-md border border-line bg-card">
            {rows.map((r) => (
              <GuestRow key={r.key} row={r} event={event} guest={detail.guests.find((g) => g.id === r.guestId) ?? null} origin={origin} open={open === r.key} onToggle={(on) => setOpen(on ? r.key : null)} />
            ))}
          </ul>
        )}
        <p className="mt-3 text-sm text-ink-soft">
          <button type="button" onClick={() => setOpen(open === "new" ? null : "new")} className="font-semibold text-brand hover:underline">
            Write down a reply for someone who isn&apos;t on the list
          </button>
        </p>
        {open === "new" && (
          <div className="mt-3">
            <ReplyEditor event={event} guest={null} existing={null} onDone={() => setOpen(null)} />
          </div>
        )}
      </section>
    </div>
  );
}

const BADGE: Record<Row["status"], { text: string; cls: string }> = {
  yes: { text: "Coming", cls: "bg-sage-soft text-sage-deep" },
  maybe: { text: "Maybe", cls: "bg-brand-soft text-gold-text" },
  no: { text: "Can't come", cls: "bg-alert-soft text-alert" },
  waiting: { text: "Not replied", cls: "border border-line text-ink-soft" },
};

function GuestRow({ row, event, guest, origin, open, onToggle }: { row: Row; event: RsvpEvent; guest: Guest | null; origin: string; open: boolean; onToggle: (on: boolean) => void }) {
  const [mode, setMode] = useState<"reply" | "guest">("reply");
  const [confirm, setConfirm] = useState(false);
  const r = row.reply;
  const link = inviteLink(origin, event.code, row.guestId);

  async function copy() {
    addToast((await copyText(link)) ? `Copied ${row.name.split(" ")[0]}'s personal link` : "Couldn't copy. Select the link by hand.");
  }

  async function remove() {
    try {
      if (guest) await removeGuest(event.id, guest);
      else if (r) await removeReply(event.id, r);
    } catch {
      addToast("Couldn't remove that. Check your connection.");
    }
  }

  return (
    <li className="px-4 py-3">
      <div className="flex flex-wrap items-center gap-x-3 gap-y-2">
        <div className="min-w-0 flex-1">
          <p className="flex flex-wrap items-baseline gap-x-2">
            <span className="font-serif text-xl font-medium">{row.name}</span>
            {row.invited === 0 && <span className="text-xs text-ink-soft">not on the list</span>}
            {r?.byHost && <span className="text-xs text-ink-soft">written down by you</span>}
          </p>
          <p className="text-sm text-ink-soft">
            {r && r.answer !== "no" ? `${r.party} ${r.party === 1 ? "person" : "people"}` : row.invited > 0 ? `Invited for ${row.invited}` : ""}
            {r?.diet && ` · ${r.diet}`}
          </p>
          {r?.message && <p className="mt-0.5 text-sm italic">“{r.message}”</p>}
        </div>
        <span className={`rounded-full px-3 py-1 text-sm font-medium ${BADGE[row.status].cls}`}>{BADGE[row.status].text}</span>
        <div className="flex gap-1">
          {row.status === "waiting" && (
            <a href={waLink(row.phone, reminderText(event, row.name, link))} target="_blank" rel="noreferrer" className="tool text-brand" aria-label={`Remind ${row.name} on WhatsApp`} title="Remind on WhatsApp">
              <Icon name="whatsapp" className="h-5 w-5" />
            </a>
          )}
          {row.guestId && (
            <button type="button" onClick={copy} className="tool" aria-label={`Copy ${row.name}'s personal link`} title="Copy their personal link">
              <Icon name="link" className="h-5 w-5" />
            </button>
          )}
          <button type="button" onClick={() => onToggle(!open)} aria-expanded={open} className="tool" aria-label={`Change ${row.name}`} title="Change">
            <Icon name="pencil" className="h-5 w-5" />
          </button>
        </div>
      </div>

      {open && (
        <div className="mt-3 space-y-3">
          {guest && (
            <div role="tablist" aria-label="What to change" className="flex gap-4 border-b border-line">
              <button type="button" role="tab" aria-selected={mode === "reply"} onClick={() => setMode("reply")} className="tab">
                Their reply
              </button>
              <button type="button" role="tab" aria-selected={mode === "guest"} onClick={() => setMode("guest")} className="tab">
                Name and phone
              </button>
            </div>
          )}
          {mode === "reply" || !guest ? <ReplyEditor event={event} guest={guest} existing={r} onDone={() => onToggle(false)} /> : <GuestEditor eventId={event.id} guest={guest} onDone={() => onToggle(false)} />}
          <div className="text-sm">
            {confirm ? (
              <span className="flex flex-wrap items-center gap-3">
                <span>{guest ? `Remove ${row.name} and their reply?` : `Delete ${row.name}'s reply?`}</span>
                <button type="button" onClick={remove} className="font-semibold text-alert hover:underline">
                  Yes, remove
                </button>
                <button type="button" onClick={() => setConfirm(false)} className="font-semibold hover:underline">
                  Keep
                </button>
              </span>
            ) : (
              (guest || r) && (
                <button type="button" onClick={() => setConfirm(true)} className="inline-flex items-center gap-1.5 font-semibold text-alert hover:underline">
                  <Icon name="trash" className="h-4 w-4" /> {guest ? "Remove from the list" : "Delete this reply"}
                </button>
              )
            )}
          </div>
        </div>
      )}
    </li>
  );
}

function GuestEditor({ eventId, guest, onDone }: { eventId: string; guest: Guest; onDone: () => void }) {
  const [name, setName] = useState(guest.name);
  const [party, setParty] = useState(guest.party);
  const [phone, setPhone] = useState(guest.phone);
  return (
    <form
      onSubmit={(e) => {
        e.preventDefault();
        updateGuest(eventId, guest, { name, party, phone });
        onDone();
      }}
      className="grid gap-3 rounded-md border border-line bg-page p-4 sm:grid-cols-3"
    >
      <label className="block text-sm font-medium">
        Name
        <input className="field mt-1 font-normal" value={name} maxLength={LIMITS.name} onChange={(e) => setName(e.target.value)} required />
      </label>
      <label className="block text-sm font-medium">
        Invited for
        <select className="field mt-1 font-normal" value={party} onChange={(e) => setParty(Number(e.target.value))}>
          {Array.from({ length: LIMITS.party }, (_, i) => i + 1).map((n) => (
            <option key={n} value={n}>
              {n} {n === 1 ? "seat" : "seats"}
            </option>
          ))}
        </select>
      </label>
      <label className="block text-sm font-medium">
        WhatsApp number
        <input className="field mt-1 font-normal" inputMode="tel" value={phone} maxLength={LIMITS.phone} onChange={(e) => setPhone(e.target.value)} placeholder="082 555 0123" />
      </label>
      <div className="flex gap-2 sm:col-span-3">
        <button type="submit" className="btn py-2">
          Save
        </button>
        <button type="button" onClick={onDone} className="btn-quiet py-2">
          Cancel
        </button>
      </div>
    </form>
  );
}

function AddGuests({ event, count, onDone }: { event: RsvpEvent; count: number; onDone: () => void }) {
  const [text, setText] = useState("");
  const [party, setParty] = useState(2);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const people = useMemo(() => parseGuestLines(text, party), [text, party]);
  const room = LIMITS.guests - count;

  async function add() {
    setBusy(true);
    setError("");
    try {
      const n = await addGuests(event.id, people, count);
      addToast(`Added ${n} ${n === 1 ? "guest" : "guests"}`);
      onDone();
    } catch {
      setError("Couldn't add them. Check your connection and try again.");
      setBusy(false);
    }
  }

  return (
    <div className="plain-card mt-4 space-y-3 p-5">
      <label className="block text-sm font-medium">
        Paste names, one on each line
        <textarea className="field mt-1 font-normal" rows={6} value={text} onChange={(e) => setText(e.target.value)} placeholder={"Zanele Khumalo, 082 555 0141, 2\nAunty Grace, 071 555 0113, 3\nLerato Sithole"} />
        <span className="mt-1 block text-xs font-normal text-ink-soft">Each line can have a phone number and the number of seats after the name, separated by commas. You can paste straight from a spreadsheet.</span>
      </label>
      <label className="flex items-center gap-2 text-sm font-medium">
        Seats for a guest with no number
        <select className="field w-auto py-1.5 font-normal" value={party} onChange={(e) => setParty(Number(e.target.value))}>
          {Array.from({ length: event.maxParty }, (_, i) => i + 1).map((n) => (
            <option key={n} value={n}>
              {n}
            </option>
          ))}
        </select>
      </label>
      {error && (
        <p role="alert" className="text-sm font-semibold text-alert">
          {error}
        </p>
      )}
      {people.length > room && <p className="text-sm text-alert">An event can have {LIMITS.guests} guests, so only the first {Math.max(0, room)} will be added.</p>}
      <div className="flex items-center gap-3">
        <button type="button" disabled={busy || people.length === 0 || room <= 0} onClick={add} className="btn py-2">
          {busy ? "Adding…" : people.length === 0 ? "Add guests" : `Add ${Math.min(people.length, Math.max(0, room))} ${people.length === 1 ? "guest" : "guests"}`}
        </button>
        <button type="button" onClick={onDone} className="btn-quiet py-2">
          Cancel
        </button>
      </div>
    </div>
  );
}
