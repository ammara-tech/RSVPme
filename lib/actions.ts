"use client";

import { collection, doc, getDocs, runTransaction, writeBatch, type DocumentReference } from "firebase/firestore";
import { firebase } from "@/lib/firebase";
import { newCode } from "@/lib/code";
import { addDays, clean, cleanPhone, isoDate, LIMITS } from "@/lib/rsvp";
import { getApp, reportProblem } from "@/lib/store";
import type { Answer, Guest, Reply, RsvpEvent } from "@/lib/types";

/*
  Everything the host changes. Most changes are sent as one batch, so they happen together or not at
  all, and they show straight away even with weak signal. Writing down a reply is a transaction: it
  moves the reply and the seats taken together, so the count can never drift. The security rules
  (firestore.rules) check every change.
*/

const db = () => firebase().db;
const me = () => {
  const uid = firebase().auth.currentUser?.uid;
  if (!uid) throw new Error("Not signed in");
  return uid;
};
const eventRef = (id: string) => doc(db(), "events", id);
const statsRef = (id: string) => doc(db(), "events", id, "stats", "totals");

function quietly(p: Promise<unknown>) {
  p.catch((e) => {
    console.error("Saving failed:", e);
    reportProblem("A change couldn't be saved. Refresh the page to see what's really saved.");
  });
}

export type EventFields = Pick<RsvpEvent, "title" | "kind" | "hosts" | "date" | "time" | "venue" | "address" | "note" | "replyBy" | "capacity" | "maxParty" | "open">;

export const cleanEvent = (f: Partial<EventFields>) => {
  const c: Record<string, unknown> = {};
  if (f.title !== undefined) c.title = clean(f.title, LIMITS.title) || "Our event";
  if (f.kind !== undefined) c.kind = f.kind;
  if (f.hosts !== undefined) c.hosts = clean(f.hosts, LIMITS.hosts);
  if (f.date !== undefined) c.date = f.date;
  if (f.time !== undefined) c.time = Math.max(0, Math.min(1439, Math.round(f.time) || 0));
  if (f.venue !== undefined) c.venue = clean(f.venue, LIMITS.venue);
  if (f.address !== undefined) c.address = clean(f.address, LIMITS.address);
  if (f.note !== undefined) c.note = clean(f.note, LIMITS.note);
  if (f.replyBy !== undefined) c.replyBy = f.replyBy;
  if (f.capacity !== undefined) c.capacity = Math.max(0, Math.min(LIMITS.capacity, Math.round(f.capacity) || 0));
  if (f.maxParty !== undefined) c.maxParty = Math.max(1, Math.min(LIMITS.party, Math.round(f.maxParty) || 1));
  if (f.open !== undefined) c.open = f.open;
  return c;
};

/** Starts an event: the event, its seat count (at zero) and its invitation code, in one step */
export async function createEvent(fields: EventFields, ownerId = me()) {
  for (let tries = 0; tries < 4; tries++) {
    const ref = doc(collection(db(), "events"));
    const code = newCode();
    const batch = writeBatch(db());
    batch.set(ref, { ownerId, ...cleanEvent(fields), code, createdAt: Date.now() });
    batch.set(statsRef(ref.id), { seats: 0, replyId: "" });
    batch.set(doc(db(), "codes", code), { eventId: ref.id });
    try {
      await batch.commit();
      return ref.id;
    } catch (e) {
      if (tries === 3) throw e;
    }
  }
  throw new Error("Couldn't start the event");
}

export function updateEvent(id: string, fields: Partial<EventFields>) {
  quietly(writeBatch(db()).update(eventRef(id), cleanEvent(fields)).commit());
}

/** A fresh code for the invitation link and QR code: the old link stops working */
export async function newInviteCode(event: RsvpEvent) {
  const code = newCode();
  const batch = writeBatch(db());
  batch.delete(doc(db(), "codes", event.code));
  batch.set(doc(db(), "codes", code), { eventId: event.id });
  batch.update(eventRef(event.id), { code });
  await batch.commit();
}

