import { describe, expect, it } from "vitest";
import {
  addDays, canConfirm, clean, cleanPhone, clock, countdown, daysBetween, dayLabel, dietSummary, filterRows, guestCsv, icsFile, inviteLink, inviteText, mapsLink,
  minutesOf, parseGuestLines, partyLimit, reminderText, replyChanges, replyState, seatsLeft, seatsTaken, summarise, waLink, waNumber, whenLine,
} from "@/lib/rsvp";
import type { Guest, Reply } from "@/lib/types";

// 5 Dec 2026 is a Saturday
const event = { id: "e1", title: "Thandi & Sipho's wedding", hosts: "Thandi and Sipho", date: "2026-12-05", time: 840, venue: "Rose Garden Lodge", address: "Magaliesburg", note: "Dress: smart, closed shoes", replyBy: "2026-11-20", open: true, maxParty: 3 };

const guest = (id: string, name: string, party = 1, phone = ""): Guest => ({ id, name, party, phone, createdAt: 1 });
const reply = (id: string, over: Partial<Reply> = {}): Reply => ({ id, uid: "u" + id, guestId: "", name: "Someone", answer: "yes", party: 1, diet: "", message: "", byHost: false, createdAt: 1, updatedAt: 1, ...over });

describe("dates and times", () => {
  it("turns minutes into a clock and back", () => {
    expect([0, 840, 870, 1439].map(clock)).toEqual(["00:00", "14:00", "14:30", "23:59"]);
    expect(minutesOf("14:30")).toBe(870);
    expect(minutesOf("24:00")).toBeNaN();
    expect(minutesOf("2pm")).toBeNaN();
  });
  it("counts calendar days across months, years and daylight saving", () => {
    expect(addDays("2026-11-30", 1)).toBe("2026-12-01");
    expect(addDays("2026-12-31", 1)).toBe("2027-01-01");
    expect(daysBetween("2026-11-15", "2026-12-05")).toBe(20);
    expect(daysBetween("2026-12-05", "2026-11-15")).toBe(-20);
    expect(daysBetween("2026-03-28", "2026-03-30")).toBe(2);
    expect(daysBetween("2026-12-05", "2026-12-05")).toBe(0);
  });
  it("says how far away the day is", () => {
    expect(countdown("2026-12-05", "2026-12-05")).toBe("Today");
    expect(countdown("2026-12-05", "2026-12-04")).toBe("Tomorrow");
    expect(countdown("2026-12-05", "2026-11-25")).toBe("In 10 days");
    expect(countdown("2026-12-05", "2026-11-14")).toBe("In 3 weeks");
    expect(countdown("2026-12-05", "2026-12-06")).toBe("Yesterday");
    expect(countdown("2026-12-05", "2026-12-09")).toBe("4 days ago");
  });
  it("writes the day the way the invitation shows it", () => {
    expect(dayLabel("2026-12-05")).toMatch(/Sat/);
    expect(dayLabel("2026-12-05", true)).toMatch(/Saturday.*5 December 2026/);
    expect(whenLine(event)).toMatch(/Saturday.*5 December 2026 at 14:00/);
  });
});

describe("when replies are taken", () => {
  it("is open until the reply-by date, then late, and closed after the day or when switched off", () => {
    expect(replyState(event, "2026-11-20")).toBe("open");
    expect(replyState(event, "2026-11-21")).toBe("late");
    expect(replyState(event, "2026-12-05")).toBe("late");
    expect(replyState(event, "2026-12-06")).toBe("closed");
    expect(replyState({ ...event, open: false }, "2026-11-01")).toBe("closed");
    expect(replyState({ ...event, replyBy: "" }, "2026-12-01")).toBe("open");
  });
});

describe("typed text", () => {
  it("tidies names and numbers", () => {
    expect(clean("  Thandi   Dlamini  ", 40)).toBe("Thandi Dlamini");
    expect(clean("abcdef", 3)).toBe("abc");
    expect(cleanPhone("082-555 0123 (home)")).toBe("082555 0123");
  });
  it("makes South African numbers into WhatsApp numbers", () => {
    expect(waNumber("082 555 0123")).toBe("27825550123");
    expect(waNumber("+27 82 555 0123")).toBe("27825550123");
    expect(waNumber("27825550123")).toBe("27825550123");
    expect(waNumber("555 0123")).toBeNull();
    expect(waNumber("")).toBeNull();
  });
  it("builds a WhatsApp link with the message ready", () => {
    expect(waLink("082 555 0123", "Hi & hello")).toBe("https://wa.me/27825550123?text=Hi%20%26%20hello");
    expect(waLink("", "Hi")).toBe("https://wa.me/?text=Hi"); // no number: the host picks the chat
  });
  it("reads a pasted guest list: names, optional phone and seats", () => {
    const list = parseGuestLines("Zanele Dlamini, 082 555 0123, 2\nBusi, 3\n\nLerato\nzanele dlamini\nNomsa; 071 555 0000", 1);
    expect(list).toEqual([
      { name: "Zanele Dlamini", phone: "082 555 0123", party: 2 },
      { name: "Busi", phone: "", party: 3 },
      { name: "Lerato", phone: "", party: 1 },
      { name: "Nomsa", phone: "071 555 0000", party: 1 },
    ]);
    expect(parseGuestLines("Thabo, 99", 2)[0].party).toBe(2); // too many seats: the default is used
  });
});

