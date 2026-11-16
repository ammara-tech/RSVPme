import { createHash } from "node:crypto";
import { describe, expect, it } from "vitest";
import { CODE_ALPHABET, newCode, readCode } from "@/lib/code";
import { inviteLink } from "@/lib/rsvp";
import { qrPath, qrRows } from "@/lib/qr";

describe("invitation codes", () => {
  it("makes six-character codes from letters and digits that can't be confused", () => {
    for (let i = 0; i < 200; i++) {
      const code = newCode();
      expect(code).toMatch(/^[A-Z2-9]{6}$/);
      expect(code).not.toMatch(/[01OIL]/);
    }
  });
  it("throws away random bytes that would make some letters more likely", () => {
    // 248 and up are thrown away (31 letters fit 8 times into 248), so these give "BBBBBB"
    const bytes = new Uint8Array([255, 250, 1, 1, 1, 1, 1, 1, 0, 0, 0, 0]);
    expect(newCode(() => bytes)).toBe("BBBBBB");
    expect(CODE_ALPHABET).toHaveLength(31);
  });
  it("reads a typed code, forgiving spaces, dashes and lower case", () => {
    expect(readCode(" k7q-x2m ")).toBe("K7QX2M");
    expect(readCode("K7QX2")).toBe("");
    expect(readCode("K7QX2O")).toBe(""); // O isn't used
    expect(readCode(null)).toBe("");
  });
  it("builds the invitation link, with a guest's own id when they were invited", () => {
    expect(inviteLink("https://rsvpme.example", "K7QX2M")).toBe("https://rsvpme.example/rsvp?c=K7QX2M");
    expect(inviteLink("https://rsvpme.example", "K7QX2M", "g123")).toBe("https://rsvpme.example/rsvp?c=K7QX2M&g=g123");
  });
});

describe("QR codes", () => {
  const hash = (rows: string[]) => createHash("sha256").update(rows.join("\n")).digest("hex");
  it("matches the library's Python version square for square", () => {
    // The same library has a separate Python version; these are its answers for the same text (any link works as a test)
    const rows = qrRows("https://queueup.vercel.app/join?c=K7QX2M");
    expect(rows).toHaveLength(29);
    expect(hash(rows)).toBe("ee04407a52fa661c59e4e612ba4b16abc05888fe6933fec0239b40f5eb4381a3");
    expect(hash(qrRows("HELLO"))).toBe("6fc3e139fd61c2c18cdc0afc21453dde2a0ec74267e7d234d44e384ccc1a6caa");
  });
  it("draws one square per dark module, inside a quiet border", () => {
    const rows = qrRows("HELLO");
    const dark = rows.join("").split("").filter((c) => c === "1").length;
    const { size, d } = qrPath("HELLO", 2);
    expect(size).toBe(21 + 4);
    expect(d.match(/M/g)).toHaveLength(dark);
    expect(d.startsWith("M2 2h1v1h-1z")).toBe(true); // the top-left finder pattern starts at the border
  });
});
