"use client";

import { Suspense, useEffect, useState } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import EventForm from "@/components/EventForm";
import GuestsTab from "@/components/GuestsTab";
import Icon from "@/components/Icon";
import ShareTab from "@/components/ShareTab";
import { deleteEvent, updateEvent } from "@/lib/actions";
import { closeEvent, openEvent, useApp } from "@/lib/store";
import { countdown, isoDate, KINDS, replyState, whenLine } from "@/lib/rsvp";

/* One event: the guest list and replies, the invitation's details, and how to share it */
export default function EventPage() {
  return (
    <Suspense fallback={<p className="text-ink-soft">Opening the event…</p>}>
      <Inner />
    </Suspense>
  );
}

type Tab = "guests" | "invitation" | "share";
const TABS: { id: Tab; label: string; icon: "people" | "pencil" | "send" }[] = [
  { id: "guests", label: "Guests", icon: "people" },
  { id: "invitation", label: "Invitation", icon: "pencil" },
  { id: "share", label: "Share", icon: "send" },
];

function Inner() {
  const id = useSearchParams().get("id") ?? "";
  const app = useApp();
  const router = useRouter();
  const [tab, setTab] = useState<Tab>("guests");
  const event = app.events.find((e) => e.id === id) ?? null;

  useEffect(() => {
    if (event) openEvent(event.id);
    return () => closeEvent();
  }, [event?.id]); // eslint-disable-line react-hooks/exhaustive-deps

  if (!event)
    return (
      <div className="mx-auto max-w-md py-16 text-center">
        <h1 className="text-4xl">We couldn&apos;t find that event</h1>
        <p className="mt-2 text-ink-soft">It may have been deleted, or it belongs to another account.</p>
        <Link href="/" className="btn mt-6">
          Back to your events
        </Link>
      </div>
    );

  const today = isoDate(new Date());
  const state = replyState(event, today);
  const detail = app.detail && app.detail.eventId === event.id ? app.detail : null;

  return (
    <div>
      <Link href="/" className="no-print inline-flex items-center gap-1 text-sm font-medium text-ink-soft hover:text-brand">
        <Icon name="left" className="h-4 w-4" /> Your events
      </Link>

      <div className="invite rise no-print mt-3 px-6 py-8 text-center sm:px-10">
        <p className="eyebrow">{KINDS[event.kind].label}</p>
        <h1 className="font-script mt-2 text-5xl leading-[1.1] text-brand sm:text-6xl">{event.title}</h1>
        {event.hosts && <p className="mt-1 font-serif text-lg italic text-ink-soft">hosted by {event.hosts}</p>}
        <div className="flourish mx-auto my-4 max-w-xs">
          <span className="block h-1.5 w-1.5 rotate-45 bg-gold" />
        </div>
        <p className="font-serif text-2xl">{whenLine(event)}</p>
        {event.venue && <p className="text-ink-soft">{[event.venue, event.address].filter(Boolean).join(" · ")}</p>}
        <p className="mt-4 flex flex-wrap items-center justify-center gap-2 text-sm">
          <span className="rounded-full bg-sage-soft px-3 py-1 font-medium text-sage-deep">{countdown(event.date, today)}</span>
          <span className={`rounded-full px-3 py-1 font-medium ${state === "open" ? "bg-brand-soft text-brand" : "bg-alert-soft text-alert"}`}>{state === "open" ? "Taking replies" : state === "late" ? "Past the reply-by date" : "Replies closed"}</span>
        </p>
      </div>

      <div role="tablist" aria-label="Event pages" className="no-print mt-8 flex gap-6 border-b border-line">
        {TABS.map((t) => (
          <button key={t.id} type="button" role="tab" id={`tab-${t.id}`} aria-selected={tab === t.id} aria-controls={`panel-${t.id}`} onClick={() => setTab(t.id)} className="tab flex items-center gap-2 text-lg">
            <Icon name={t.icon} className="h-4 w-4" /> {t.label}
          </button>
        ))}
      </div>

      <div role="tabpanel" id={`panel-${tab}`} aria-labelledby={`tab-${tab}`} className="mt-6">
        {tab === "guests" &&
          (detail ? (
            <GuestsTab event={event} detail={detail} />
          ) : (
            <p className="text-ink-soft" role="status">
              Loading the list…
            </p>
          ))}
        {tab === "invitation" && (
          <div className="mx-auto max-w-2xl space-y-10">
            <EventForm
              initial={event}
              submitLabel="Save changes"
              onSave={(fields) => {
                updateEvent(event.id, fields);
              }}
            />
            <DeleteEvent onDelete={async () => {
              await deleteEvent(event);
              router.push("/");
            }} title={event.title} />
          </div>
        )}
        {tab === "share" && <ShareTab event={event} />}
      </div>
    </div>
  );
}

function DeleteEvent({ title, onDelete }: { title: string; onDelete: () => Promise<void> }) {
  const [step, setStep] = useState<"idle" | "sure" | "busy">("idle");
  const [error, setError] = useState(false);
  return (
    <section aria-labelledby="del" className="rounded-md border border-alert/40 p-5">
      <h2 id="del" className="text-2xl text-alert">
        Delete this event
      </h2>
      <p className="mt-1 text-sm text-ink-soft">Removes {title}, its guest list, every reply and the invitation link. Guests who open the link will find nothing. This can&apos;t be undone.</p>
      {step === "idle" ? (
        <button type="button" onClick={() => setStep("sure")} className="btn-quiet mt-3 border-alert text-alert">
          <Icon name="trash" className="h-4 w-4" /> Delete the event
        </button>
      ) : (
        <p className="mt-3 flex flex-wrap items-center gap-3 text-sm">
          <strong>Delete everything about this event?</strong>
          <button
            type="button"
            disabled={step === "busy"}
            onClick={async () => {
              setStep("busy");
              setError(false);
              try {
                await onDelete();
              } catch {
                setError(true);
                setStep("sure");
              }
            }}
            className="font-semibold text-alert hover:underline"
          >
            {step === "busy" ? "Deleting…" : "Yes, delete it"}
          </button>
          <button type="button" onClick={() => setStep("idle")} className="font-semibold hover:underline">
            Keep it
          </button>
          {error && <span className="font-semibold text-alert">Couldn&apos;t delete. Check your connection.</span>}
        </p>
      )}
    </section>
  );
}