describe("seats", () => {
  it("adds up only the people who said yes", () => {
    expect(seatsTaken([reply("a", { party: 2 }), reply("b", { answer: "maybe", party: 3 }), reply("c", { answer: "no", party: 0 }), reply("d", { party: 1 })])).toBe(3);
  });
  it("knows how many seats are left, or that there's no limit", () => {
    expect(seatsLeft(120, 98)).toBe(22);
    expect(seatsLeft(120, 130)).toBe(0);
    expect(seatsLeft(0, 50)).toBeNull();
  });
  it("lets someone change their mind without using their seats twice", () => {
    expect(canConfirm(0, 500, 0, 4)).toEqual({ ok: true, left: null });
    expect(canConfirm(10, 8, 0, 3)).toEqual({ ok: false, left: 2 });
    expect(canConfirm(10, 8, 0, 2)).toEqual({ ok: true, left: 2 });
    expect(canConfirm(10, 10, 3, 3)).toEqual({ ok: true, left: 3 }); // already counted: they can keep the same seats
    expect(canConfirm(10, 10, 3, 4)).toEqual({ ok: false, left: 3 });
  });
  it("limits a reply to the event's limit and the guest's own invitation", () => {
    expect(partyLimit(event)).toBe(3);
    expect(partyLimit(event, guest("g", "Zanele", 2))).toBe(2);
    expect(partyLimit(event, guest("g", "Zanele", 6))).toBe(3);
  });
});

describe("who has replied", () => {
  const guests = [guest("g1", "Zanele", 2, "082 555 0123"), guest("g2", "Busi", 1), guest("g3", "Andile", 3), guest("g4", "Naledi", 1)];
  const replies = [
    reply("g1", { guestId: "g1", name: "Zanele", answer: "yes", party: 2, diet: "Vegetarian" }),
    reply("g2", { guestId: "g2", name: "Busi", answer: "no", party: 0 }),
    reply("g3", { guestId: "g3", name: "Andile", answer: "maybe", party: 2, diet: "vegetarian" }),
    reply("x1", { name: "Palesa", answer: "yes", party: 1, diet: "Halaal" }),
  ];
  const s = summarise(guests, replies);

  it("lists invited guests by name, then anyone who replied without being on the list", () => {
    expect(s.rows.map((r) => r.name)).toEqual(["Andile", "Busi", "Naledi", "Zanele", "Palesa"]);
    expect(s.rows.find((r) => r.name === "Naledi")?.status).toBe("waiting");
    expect(s.rows.find((r) => r.name === "Palesa")).toMatchObject({ invited: 0, guestId: "", status: "yes" });
  });
  it("counts replies and people for each answer", () => {
    expect(s.yes).toEqual({ replies: 2, people: 3 });
    expect(s.maybe).toEqual({ replies: 1, people: 2 });
    expect(s.no).toEqual({ replies: 1, people: 0 });
    expect(s.waiting).toEqual({ replies: 1, people: 1 });
    expect(s.invitedPeople).toBe(7);
  });
  it("uses a guest's latest reply when there is more than one", () => {
    const twice = summarise([guest("g1", "Zanele")], [reply("a", { guestId: "g1", answer: "no", party: 0, updatedAt: 1 }), reply("b", { guestId: "g1", answer: "yes", updatedAt: 9 })]);
    expect(twice.rows[0].status).toBe("yes");
  });
  it("filters the list by answer and by a few letters of a name", () => {
    expect(filterRows(s.rows, "yes").map((r) => r.name)).toEqual(["Zanele", "Palesa"]);
    expect(filterRows(s.rows, "waiting").map((r) => r.name)).toEqual(["Naledi"]);
    expect(filterRows(s.rows, "all", " ZAN ").map((r) => r.name)).toEqual(["Zanele"]);
    expect(filterRows(s.rows, "all")).toHaveLength(5);
  });
  it("counts food and needs, treating different spellings as one, and leaving out people who can't come", () => {
    const diet = dietSummary([...s.rows, { ...s.rows[1], reply: reply("z", { answer: "no", party: 0, diet: "Vegan" }) }]);
    expect(diet.map((d) => [d.label, d.replies])).toEqual([["Vegetarian", 2], ["Halaal", 1]]);
    expect(diet[0].names).toEqual(["Andile", "Zanele"]);
  });
});

