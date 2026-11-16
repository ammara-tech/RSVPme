"use client";

import { useState, type FormEvent } from "react";
import { clock, isoDate, KINDS, LIMITS, minutesOf } from "@/lib/rsvp";
import type { EventFields } from "@/lib/actions";
import type { Kind } from "@/lib/types";

/*
  The invitation's details: used to start an event and to change it later. Everything here is
  printed on the invitation page the guests open, so the hints say who sees what.
*/
export default function EventForm({ initial, submitLabel, onSave }: { initial?: EventFields; submitLabel: string; onSave: (fields: EventFields) => Promise<void> | void }) {
  const today = isoDate(new Date());
  const [kind, setKind] = useState<Kind>(initial?.kind ?? "wedding");
  const [title, setTitle] = useState(initial?.title ?? "");
  const [hosts, setHosts] = useState(initial?.hosts ?? "");
  const [date, setDate] = useState(initial?.date ?? "");
  const [time, setTime] = useState(initial ? clock(initial.time) : "15:00");
  const [venue, setVenue] = useState(initial?.venue ?? "");
  const [address, setAddress] = useState(initial?.address ?? "");
  const [note, setNote] = useState(initial?.note ?? "");
  const [replyBy, setReplyBy] = useState(initial?.replyBy ?? "");
  const [capacity, setCapacity] = useState(initial ? String(initial.capacity || "") : "");
  const [maxParty, setMaxParty] = useState(String(initial?.maxParty ?? 4));
  const [open, setOpen] = useState(initial?.open ?? true);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [saved, setSaved] = useState(false);

  async function submit(e: FormEvent) {
    e.preventDefault();
    setError("");
    setSaved(false);
    const minutes = minutesOf(time);
    if (!title.trim()) return setError("Give the event a name, like the one on the invitation.");
    if (!date) return setError("Choose the date of the event.");
    if (Number.isNaN(minutes)) return setError("Choose the time it starts.");
    if (replyBy && replyBy > date) return setError("The reply-by date should be before the event.");
    const seats = capacity.trim() === "" ? 0 : Number(capacity);
    if (!Number.isInteger(seats) || seats < 0 || seats > LIMITS.capacity) return setError(`Seats should be a whole number up to ${LIMITS.capacity}, or empty for no limit.`);
    setBusy(true);
    try {
      await onSave({ kind, title, hosts, date, time: minutes, venue, address, note, replyBy, capacity: seats, maxParty: Number(maxParty), open });
      setSaved(true);
    } catch {
      setError("Couldn't save. Check your connection and try again.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <form onSubmit={submit} className="space-y-6">
      <fieldset>
        <legend className="text-sm font-medium">What are you celebrating?</legend>
        <div role="radiogroup" aria-label="Kind of event" className="mt-2 flex flex-wrap gap-2">
          {(Object.keys(KINDS) as Kind[]).map((k) => (
            <button key={k} type="button" role="radio" aria-checked={kind === k} aria-pressed={kind === k} onClick={() => setKind(k)} className="chip">
              {KINDS[k].label}
            </button>
          ))}
        </div>
      </fieldset>

      <div className="grid gap-4 sm:grid-cols-2">
        <label className="block text-sm font-medium sm:col-span-2">
          Name of the event
          <input className="field mt-1 font-normal" value={title} maxLength={LIMITS.title} onChange={(e) => setTitle(e.target.value)} placeholder={KINDS[kind].hint} required />
          <span className="mt-1 block text-xs font-normal text-ink-soft">The big name at the top of the invitation.</span>
        </label>
        <label className="block text-sm font-medium sm:col-span-2">
          Hosted by
          <input className="field mt-1 font-normal" value={hosts} maxLength={LIMITS.hosts} onChange={(e) => setHosts(e.target.value)} placeholder="Thandi Mokoena and Sipho Dlamini" />
        </label>
        <label className="block text-sm font-medium">
          Date
          <input type="date" className="field mt-1 font-normal" value={date} min={initial ? undefined : today} onChange={(e) => setDate(e.target.value)} required />
        </label>
        <label className="block text-sm font-medium">
          Starts at
          <input type="time" className="field mt-1 font-normal" value={time} onChange={(e) => setTime(e.target.value)} required />
        </label>
        <label className="block text-sm font-medium">
          Venue
          <input className="field mt-1 font-normal" value={venue} maxLength={LIMITS.venue} onChange={(e) => setVenue(e.target.value)} placeholder="Kloof Garden Estate" />
        </label>
        <label className="block text-sm font-medium">
          Address
          <input className="field mt-1 font-normal" value={address} maxLength={LIMITS.address} onChange={(e) => setAddress(e.target.value)} placeholder="14 Fern Road, Waterfall, Midrand" />
          <span className="mt-1 block text-xs font-normal text-ink-soft">Guests get a map link made from the venue and address.</span>
        </label>
        <label className="block text-sm font-medium sm:col-span-2">
          A note for your guests
          <textarea className="field mt-1 font-normal" rows={3} value={note} maxLength={LIMITS.note} onChange={(e) => setNote(e.target.value)} placeholder="Dress code, parking, a gift list…" />
          <span className="mt-1 block text-right text-xs font-normal text-ink-soft">{note.length}/{LIMITS.note}</span>
        </label>
      </div>

      <div className="grid gap-4 border-t border-line pt-5 sm:grid-cols-3">
        <label className="block text-sm font-medium">
          Reply by
          <input type="date" className="field mt-1 font-normal" value={replyBy} max={date || undefined} onChange={(e) => setReplyBy(e.target.value)} />
          <span className="mt-1 block text-xs font-normal text-ink-soft">Optional. Guests can still reply after it.</span>
        </label>
        <label className="block text-sm font-medium">
          Seats
          <input inputMode="numeric" className="field mt-1 font-normal" value={capacity} onChange={(e) => setCapacity(e.target.value.replace(/\D/g, ""))} placeholder="No limit" />
          <span className="mt-1 block text-xs font-normal text-ink-soft">Once they&apos;re all taken, guests can&apos;t say yes.</span>
        </label>
        <label className="block text-sm font-medium">
          Most people per reply
          <select className="field mt-1 font-normal" value={maxParty} onChange={(e) => setMaxParty(e.target.value)}>
            {Array.from({ length: LIMITS.party }, (_, i) => i + 1).map((n) => (
              <option key={n} value={n}>
                {n === 1 ? "1 (just them)" : `${n} (them and ${n - 1} more)`}
              </option>
            ))}
          </select>
        </label>
      </div>

      {initial && (
        <label className="flex items-center gap-3 text-sm font-medium">
          <input type="checkbox" className="h-5 w-5 accent-[var(--color-brand)]" checked={open} onChange={(e) => setOpen(e.target.checked)} />
          Taking replies (untick to close the invitation to new answers)
        </label>
      )}

      {error && (
        <p role="alert" className="text-sm font-semibold text-alert">
          {error}
        </p>
      )}
      <div className="flex items-center gap-4">
        <button type="submit" disabled={busy} className="btn">
          {busy ? "Saving…" : submitLabel}
        </button>
        {saved && (
          <span role="status" className="text-sm font-medium text-good">
            Saved
          </span>
        )}
      </div>
    </form>
  );
}
