"use client";

import { Suspense, useEffect, useState, type FormEvent } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { Sprig, Wordmark } from "@/components/LoginScreen";
import Icon from "@/components/Icon";
import Logo from "@/components/Logo";
import ThemeToggle from "@/components/ThemeToggle";
import { errorCode } from "@/lib/auth";
import { fileSafe, saveFile } from "@/lib/browser";
import { firebaseConfigured } from "@/lib/firebase";
import { openInvitation, sendAnswer, type Invitation } from "@/lib/customer";
import { readCode } from "@/lib/code";
import { ANSWERS, canConfirm, clock, countdown, dayLabel, icsFile, isoDate, LIMITS, mapsLink, partyLimit, replyState, seatsLeft } from "@/lib/rsvp";
import type { Answer, Reply } from "@/lib/types";

/*
  The invitation a guest opens from the link or QR code. No account, no sign-in screen: the guest
  sees the invitation, how many seats are left, and a reply card. Their answer is saved under a
  private anonymous account, so only they and the host can read it (firestore.rules).
  "?preview=1" is the host looking at it: everything shows, but nothing can be sent.
*/
export default function RsvpPage() {
  return (
    <Suspense fallback={<Frame><p className="py-20 text-center text-ink-soft">Opening your invitation…</p></Frame>}>
      <Inner />
    </Suspense>
  );
}

function Frame({ children }: { children: React.ReactNode }) {
  return (
    <div className="garden min-h-screen">
      <div className="mx-auto max-w-xl px-4 pb-16 pt-5">
        <div className="mb-4 flex items-center justify-between">
          <span className="flex items-center gap-2">
            <Logo className="h-9 w-9" />
            <Wordmark className="text-2xl" />
          </span>
          <ThemeToggle />
        </div>
        <main id="main">{children}</main>
      </div>
    </div>
  );
}

type Load = { status: "loading" } | { status: "none" } | { status: "missing" } | { status: "error" } | { status: "ready"; inv: Invitation };

function Inner() {
  const params = useSearchParams();
  const code = readCode(params.get("c"));
  const guestId = (params.get("g") ?? "").slice(0, 40);
  const preview = params.has("preview");
  const [load, setLoad] = useState<Load>({ status: "loading" });

  useEffect(() => {
    let live = true;
    if (!code) {
      setLoad({ status: "none" });
      return;
    }
    if (!firebaseConfigured) {
      setLoad({ status: "error" });
      return;
    }
    setLoad({ status: "loading" });
    openInvitation(code, guestId)
      .then((inv) => live && setLoad({ status: "ready", inv }))
      .catch((e) => live && setLoad({ status: e instanceof Error && e.message === "missing" ? "missing" : "error" }));
    return () => {
      live = false;
    };
  }, [code, guestId]);

  if (load.status === "loading")
    return (
      <Frame>
        <p role="status" className="py-20 text-center text-ink-soft">
          Opening your invitation…
        </p>
      </Frame>
    );
  if (load.status === "none" || load.status === "missing")
    return (
      <Frame>
        <CodeBox missing={load.status === "missing"} />
      </Frame>
    );
  if (load.status === "error")
    return (
      <Frame>
        <div className="invite px-6 py-10 text-center">
          <h1 className="text-3xl">We couldn&apos;t open that invitation</h1>
          <p className="mt-2 text-ink-soft">Check your connection and try again.</p>
          <button type="button" onClick={() => location.reload()} className="btn mt-5">
            Try again
          </button>
        </div>
      </Frame>
    );
  return (
    <Frame>
      <Invite inv={load.inv} preview={preview} update={(inv) => setLoad({ status: "ready", inv })} />
    </Frame>
  );
}