describe("messages for the host", () => {
  it("says what guests did on their phones, but not what the host wrote down", () => {
    const before = [reply("a", { name: "Zanele", answer: "maybe", party: 1 })];
    const after = [
      reply("a", { name: "Zanele", answer: "yes", party: 3 }),
      reply("b", { name: "Busi", answer: "no", party: 0 }),
      reply("c", { name: "Lerato", answer: "maybe" }),
      reply("d", { name: "Nomsa", answer: "yes", party: 2 }),
      reply("e", { name: "Phone call", answer: "yes", byHost: true }),
    ];
    expect(replyChanges(before, after)).toEqual(["Zanele is coming, with 2 others", "Busi can't come", "Lerato might come", "Nomsa is coming, with 1 other"]);
    expect(replyChanges(after, after)).toEqual([]);
  });
});

describe("links and messages", () => {
  it("builds the invitation message and a gentle reminder", () => {
    const link = inviteLink("https://rsvpme.example", "K7QX2M", "g1");
    expect(link).toBe("https://rsvpme.example/rsvp?c=K7QX2M&g=g1");
    expect(inviteText(event, link)).toMatch(/^You're invited! Thandi & Sipho's wedding\nSaturday.*14:00, Rose Garden Lodge\nPlease reply by .*20 Nov.*:\nhttps/);
    expect(inviteText({ ...event, replyBy: "", venue: "" }, link)).toContain("Please let us know if you can come:");
    expect(reminderText(event, "Zanele Dlamini", link)).toMatch(/^Hi Zanele! Just checking if you can make Thandi & Sipho's wedding on .*5 Dec.*We need replies by .*20 Nov.*It takes a minute: https/);
  });
  it("links to the venue on a map", () => {
    expect(mapsLink(event)).toBe("https://www.google.com/maps/search/?api=1&query=Rose%20Garden%20Lodge%2C%20Magaliesburg");
    expect(mapsLink({ venue: "", address: "" })).toBe("https://www.google.com/maps/search/?api=1&query=");
  });
});

describe("the calendar file", () => {
  const ics = icsFile(event, 5, new Date("2026-11-14T10:00:00Z"));
  it("has the event, where it is and a reminder a day before", () => {
    expect(ics).toContain("BEGIN:VCALENDAR");
    expect(ics).toContain("UID:e1@rsvpme");
    expect(ics).toContain("DTSTAMP:20261114T100000Z");
    expect(ics).toContain("DTSTART:20261205T140000");
    expect(ics).toContain("DTEND:20261205T190000");
    expect(ics).toContain("SUMMARY:Thandi & Sipho's wedding");
    expect(ics).toContain("LOCATION:Rose Garden Lodge\\, Magaliesburg");
    expect(ics).toContain("DESCRIPTION:Dress: smart\\, closed shoes");
    expect(ics).toContain("TRIGGER:-P1D");
    expect(ics.split("\r\n").every((l) => l.length > 0)).toBe(true);
  });
  it("ends the next day when the event runs past midnight", () => {
    expect(icsFile({ ...event, time: 1200 }, 5, new Date("2026-11-14T10:00:00Z"))).toContain("DTEND:20261206T010000");
  });
  it("leaves out the location and description when there are none", () => {
    const bare = icsFile({ ...event, venue: "", address: "", note: "" });
    expect(bare).not.toContain("LOCATION");
    expect(bare).not.toContain("DESCRIPTION:Dress");
  });
});

describe("the spreadsheet", () => {
  it("lists every guest with their answer, and protects against formulas", () => {
    const rows = summarise([guest("g1", "Zanele", 2, "082 555 0123"), guest("g2", "=HYPERLINK(\"x\")", 1)], [reply("g1", { guestId: "g1", name: "Zanele", party: 2, diet: "Nuts, none please", message: 'She said "yes"' })]).rows;
    const csv = guestCsv(rows).split("\r\n");
    expect(csv[0]).toBe("Name,Answer,People coming,Invited for,Food and needs,Message,Phone");
    expect(csv).toContain('Zanele,Coming,2,2,"Nuts, none please","She said ""yes""",082 555 0123');
    expect(csv.some((l) => l.startsWith("\"'=HYPERLINK(\"\"x\"\")\",No reply yet,0,1"))).toBe(true);
  });
});