/** Adds the people from a pasted list, each with their own invitation link */
export async function addGuests(eventId: string, people: { name: string; phone: string; party: number }[], existing: number) {
  const room = Math.max(0, LIMITS.guests - existing);
  const list = people.slice(0, room);
  for (let i = 0; i < list.length; i += 200) {
    const batch = writeBatch(db());
    for (const p of list.slice(i, i + 200)) {
      const ref = doc(collection(db(), "events", eventId, "guests"));
      batch.set(ref, { name: clean(p.name, LIMITS.name), party: Math.max(1, Math.min(LIMITS.party, p.party)), createdAt: Date.now() });
      const phone = cleanPhone(p.phone);
      if (phone) batch.set(doc(db(), "events", eventId, "contacts", ref.id), { phone });
    }
    await batch.commit();
  }
  return list.length;
}

export function updateGuest(eventId: string, g: Guest, fields: { name: string; party: number; phone: string }) {
  const batch = writeBatch(db());
  batch.update(doc(db(), "events", eventId, "guests", g.id), { name: clean(fields.name, LIMITS.name) || g.name, party: Math.max(1, Math.min(LIMITS.party, fields.party)) });
  const phone = cleanPhone(fields.phone);
  if (phone) batch.set(doc(db(), "events", eventId, "contacts", g.id), { phone });
  else if (g.phone) batch.delete(doc(db(), "events", eventId, "contacts", g.id));
  quietly(batch.commit());
}

/** Takes a guest off the list, with their reply, and gives their seats back */
export async function removeGuest(eventId: string, g: Guest) {
  await runTransaction(db(), async (tx) => {
    const reply = await tx.get(doc(db(), "events", eventId, "replies", g.id));
    const stats = await tx.get(statsRef(eventId));
    if (reply.exists()) {
      const d = reply.data();
      const taken = d.answer === "yes" && typeof d.party === "number" ? d.party : 0;
      tx.delete(reply.ref);
      tx.set(statsRef(eventId), { seats: Math.max(0, (Number(stats.data()?.seats) || 0) - taken), replyId: "" });
    }
    tx.delete(doc(db(), "events", eventId, "guests", g.id));
    tx.delete(doc(db(), "events", eventId, "contacts", g.id));
  });
}

export type ReplyInput = { name: string; answer: Answer; party: number; diet: string; message: string };

/** The host writes down a reply (a phone call, a chat), for someone on the list or not. Moves the seats too. */
export async function writeReply(eventId: string, input: ReplyInput, guest: Guest | null, existing: Reply | null) {
  const uid = me();
  const id = existing?.id ?? guest?.id ?? doc(collection(db(), "events", eventId, "replies")).id;
  const ref = doc(db(), "events", eventId, "replies", id);
  await runTransaction(db(), async (tx) => {
    const was = await tx.get(ref);
    const stats = await tx.get(statsRef(eventId));
    const old = was.exists() && was.data().answer === "yes" ? Number(was.data().party) || 0 : 0;
    const party = input.answer === "no" ? 0 : Math.max(1, Math.min(LIMITS.party, Math.round(input.party) || 1));
    const now = Date.now();
    tx.set(ref, {
      uid: was.exists() ? String(was.data().uid) : uid,
      guestId: was.exists() ? String(was.data().guestId ?? "") : (guest?.id ?? ""),
      name: clean(input.name, LIMITS.name) || guest?.name || "Guest",
      answer: input.answer,
      party,
      diet: clean(input.diet, LIMITS.diet),
      message: clean(input.message, LIMITS.message),
      byHost: true,
      createdAt: was.exists() ? Number(was.data().createdAt) || now : now,
      updatedAt: now,
    });
    tx.set(statsRef(eventId), { seats: Math.max(0, (Number(stats.data()?.seats) || 0) - old + (input.answer === "yes" ? party : 0)), replyId: id });
  });
}

/** Deletes a reply (the guest is back to "waiting") and gives its seats back */
export async function removeReply(eventId: string, r: Reply) {
  await runTransaction(db(), async (tx) => {
    const stats = await tx.get(statsRef(eventId));
    tx.delete(doc(db(), "events", eventId, "replies", r.id));
    tx.set(statsRef(eventId), { seats: Math.max(0, (Number(stats.data()?.seats) || 0) - (r.answer === "yes" ? r.party : 0)), replyId: "" });
  });
}

async function inParts(refs: DocumentReference[], last: (b: ReturnType<typeof writeBatch>) => void) {
  const parts: DocumentReference[][] = [];
  for (let i = 0; i < refs.length; i += 450) parts.push(refs.slice(i, i + 450));
  if (!parts.length) parts.push([]);
  for (let p = 0; p < parts.length; p++) {
    const batch = writeBatch(db());
    parts[p].forEach((r) => batch.delete(r));
    if (p === parts.length - 1) last(batch);
    await batch.commit();
  }
}