/* No code, or a code that doesn't match an event: type the six characters from the invitation */
function CodeBox({ missing }: { missing: boolean }) {
  const router = useRouter();
  const [text, setText] = useState("");
  const [error, setError] = useState(false);
  function go(e: FormEvent) {
    e.preventDefault();
    const code = readCode(text);
    if (!code) return setError(true);
    router.push(`/rsvp?c=${code}`);
  }
  return (
    <div className="invite px-6 py-10 text-center sm:px-10">
      <Sprig className="mx-auto h-10 w-28 text-sage" />
      <h1 className="mt-3 text-4xl">{missing ? "We can't find that invitation" : "Open your invitation"}</h1>
      <p className="mx-auto mt-2 max-w-sm text-ink-soft">{missing ? "The link may be old, or the hosts made a new one. Ask them to send it again, or type the code from the invitation." : "Type the six-character code from your invitation, or scan its QR code with your camera."}</p>
      <form onSubmit={go} className="mx-auto mt-6 max-w-xs space-y-3">
        <label className="block text-left text-sm font-medium">
          Invitation code
          <input className="field mt-1 text-center font-serif text-3xl uppercase tracking-[0.3em]" value={text} maxLength={9} autoCapitalize="characters" autoComplete="off" spellCheck={false} onChange={(e) => { setText(e.target.value); setError(false); }} placeholder="K7QX2M" />
        </label>
        {error && (
          <p role="alert" className="text-sm font-semibold text-alert">
            That isn&apos;t a six-character code. Check it and try again.
          </p>
        )}
        <button type="submit" className="btn w-full">
          Open the invitation
        </button>
      </form>
    </div>
  );
}

function Invite({ inv, preview, update }: { inv: Invitation; preview: boolean; update: (inv: Invitation) => void }) {
  const { event, guest } = inv;
  const today = isoDate(new Date());
  const state = replyState(event, today);
  const [editing, setEditing] = useState(false);
  const mine = inv.mine;
  const first = guest?.name.split(" ")[0] ?? "";

  return (
    <div className="space-y-6">
      {preview && (
        <p className="rounded-md border border-gold bg-card px-4 py-2 text-center text-sm">
          <strong>Preview.</strong> This is what your guests see. Replies can&apos;t be sent from here.
        </p>
      )}

      <article className="invite rise px-6 pb-9 pt-10 text-center sm:px-10" aria-labelledby="title">
        <Sprig className="mx-auto h-11 w-32 text-sage" />
        <p className="eyebrow mt-4">{guest ? `For ${guest.name}` : "You are invited"}</p>
        <h1 id="title" className="font-script mt-3 text-[3.4rem] leading-[1.05] text-brand sm:text-7xl">
          {event.title}
        </h1>
        {event.hosts && <p className="mt-2 font-serif text-xl italic text-ink-soft">hosted by {event.hosts}</p>}
        <div className="flourish mx-auto my-5 max-w-xs">
          <span className="block h-1.5 w-1.5 rotate-45 bg-gold" />
        </div>
        <p className="font-serif text-3xl leading-tight">{dayLabel(event.date, true)}</p>
        <p className="eyebrow mt-2">at {clock(event.time)}</p>
        <p className="mt-3 inline-block rounded-full bg-sage-soft px-3 py-1 text-sm font-medium text-sage-deep">{countdown(event.date, today)}</p>
        {event.venue && (
          <div className="mt-6">
            <p className="font-serif text-2xl">{event.venue}</p>
            {event.address && <p className="text-ink-soft">{event.address}</p>}
            <a href={mapsLink(event)} target="_blank" rel="noreferrer" className="btn-quiet mt-3 py-2 text-sm">
              <Icon name="pin" className="h-4 w-4" /> Open in maps
            </a>
          </div>
        )}
        {event.note && <p className="mx-auto mt-6 max-w-sm border-t border-line pt-5 font-serif text-lg italic">{event.note}</p>}
      </article>

      {inv.elsewhere ? (
        <section className="invite px-6 py-8 text-center" aria-labelledby="done">
          <Icon name="check" className="mx-auto h-8 w-8 text-sage-deep" />
          <h2 id="done" className="mt-2 text-3xl">
            You&apos;ve already replied
          </h2>
          <p className="mx-auto mt-2 max-w-sm text-ink-soft">{first ? `${first}, your` : "Your"} answer was sent from another phone, or the hosts wrote it down for you. To change it, please tell the hosts.</p>
        </section>
      ) : mine && !editing ? (
        <Thanks inv={inv} mine={mine} canChange={state !== "closed" && !preview} onChange={() => setEditing(true)} />
      ) : state === "closed" ? (
        <section className="invite px-6 py-8 text-center" aria-labelledby="closed">
          <h2 id="closed" className="text-3xl">
            Replies are closed
          </h2>
          <p className="mx-auto mt-2 max-w-sm text-ink-soft">{today > event.date ? "This event has taken place." : "The hosts aren't taking more replies."} If you need to tell them something, please contact them directly.</p>
        </section>
      ) : (
        <ReplyCard inv={inv} state={state} preview={preview} onSent={(seats, reply) => { update({ ...inv, seats, mine: reply }); setEditing(false); }} onCancel={mine ? () => setEditing(false) : null} />
      )}
    </div>
  );
}

