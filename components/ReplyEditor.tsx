"use client";

import { useState, type FormEvent } from "react";
import Icon from "@/components/Icon";
import { writeReply } from "@/lib/actions";
import { ANSWERS, LIMITS } from "@/lib/rsvp";
import type { Answer, Guest, Reply, RsvpEvent } from "@/lib/types";

/*
  The host writes down a reply for someone (they phoned, or sent a voice note), either for a
  person on the list or for someone who isn't on it. The seats taken move with it.
*/
export default function ReplyEditor({ event, guest, existing, onDone }: { event: RsvpEvent; guest: Guest | null; existing: Reply | null; onDone: () => void }) {
  const [name, setName] = useState(existing?.name ?? guest?.name ?? "");
  const [answer, setAnswer] = useState<Answer>(existing?.answer ?? "yes");
  const [party, setParty] = useState(existing && existing.party > 0 ? existing.party : (guest?.party ?? 1));
  const [diet, setDiet] = useState(existing?.diet ?? "");
  const [message, setMessage] = useState(existing?.message ?? "");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const max = guest ? Math.max(1, guest.party) : event.maxParty;

  async function submit(e: FormEvent) {
    e.preventDefault();
    if (!name.trim()) return setError("Type the guest's name.");
    setBusy(true);
    setError("");
    try {
      await writeReply(event.id, { name, answer, party, diet, message }, guest, existing);
      onDone();
    } catch {
      setError("Couldn't save the reply. Check your connection and try again.");
      setBusy(false);
    }
  }

  return (
    <form onSubmit={submit} className="space-y-4 rounded-md border border-line bg-page p-4">
      {!guest && (
        <label className="block text-sm font-medium">
          Name
          <input className="field mt-1 font-normal" value={name} maxLength={LIMITS.name} onChange={(e) => setName(e.target.value)} required />
        </label>
      )}
      <div role="radiogroup" aria-label="Answer" className="flex flex-wrap gap-2">
        {(["yes", "maybe", "no"] as Answer[]).map((a) => (
          <button key={a} type="button" role="radio" aria-checked={answer === a} aria-pressed={answer === a} onClick={() => setAnswer(a)} className="chip">
            {ANSWERS[a].short}
          </button>
        ))}
      </div>
      {answer !== "no" && (
        <label className="block text-sm font-medium">
          People coming
          <select className="field mt-1 w-auto font-normal" value={party} onChange={(e) => setParty(Number(e.target.value))}>
            {Array.from({ length: Math.max(max, party) }, (_, i) => i + 1).map((n) => (
              <option key={n} value={n}>
                {n}
              </option>
            ))}
          </select>
        </label>
      )}
      <div className="grid gap-3 sm:grid-cols-2">
        <label className="block text-sm font-medium">
          Food and needs
          <input className="field mt-1 font-normal" value={diet} maxLength={LIMITS.diet} onChange={(e) => setDiet(e.target.value)} placeholder="Vegetarian, halaal, a wheelchair…" />
        </label>
        <label className="block text-sm font-medium">
          Their message
          <input className="field mt-1 font-normal" value={message} maxLength={LIMITS.message} onChange={(e) => setMessage(e.target.value)} />
        </label>
      </div>
      {error && (
        <p role="alert" className="text-sm font-semibold text-alert">
          {error}
        </p>
      )}
      <div className="flex gap-2">
        <button type="submit" disabled={busy} className="btn py-2">
          <Icon name="check" className="h-4 w-4" /> {busy ? "Saving…" : "Save reply"}
        </button>
        <button type="button" onClick={onDone} className="btn-quiet py-2">
          Cancel
        </button>
      </div>
    </form>
  );
}
