"use client";

import { useSyncExternalStore } from "react";
import { collection, doc, limit, onSnapshot, query, where, type Unsubscribe } from "firebase/firestore";
import { firebase } from "@/lib/firebase";
import { readEvent, readGuest, readReply } from "@/lib/read";
import { replyChanges } from "@/lib/rsvp";
import type { Guest, Reply, RsvpEvent } from "@/lib/types";

/*
  The host's live copy of their events, kept up to date by Firestore. Opening an event also watches
  its guest list, phone numbers, replies and seats taken. When a guest answers on their phone, it
  appears in the list within a moment, with a message ("Zanele is coming, with 1 other").

  Your own changes show straight away, even with weak signal: Firestore saves them on the device
  first ("pending") and sends them when it can.
*/

export type Toast = { id: number; text: string };

export type Detail = {
  eventId: string;
  loaded: boolean;
  guests: Guest[];
  replies: Reply[];
  seats: number;
};

export type AppState = {
  uid: string | null;
  status: "loading" | "ready";
  events: RsvpEvent[];
  seatsByEvent: Record<string, number>;
  detail: Detail | null;
  pending: boolean;
  online: boolean;
  toasts: Toast[];
  problem: string | null;
};

let state: AppState = { uid: null, status: "loading", events: [], seatsByEvent: {}, detail: null, pending: false, online: true, toasts: [], problem: null };

const listeners = new Set<() => void>();
function set(change: Partial<AppState>) {
  state = { ...state, ...change };
  listeners.forEach((l) => l());
}

let stopEvents: Unsubscribe | null = null;
let stopSeats: Unsubscribe[] = [];
let stopDetail: Unsubscribe[] = [];
let watchedSeats = "";
let watchingDetail = "";
let firstReplies = true;
let toastId = 0;
const pendingParts = new Map<string, boolean>();

function setPending(part: string, value: boolean) {
  pendingParts.set(part, value);
  set({ pending: [...pendingParts.values()].some(Boolean) });
}

export function addToast(text: string) {
  const toast = { id: ++toastId, text };
  set({ toasts: [...state.toasts, toast].slice(-3) });
  setTimeout(() => dismissToast(toast.id), 5000);
}

export function dismissToast(id: number) {
  set({ toasts: state.toasts.filter((t) => t.id !== id) });
}

export function reportProblem(problem: string | null) {
  set({ problem });
}

/** Each event's seats taken, for the cards on the first page */
function watchSeats(ids: string[]) {
  const key = ids.join(",");
  if (key === watchedSeats) return;
  watchedSeats = key;
  stopSeats.forEach((s) => s());
  stopSeats = ids.map((id) =>
    onSnapshot(
      doc(firebase().db, "events", id, "stats", "totals"),
      (snap) => {
        const seats = snap.exists() && typeof snap.data().seats === "number" ? (snap.data().seats as number) : 0;
        set({ seatsByEvent: { ...state.seatsByEvent, [id]: seats } });
      },
      () => {},
    ),
  );
}

/** Starts watching one event's guests, phone numbers and replies (the event page) */
export function openEvent(eventId: string) {
  if (watchingDetail === eventId) return;
  closeEvent();
  watchingDetail = eventId;
  firstReplies = true;
  const { db } = firebase();
  const base = { eventId, loaded: false, guests: [] as Guest[], replies: [] as Reply[], seats: 0 };
  set({ detail: base });
  let phones = new Map<string, string>();
  let rawGuests: { id: string; data: Record<string, unknown> }[] = [];
  const rebuildGuests = () => {
    if (!state.detail || state.detail.eventId !== eventId) return;
    set({ detail: { ...state.detail, loaded: true, guests: rawGuests.map((g) => readGuest(g.id, g.data, phones.get(g.id) ?? "")) } });
  };
  stopDetail = [
    onSnapshot(
      collection(db, "events", eventId, "guests"),
      { includeMetadataChanges: true },
      (snap) => {
        setPending("guests", snap.metadata.hasPendingWrites);
        rawGuests = snap.docs.map((d) => ({ id: d.id, data: d.data() }));
        rebuildGuests();
      },
      () => set({ detail: { ...base, loaded: true } }),
    ),
    onSnapshot(
      collection(db, "events", eventId, "contacts"),
      (snap) => {
        phones = new Map(snap.docs.map((d) => [d.id, typeof d.data().phone === "string" ? (d.data().phone as string) : ""]));
        rebuildGuests();
      },
      () => {},
    ),
    onSnapshot(
      collection(db, "events", eventId, "replies"),
      { includeMetadataChanges: true },
      (snap) => {
        setPending("replies", snap.metadata.hasPendingWrites);
        const replies = snap.docs.map((d) => readReply(d.id, d.data()));
        if (!state.detail || state.detail.eventId !== eventId) return;
        if (!firstReplies && !snap.metadata.hasPendingWrites) replyChanges(state.detail.replies, replies).forEach(addToast);
        firstReplies = false;
        set({ detail: { ...state.detail, replies } });
      },
      () => {},
    ),
    onSnapshot(
      doc(db, "events", eventId, "stats", "totals"),
      (snap) => {
        if (!state.detail || state.detail.eventId !== eventId) return;
        set({ detail: { ...state.detail, seats: snap.exists() && typeof snap.data().seats === "number" ? (snap.data().seats as number) : 0 } });
      },
      () => {},
    ),
  ];
}

export function closeEvent() {
  stopDetail.forEach((s) => s());
  stopDetail = [];
  watchingDetail = "";
  pendingParts.delete("guests");
  pendingParts.delete("replies");
  if (state.detail) set({ detail: null });
}

const onOnline = () => set({ online: navigator.onLine });

export function connect(uid: string) {
  if (state.uid === uid) return;
  disconnect();
  set({ uid, status: "loading", online: navigator.onLine });
  window.addEventListener("online", onOnline);
  window.addEventListener("offline", onOnline);
  stopEvents = onSnapshot(
    query(collection(firebase().db, "events"), where("ownerId", "==", uid), limit(50)),
    { includeMetadataChanges: true },
    (snap) => {
      setPending("events", snap.metadata.hasPendingWrites);
      // Only the server's answer says "none": an empty copy on this device may just be out of date
      if (snap.empty && snap.metadata.fromCache && state.status === "loading") return;
      const events = snap.docs.map((d) => readEvent(d.id, d.data())).sort((a, b) => a.date.localeCompare(b.date));
      set({ events, status: "ready" });
      watchSeats(events.map((e) => e.id));
    },
    () => set({ status: "ready", problem: "Couldn't load your events. Check your connection and refresh the page." }),
  );
}

export function disconnect() {
  stopEvents?.();
  stopEvents = null;
  stopSeats.forEach((s) => s());
  stopSeats = [];
  watchedSeats = "";
  closeEvent();
  window.removeEventListener("online", onOnline);
  window.removeEventListener("offline", onOnline);
  pendingParts.clear();
  set({ uid: null, status: "loading", events: [], seatsByEvent: {}, detail: null, pending: false, problem: null });
}

export function getApp() {
  return state;
}

const subscribe = (l: () => void) => {
  listeners.add(l);
  return () => listeners.delete(l);
};

export function useApp(): AppState {
  return useSyncExternalStore(subscribe, getApp, getApp);
}
