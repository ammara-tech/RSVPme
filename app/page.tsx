"use client";

import Link from "next/link";
import Icon from "@/components/Icon";
import { useApp } from "@/lib/store";
import { countdown, dayLabel, isoDate, KINDS, replyState, whenLine } from "@/lib/rsvp";
import type { RsvpEvent } from "@/lib/types";

/* The host's first page: each event as a small invitation, with how many seats are taken */
export default function Events() {
  const { events, seatsByEvent } = useApp();
  const today = isoDate(new Date());
  const upcoming = events.filter((e) => e.date >= today);
  const past = events.filter((e) => e.date < today).reverse();

  return (
    <div>
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <p className="eyebrow">Your invitations</p>
          <h1 className="text-5xl">Your <em>events</em></h1>
        </div>
        <Link href="/new" className="btn">
          <Icon name="plus" className="h-4 w-4" /> New event
        </Link>
      </div>

      {events.length === 0 && (
        <div className="invite rise mx-auto mt-10 max-w-lg px-8 py-12 text-center">
          <Icon name="mail" className="mx-auto h-10 w-10 text-gold" />
          <h2 className="mt-4 text-3xl">Start your first invitation</h2>
          <p className="mx-auto mt-2 max-w-sm text-ink-soft">Add the date and venue, share one link, and watch the replies arrive. It takes about two minutes.</p>
          <Link href="/new" className="btn mt-6">
            Create an invitation
          </Link>
        </div>
      )}

      {upcoming.length > 0 && (
        <ul className="mt-8 grid gap-5 sm:grid-cols-2">
          {upcoming.map((e) => (
            <li key={e.id}>
              <EventCard event={e} seats={seatsByEvent[e.id] ?? 0} today={today} />
            </li>
          ))}
        </ul>
      )}

      {past.length > 0 && (
        <section className="mt-12" aria-labelledby="past">
          <h2 id="past" className="text-2xl text-ink-soft">
            Past events
          </h2>
          <ul className="mt-3 divide-y divide-line rounded-md border border-line bg-card">
            {past.map((e) => (
              <li key={e.id}>
                <Link href={`/event?id=${e.id}`} className="flex items-center justify-between gap-3 px-4 py-3 hover:bg-brand-soft">
                  <span className="font-medium">{e.title}</span>
                  <span className="text-sm text-ink-soft">{dayLabel(e.date)}</span>
                </Link>
              </li>
            ))}
          </ul>
        </section>
      )}
    </div>
  );
}

function EventCard({ event, seats, today }: { event: RsvpEvent; seats: number; today: string }) {
  const state = replyState(event, today);
  const pct = event.capacity > 0 ? Math.min(100, Math.round((seats / event.capacity) * 100)) : 0;
  return (
    <Link href={`/event?id=${event.id}`} className="invite rise block p-6 pb-7 transition hover:-translate-y-0.5">
      <p className="eyebrow text-center">{KINDS[event.kind].label}</p>
      <h2 className="mt-2 text-center text-3xl leading-tight">{event.title}</h2>
      <div className="flourish my-3">
        <span className="block h-1.5 w-1.5 rotate-45 bg-gold" />
      </div>
      <p className="text-center font-serif text-xl">{whenLine(event)}</p>
      {event.venue && <p className="text-center text-sm text-ink-soft">{event.venue}</p>}
      <p className="mt-4 flex items-center justify-center gap-2 text-sm">
        <span className="rounded-full bg-sage-soft px-3 py-1 font-medium text-sage-deep">{countdown(event.date, today)}</span>
        <span className={`rounded-full px-3 py-1 font-medium ${state === "open" ? "bg-brand-soft text-brand" : "bg-alert-soft text-alert"}`}>{state === "open" ? "Taking replies" : state === "late" ? "Past reply-by date" : "Replies closed"}</span>
      </p>
      <div className="mt-5">
        <p className="flex items-baseline justify-between text-sm">
          <span className="text-ink-soft">Seats taken</span>
          <strong className="font-serif text-xl">
            {seats}
            {event.capacity > 0 && <span className="text-ink-soft"> of {event.capacity}</span>}
          </strong>
        </p>
        {event.capacity > 0 && (
          <div className="mt-1.5 h-2 overflow-hidden rounded-full bg-sage-soft" role="img" aria-label={`${pct}% of the seats are taken`}>
            <div className="h-full rounded-full bg-sage-deep" style={{ width: `${pct}%` }} />
          </div>
        )}
      </div>
    </Link>
  );
}
