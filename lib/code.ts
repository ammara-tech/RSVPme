/*
  Invitation codes: the six characters in an event's invitation link and QR code (…/rsvp?c=K7QX2M).
  They use letters and digits that can't be mistaken for each other when someone types one from a
  poster (no 0 and O, no 1, I and L), and come from the browser's secure random numbers, so they
  can't be guessed from one another.
*/

export const CODE_ALPHABET = "ABCDEFGHJKMNPQRSTUVWXYZ23456789";
export const CODE_LENGTH = 6;

export function newCode(random: (n: number) => Uint8Array = (n) => crypto.getRandomValues(new Uint8Array(n))) {
  const bytes = random(CODE_LENGTH * 2);
  let code = "";
  // Throws away bytes that would make some letters more likely than others
  const limit = 256 - (256 % CODE_ALPHABET.length);
  for (const b of bytes) {
    if (b >= limit) continue;
    code += CODE_ALPHABET[b % CODE_ALPHABET.length];
    if (code.length === CODE_LENGTH) return code;
  }
  return newCode(random); // very rare: not enough usable bytes, so try again
}

/** Reads a code someone typed or scanned: ignores spaces, dashes and lower case */
export function readCode(raw: string | null | undefined) {
  const code = (raw ?? "").toUpperCase().replace(/[\s-]/g, "");
  return code.length === CODE_LENGTH && [...code].every((c) => CODE_ALPHABET.includes(c)) ? code : "";
}


