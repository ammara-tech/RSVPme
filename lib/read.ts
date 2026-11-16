import { KINDS, LIMITS } from "@/lib/rsvp";
import type { Answer, Guest, Kind, Reply, RsvpEvent } from "@/lib/types";

/*
  Everything read from Firestore goes through these first. A missing or odd field (an older
  version of the app, or something typed in the Firebase console) becomes a safe default instead
  of crashing a page. The security rules check what's written; this checks what's read.
*/

type Raw = Record<string, unknown>;
const text = (v: unknown, max: number) => (typeof v === "string" ? v.slice(0, max) : "");
const num = (v: unknown, max = Number.MAX_SAFE_INTEGER) => (typeof v === "number" && Number.isFinite(v) && v >= 0 ? Math.min(v, max) : 0);
const isDate = (v: unknown): v is string => typeof v === "string" && /^\d{4}-\d{2}-\d{2}$/.test(v);
const ANSWERS: Answer[] = ["yes", "maybe", "no"];

export function readEvent(id: string, d: Raw): RsvpEvent {
  return {
    id,
    ownerId: text(d.ownerId, 128),
    title: text(d.title, LIMITS.title) || "Our event",
    kind: typeof d.kind === "string" && d.kind in KINDS ? (d.kind as Kind) : "other",
    hosts: text(d.hosts, LIMITS.hosts),
    date: isDate(d.date) ? d.date : "1970-01-01",
    time: num(d.time, 1439),
    venue: text(d.venue, LIMITS.venue),
    address: text(d.address, LIMITS.address),
    note: text(d.note, LIMITS.note),
    code: text(d.code, 6),
    replyBy: isDate(d.replyBy) ? d.replyBy : "",
    capacity: Math.round(num(d.capacity, LIMITS.capacity)),
    maxParty: Math.max(1, Math.round(num(d.maxParty, LIMITS.party)) || 4),
    open: d.open !== false,
    createdAt: num(d.createdAt),
  };
}

export const readGuest = (id: string, d: Raw, phone = ""): Guest => ({
  id,
  name: text(d.name, LIMITS.name) || "Guest",
  party: Math.max(1, Math.round(num(d.party, LIMITS.party)) || 1),
  phone: text(phone, LIMITS.phone),
  createdAt: num(d.createdAt),
});

export function readReply(id: string, d: Raw): Reply {
  const answer = ANSWERS.includes(d.answer as Answer) ? (d.answer as Answer) : "maybe";
  const party = Math.round(num(d.party, LIMITS.party));
  return {
    id,
    uid: text(d.uid, 128),
    guestId: text(d.guestId, 40),
    name: text(d.name, LIMITS.name) || "Guest",
    answer,
    // "no" brings nobody; "yes" and "maybe" bring at least the person who replied
    party: answer === "no" ? 0 : Math.max(1, party),
    diet: text(d.diet, LIMITS.diet),
    message: text(d.message, LIMITS.message),
    byHost: d.byHost === true,
    createdAt: num(d.createdAt),
    updatedAt: num(d.updatedAt) || num(d.createdAt),
  };
}