function ReplyCard({ inv, state, preview, onSent, onCancel }: { inv: Invitation; state: "open" | "late"; preview: boolean; onSent: (seats: number, reply: Reply) => void; onCancel: (() => void) | null }) {
  const { event, guest, mine } = inv;
  const [name, setName] = useState(mine?.name ?? guest?.name ?? "");
  const [answer, setAnswer] = useState<Answer | null>(mine?.answer ?? null);
  const limit = partyLimit(event, guest);
  const [party, setParty] = useState(mine && mine.party > 0 ? Math.min(mine.party, limit) : guest ? Math.min(guest.party, limit) : 1);
  const [diet, setDiet] = useState(mine?.diet ?? "");
  const [message, setMessage] = useState(mine?.message ?? "");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const myYes = mine?.answer === "yes" ? mine.party : 0;
  const left = seatsLeft(event.capacity, inv.seats - myYes);
  const full = left !== null && left === 0;

  async function submit(e: FormEvent) {
    e.preventDefault();
    if (!answer) return setError("Choose one of the three answers above.");
    if (!name.trim()) return setError("Please type your name, so the hosts know who replied.");
    if (answer === "yes" && !canConfirm(event.capacity, inv.seats, myYes, party).ok) return setError(`Only ${left} ${left === 1 ? "seat is" : "seats are"} left. Choose fewer people, or tell the hosts.`);
    setBusy(true);
    setError("");
    try {
      const done = await sendAnswer(inv, { name, answer, party, diet, message });
      onSent(done.seats, done.reply);
    } catch (e) {
      setBusy(false);
      const code = errorCode(e);
      if (e instanceof Error && e.message === "full") setError("Sorry, the last seats were just taken. You can say maybe, or tell the hosts.");
      else if (code === "permission-denied") setError("The hosts have stopped taking replies, or this invitation was already answered on another phone. Please contact them.");
      else setError("Couldn't send your reply. Check your connection and try again.");
    }
  }

  return (
    <form onSubmit={submit} className="invite rise px-6 pb-8 pt-9 sm:px-9" aria-labelledby="reply-title">
      <p className="eyebrow text-center">{event.replyBy ? `Kindly reply by ${dayLabel(event.replyBy)}` : "Kindly reply"}</p>
      <h2 id="reply-title" className="mt-1 text-center text-4xl">
        Will you <em>join us</em>?
      </h2>
      {state === "late" && <p className="mt-2 text-center text-sm text-ink-soft">The hosts asked for replies by {dayLabel(event.replyBy)}, but you can still answer.</p>}
      {left !== null && (
        <p className="mt-3 text-center text-sm text-ink-soft">
          {full ? "All the seats are taken. You can still say maybe or no." : `${left} ${left === 1 ? "seat" : "seats"} left`}
        </p>
      )}

      {!guest && (
        <label className="mt-6 block text-sm font-medium">
          Your name
          <input className="field mt-1 font-normal" value={name} maxLength={LIMITS.name} autoComplete="name" onChange={(e) => setName(e.target.value)} required />
        </label>
      )}

      <div role="radiogroup" aria-label="Your answer" className="mt-6 space-y-2.5">
        {(["yes", "maybe", "no"] as Answer[]).map((a) => {
          const blocked = a === "yes" && full;
          return (
            <button key={a} type="button" role="radio" aria-checked={answer === a} disabled={blocked} onClick={() => setAnswer(a)} className="choice w-full disabled:cursor-not-allowed disabled:opacity-50">
              <span className="dot">{answer === a && <Icon name="check" className="h-3 w-3" />}</span>
              <span>
                <span className="block font-serif text-xl font-medium leading-tight">{ANSWERS[a].label}</span>
                <span className="block text-sm text-ink-soft">{a === "yes" ? "I'll be there" : a === "maybe" ? "I'll tell you as soon as I know" : "I can't make it"}</span>
              </span>
            </button>
          );
        })}
      </div>

      {answer && answer !== "no" && (
        <div className="mt-6 space-y-4">
          {limit > 1 && (
            <label className="block text-sm font-medium">
              How many people, counting you?
              <select className="field mt-1 w-auto font-normal" value={party} onChange={(e) => setParty(Number(e.target.value))}>
                {Array.from({ length: limit }, (_, i) => i + 1).map((n) => (
                  <option key={n} value={n}>
                    {n}
                  </option>
                ))}
              </select>
              {guest && guest.party > 1 && <span className="mt-1 block text-xs font-normal text-ink-soft">{guest.party} seats are saved for you.</span>}
            </label>
          )}
          <label className="block text-sm font-medium">
            Food and needs <span className="font-normal text-ink-soft">(optional)</span>
            <input className="field mt-1 font-normal" value={diet} maxLength={LIMITS.diet} onChange={(e) => setDiet(e.target.value)} placeholder="Vegetarian, halaal, a wheelchair…" />
          </label>
        </div>
      )}
      {answer && (
        <label className="mt-4 block text-sm font-medium">
          A message for the hosts <span className="font-normal text-ink-soft">(optional)</span>
          <input className="field mt-1 font-normal" value={message} maxLength={LIMITS.message} onChange={(e) => setMessage(e.target.value)} />
        </label>
      )}

      {error && (
        <p role="alert" className="mt-4 text-sm font-semibold text-alert">
          {error}
        </p>
      )}
      <div className="mt-6 flex flex-wrap items-center gap-3">
        <button type="submit" disabled={busy || preview} className="btn px-7 py-3">
          {busy ? "Sending…" : preview ? "Sending is off in the preview" : mine ? "Save my new answer" : "Send my reply"}
        </button>
        {onCancel && (
          <button type="button" onClick={onCancel} className="btn-quiet py-3">
            Keep my answer
          </button>
        )}
      </div>
    </form>
  );
}

