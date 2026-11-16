"use client";

import { useState } from "react";
import Icon from "@/components/Icon";
import Logo from "@/components/Logo";
import QrCode from "@/components/QrCode";
import { copyText } from "@/lib/browser";
import { newInviteCode } from "@/lib/actions";
import { addToast } from "@/lib/store";
import { inviteLink, inviteText, whenLine, waLink } from "@/lib/rsvp";
import type { RsvpEvent } from "@/lib/types";

/*
  Getting the invitation to people: one link for everyone (a group chat, a status), a QR code to
  print for a poster or the table cards, and a WhatsApp message ready to send.
*/
export default function ShareTab({ event }: { event: RsvpEvent }) {
  const origin = typeof window === "undefined" ? "" : window.location.origin;
  const link = inviteLink(origin, event.code);
  const [confirm, setConfirm] = useState(false);
  const [busy, setBusy] = useState(false);

  async function copy() {
    addToast((await copyText(link)) ? "Copied the invitation link" : "Couldn't copy. Select the link by hand.");
  }
  async function renew() {
    setBusy(true);
    try {
      await newInviteCode(event);
      addToast("New link made. The old one no longer works.");
      setConfirm(false);
    } catch {
      addToast("Couldn't change the link. Check your connection.");
    }
    setBusy(false);
  }

  return (
    <div className="grid gap-8 lg:grid-cols-[1fr_20rem]">
      <div className="no-print space-y-8">
        <section aria-labelledby="link" className="plain-card p-5">
          <h2 id="link" className="text-3xl">
            The invitation link
          </h2>
          <p className="mt-1 text-ink-soft">Anyone with this link can open the invitation and reply. It&apos;s the same for everyone, so send it to a group chat or post it as a status.</p>
          <div className="mt-4 flex flex-col gap-2 sm:flex-row">
            <input readOnly aria-label="Invitation link" className="field flex-1" value={link} onFocus={(e) => e.currentTarget.select()} />
            <button type="button" onClick={copy} className="btn">
              <Icon name="copy" className="h-4 w-4" /> Copy
            </button>
          </div>
          <div className="mt-3 flex flex-wrap gap-2">
            <a href={waLink("", inviteText(event, link))} target="_blank" rel="noreferrer" className="btn-quiet">
              <Icon name="whatsapp" className="h-4 w-4" /> Send on WhatsApp
            </a>
            <a href={`/rsvp?c=${event.code}&preview=1`} target="_blank" rel="noreferrer" className="btn-quiet">
              <Icon name="eye" className="h-4 w-4" /> See what guests see
            </a>
          </div>
        </section>

        <section aria-labelledby="personal" className="plain-card p-5">
          <h2 id="personal" className="text-3xl">
            Personal links
          </h2>
          <p className="mt-1 text-ink-soft">
            Guests you add on the Guests tab each get their own link. It already has their name on it and how many seats they&apos;re invited for, so they only tap yes or no, and you see exactly who has replied. On the guest list, the link icon copies it and the WhatsApp icon sends a reminder to anyone who hasn&apos;t answered.
          </p>
        </section>

        <section aria-labelledby="code" className="plain-card p-5">
          <h2 id="code" className="text-3xl">
            Change the link
          </h2>
          <p className="mt-1 text-ink-soft">If the link ended up where it shouldn&apos;t, make a new one. The old link and QR code stop working, and so do the personal links you sent, so you&apos;d need to send them again.</p>
          {confirm ? (
            <p className="mt-3 flex flex-wrap items-center gap-3 text-sm">
              <span>Stop the current link working?</span>
              <button type="button" disabled={busy} onClick={renew} className="font-semibold text-alert hover:underline">
                Yes, make a new link
              </button>
              <button type="button" onClick={() => setConfirm(false)} className="font-semibold hover:underline">
                Keep it
              </button>
            </p>
          ) : (
            <button type="button" onClick={() => setConfirm(true)} className="btn-quiet mt-3">
              <Icon name="refresh" className="h-4 w-4" /> Make a new link
            </button>
          )}
        </section>
      </div>

      <aside aria-label="Printable QR card" className="space-y-3">
        <div className="invite print-card px-6 pb-7 pt-8 text-center">
          <Logo className="mx-auto h-12 w-12" />
          <p className="eyebrow mt-3">Kindly reply</p>
          <p className="font-script mt-1 text-4xl leading-tight text-brand">{event.title}</p>
          <p className="mt-1 text-sm text-ink-soft">{whenLine(event)}</p>
          <div className="mx-auto mt-4 w-fit rounded-md border border-line bg-white p-2">
            <QrCode text={link} className="h-40 w-40" label={`QR code for the invitation to ${event.title}`} />
          </div>
          <p className="mt-3 text-sm">Scan with your phone&apos;s camera</p>
          <p className="mt-1 text-xs text-ink-soft">
            or go to {origin.replace(/^https?:\/\//, "")}/rsvp and type <strong className="tracking-widest">{event.code}</strong>
          </p>
        </div>
        <button type="button" onClick={() => window.print()} className="btn-quiet no-print w-full">
          <Icon name="print" className="h-4 w-4" /> Print this card
        </button>
      </aside>
    </div>
  );
}
