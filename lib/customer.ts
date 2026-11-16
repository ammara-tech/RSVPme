"use client";

import { doc, getDoc, runTransaction } from "firebase/firestore";
import { firebase } from "@/lib/firebase";
import { errorCode, guestAccount } from "@/lib/auth";
import { readEvent, readGuest, readReply } from "@/lib/read";
import { canConfirm, clean, LIMITS } from "@/lib/rsvp";
import type { Guest, Reply, RsvpEvent } from "@/lib/types";
import type { ReplyInput } from "@/lib/actions";

/*
  The guest's side: opening an invitation and answering it. Guests don't make an account: they get
  an anonymous one (so the answer is theirs alone and nobody else's phone can change it), and see
  only the invitation, the seats left and their own answer. Everyone's answers stay private to
  the host (firestore.rules).
*/

export type Invitation = {
  event: RsvpEvent;
  guest: Guest | null; // from a personal link
  seats: number;
  mine: Reply | null;
  /** A personal link's answer is on another phone (or the host wrote it down): this phone can't read or change it */
  elsewhere: boolean;
};

/** An invitation code (from the link or QR code) → its event, or null when there's no such event */
export async function findEvent(code: string) {
  const { db } = firebase();
  const snap = await getDoc(doc(db, "codes", code));
  const id = snap.exists() ? snap.data().eventId : null;
  return typeof id === "string" ? id : null;
}

/** Loads the invitation for a code, and (from a personal link) the guest it's for. Throws "missing" for an unknown code. */
export async function openInvitation(code: string, guestId: string): Promise<Invitation> {
  const user = await guestAccount();
  const { db } = firebase();
  const eventId = await findEvent(code);
  if (!eventId) throw new Error("missing");
  const eventSnap = await getDoc(doc(db, "events", eventId));
  if (!eventSnap.exists()) throw new Error("missing");
  const event = readEvent(eventId, eventSnap.data());
  if (event.code !== code) throw new Error("missing"); // an old code after the host made a new one

  let guest: Guest | null = null;
  if (guestId) {
    try {
      const g = await getDoc(doc(db, "events", eventId, "guests", guestId));
      if (g.exists()) guest = readGuest(g.id, g.data());
    } catch {
      /* an unknown id: treated as a plain invitation */
    }
  }
  const seatsSnap = await getDoc(doc(db, "events", eventId, "stats", "totals")).catch(() => null);
  const seats = seatsSnap?.exists() && typeof seatsSnap.data().seats === "number" ? (seatsSnap.data().seats as number) : 0;

  const replyId = guest ? guest.id : user.uid;
  let mine: Reply | null = null;
  let elsewhere = false;
  try {
    const r = await getDoc(doc(db, "events", eventId, "replies", replyId));
    if (r.exists()) mine = readReply(r.id, r.data());
  } catch (e) {
    if (errorCode(e) === "permission-denied") elsewhere = true;
    else throw e;
  }
  return { event, guest, seats, mine, elsewhere };
}

/** Sends (or changes) the guest's answer. The reply and the seats taken move together, in one step. */
export async function sendAnswer(inv: Invitation, input: ReplyInput): Promise<{ seats: number; reply: Reply }> {
  const user = await guestAccount();
  const { db } = firebase();
  const { event, guest } = inv;
  const id = guest ? guest.id : user.uid;
  const ref = doc(db, "events", event.id, "replies", id);
  const stats = doc(db, "events", event.id, "stats", "totals");
  return runTransaction(db, async (tx) => {
    const was = await tx.get(ref);
    const s = await tx.get(stats);
    const seatsNow = s.exists() && typeof s.data().seats === "number" ? (s.data().seats as number) : 0;
    const old = was.exists() && was.data().answer === "yes" ? Number(was.data().party) || 0 : 0;
    const party = input.answer === "no" ? 0 : Math.max(1, Math.min(LIMITS.party, Math.round(input.party) || 1));
    if (input.answer === "yes" && !canConfirm(event.capacity, seatsNow, old, party).ok) throw new Error("full");
    const now = Date.now();
    const reply = {
      uid: user.uid,
      guestId: guest?.id ?? "",
      name: clean(input.name, LIMITS.name) || guest?.name || "Guest",
      answer: input.answer,
      party,
      diet: clean(input.diet, LIMITS.diet),
      message: clean(input.message, LIMITS.message),
      byHost: false,
      createdAt: was.exists() ? Number(was.data().createdAt) || now : now,
      updatedAt: now,
    };
    const seats = Math.max(0, seatsNow - old + (input.answer === "yes" ? party : 0));
    tx.set(ref, reply);
    tx.set(stats, { seats, replyId: id });
    return { seats, reply: readReply(id, reply) };
  });
}