function Thanks({ inv, mine, canChange, onChange }: { inv: Invitation; mine: Reply; canChange: boolean; onChange: () => void }) {
  const { event } = inv;
  const first = mine.name.split(" ")[0];
  const line =
    mine.answer === "yes"
      ? `We've saved ${mine.party === 1 ? "a seat" : `${mine.party} seats`} for you. We can't wait to celebrate with you.`
      : mine.answer === "maybe"
        ? "We've marked you as a maybe. Please tell the hosts as soon as you know."
        : "We'll miss you. Thank you for letting us know.";
  return (
    <section className="invite rise px-6 pb-8 pt-9 text-center sm:px-9" aria-labelledby="thanks">
      <Logo className="mx-auto h-16 w-16 drop-shadow-[0_8px_8px_rgba(60,15,25,0.3)]" />
      <p className="eyebrow mt-4">{ANSWERS[mine.answer].label}</p>
      <h2 id="thanks" className="font-script mt-2 text-5xl leading-tight text-brand">
        Thank you, {first}
      </h2>
      <p className="mx-auto mt-3 max-w-sm font-serif text-xl">{line}</p>
      {(mine.diet || mine.message) && (
        <p className="mx-auto mt-3 max-w-sm text-sm text-ink-soft">
          {mine.diet && <>Food and needs: {mine.diet}. </>}
          {mine.message && <>Your message: “{mine.message}”</>}
        </p>
      )}
      <div className="mt-6 flex flex-wrap justify-center gap-2">
        {mine.answer !== "no" && (
          <button type="button" onClick={() => saveFile(`${fileSafe(event.title)}.ics`, icsFile(event), "text/calendar;charset=utf-8")} className="btn py-2.5">
            <Icon name="calendarPlus" className="h-4 w-4" /> Add to my calendar
          </button>
        )}
        {canChange && (
          <button type="button" onClick={onChange} className="btn-quiet py-2.5">
            <Icon name="pencil" className="h-4 w-4" /> Change my answer
          </button>
        )}
      </div>
    </section>
  );
}
