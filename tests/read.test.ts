import { describe, expect, it } from "vitest";
import { readEvent, readGuest, readReply } from "@/lib/read";

describe("reading what's saved", () => {
  it("gives a broken event safe defaults", () => {
    const e = readEvent("e", { title: 42, kind: "funeral", date: "next Saturday", time: 99999, maxParty: 0, capacity: -5, replyBy: "soon" });
    expect(e).toMatchObject({ title: "Our event", kind: "other", date: "1970-01-01", time: 1439, maxParty: 4, capacity: 0, replyBy: "", open: true });
  });
  it("keeps a good event as it is", () => {
    const good = { ownerId: "u", title: "Thandi & Sipho's wedding", kind: "wedding", hosts: "Thandi and Sipho", date: "2026-12-05", time: 840, venue: "Rose Garden Lodge", address: "Magaliesburg", note: "Dress: smart", code: "K7QX2M", replyBy: "2026-11-20", capacity: 120, maxParty: 3, open: false, createdAt: 5 };
    expect(readEvent("e", good)).toEqual({ id: "e", ...good });
  });
  it("makes sure a guest is invited for at least one seat", () => {
    expect(readGuest("g", { name: "Zanele", party: 0 }).party).toBe(1);
    expect(readGuest("g", { name: "Zanele", party: 2 }, "082 555 0123")).toMatchObject({ party: 2, phone: "082 555 0123" });
    expect(readGuest("g", {}).name).toBe("Guest");
  });
  it("reads a reply, and fixes impossible numbers", () => {
    const good = { uid: "u", guestId: "g", name: "Zanele", answer: "yes", party: 2, diet: "Vegetarian", message: "Can't wait", byHost: false, createdAt: 1, updatedAt: 2 };
    expect(readReply("r", good)).toEqual({ id: "r", ...good });
    expect(readReply("r", { ...good, answer: "no", party: 3 }).party).toBe(0); // a no brings nobody
    expect(readReply("r", { ...good, party: 0 }).party).toBe(1); // a yes brings at least the person
    expect(readReply("r", { ...good, answer: "perhaps" }).answer).toBe("maybe");
  });
});
