/*
  What RSVPme stores in Firestore.

  events/{eventId}                 one event: who's hosting, when, where, and how many seats there are.
                                   Anyone with the link can read it, because the invitation page needs all of it.
  events/{eventId}/guests/{id}     someone the host invited: a name and how many seats they're invited for.
                                   Their personal link carries this id. Anyone signed in can read one by its
                                   id (it can't be guessed), but only the host can list them.
  events/{eventId}/contacts/{id}   that guest's phone number, for "Remind on WhatsApp". Only the host can read it.
  events/{eventId}/replies/{id}    an answer: yes, maybe or no, and how many are coming, with a name.
                                   Only the host and the person who sent it can read it.
  events/{eventId}/stats/totals    how many seats are taken (no names), so the invitation page can show
                                   "12 seats left" and the rules can stop an event being overbooked.
  codes/{code}                     the code in the invitation link and QR code, pointing to its event.
*/

export type Kind = "wedding" | "engagement" | "birthday" | "baby" | "other";
export type Answer = "yes" | "maybe" | "no";

export type RsvpEvent = {
  id: string;
  ownerId: string;
  title: string; // "Thandi & Sipho's wedding"
  kind: Kind;
  hosts: string; // "Thandi and Sipho Dlamini", written on the invitation
  date: string; // yyyy-mm-dd
  time: number; // minutes after midnight
  venue: string;
  address: string;
  note: string; // dress code, parking, a gift list
  code: string;
  replyBy: string; // yyyy-mm-dd, or "" for no date
  capacity: number; // seats, 0 for no limit
  maxParty: number; // the most people one reply can bring, counting themselves
  open: boolean; // false: the invitation takes no more replies
  createdAt: number;
};

export type Guest = {
  id: string;
  name: string;
  party: number; // seats they're invited for
  phone: string; // from contacts, only when the host is reading
  createdAt: number;
};

export type Reply = {
  id: string; // the guest's id when they were invited, otherwise their own account's id
  uid: string;
  guestId: string; // "" when the person wasn't on the host's list
  name: string;
  answer: Answer;
  party: number; // people coming, 0 for no
  diet: string; // food and needs: vegetarian, halaal, a wheelchair
  message: string; // a note to the hosts
  byHost: boolean; // the host wrote it down (a phone call, a chat)
  createdAt: number;
  updatedAt: number;
};