/** Deletes an event: every reply, guest and phone number, its seat count, its code and the event itself (last) */
export async function deleteEvent(event: RsvpEvent) {
  const refs: DocumentReference[] = [];
  for (const name of ["replies", "guests", "contacts"]) (await getDocs(collection(db(), "events", event.id, name))).docs.forEach((d) => refs.push(d.ref));
  refs.push(statsRef(event.id));
  await inParts(refs, (batch) => {
    batch.delete(doc(db(), "codes", event.code));
    batch.delete(eventRef(event.id));
  });
}

/** Deletes every event of this account (ending the demo) */
export async function deleteAllEvents() {
  for (const e of [...getApp().events]) await deleteEvent(e);
}

/** For a new demo: a wedding three weeks away with a guest list, most of it answered */
export async function seedDemo() {
  const uid = me();
  const today = isoDate(new Date());
  const id = await createEvent(
    {
      title: "Thandi & Sipho's wedding",
      kind: "wedding",
      hosts: "Thandi Mokoena and Sipho Dlamini",
      date: addDays(today, 24),
      time: 15 * 60,
      venue: "Kloof Garden Estate",
      address: "14 Fern Road, Waterfall, Midrand",
      note: "Dress code: elegant, with a touch of sage green. Plenty of parking on the estate.",
      replyBy: addDays(today, 10),
      capacity: 80,
      maxParty: 4,
      open: true,
    },
    uid,
  );
  const people: [string, number, string, Answer | "", number, string, string][] = [
    // name, invited for, phone, answer, coming, food and needs, message
    ["Zanele Khumalo", 2, "082 555 0141", "yes", 2, "Vegetarian", "We wouldn't miss it!"],
    ["Thabo and Lindiwe Nkosi", 2, "083 555 0172", "yes", 2, "", "So happy for you both."],
    ["Aunty Grace Mokoena", 3, "071 555 0113", "yes", 3, "Halaal for one", "Coming from Polokwane the day before."],
    ["Lerato Sithole", 1, "084 555 0160", "yes", 1, "", ""],
    ["Kagiso Molefe", 2, "072 555 0128", "yes", 2, "Wheelchair access", "Congratulations!"],
    ["Naledi Pillay", 2, "060 555 0199", "maybe", 2, "", "Waiting to hear about my shifts."],
    ["Refilwe Dube", 1, "082 555 0107", "no", 0, "", "Away that weekend. Sending love."],
    ["Busisiwe Zulu", 4, "079 555 0183", "yes", 4, "Two kids' meals", ""],
    ["Pieter van Wyk", 2, "083 555 0135", "yes", 1, "", "Just me, Marietjie is unwell."],
    ["Palesa Maseko", 2, "081 555 0156", "", 0, "", ""],
    ["Mandla Ndlovu", 2, "073 555 0190", "", 0, "", ""],
    ["Ayanda Cele", 1, "078 555 0121", "", 0, "", ""],
    ["Cousin Bongani", 3, "074 555 0144", "yes", 2, "No pork", "Bringing my wife."],
    ["Nomsa Radebe", 2, "082 555 0168", "", 0, "", ""],
  ];
  // The event now exists, so the rules let the host add its guests and replies
  const batch = writeBatch(db());
  let seats = 0;
  people.forEach(([name, party, phone, answer, coming, diet, message], i) => {
    const g = doc(collection(db(), "events", id, "guests"));
    batch.set(g, { name, party, createdAt: Date.now() - (14 - i) * 3600000 });
    batch.set(doc(db(), "events", id, "contacts", g.id), { phone });
    if (!answer) return;
    // Replies in the demo belong to the host's own guest account: it's a rehearsal, not real guests
    batch.set(doc(db(), "events", id, "replies", g.id), { uid, guestId: g.id, name, answer, party: coming, diet, message, byHost: i % 5 === 4, createdAt: Date.now() - (9 - i) * 3600000, updatedAt: Date.now() - (9 - i) * 3600000 });
    if (answer === "yes") seats += coming;
  });
  batch.set(statsRef(id), { seats, replyId: "" });
  await batch.commit();
  return id;
}

