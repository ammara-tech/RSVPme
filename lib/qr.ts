import qrcodegen from "@/lib/qrcodegen";

/*
  Turns a link into a QR code, drawn as one SVG path (crisp at any size, on screen and on paper).
  Error correction level M: the code still scans if about 15% of it is scratched or covered,
  which matters on a poster stuck to a shop door.
*/
export function qrPath(text: string, border = 2) {
  const qr = qrcodegen.QrCode.encodeText(text, qrcodegen.QrCode.Ecc.MEDIUM);
  let d = "";
  for (let y = 0; y < qr.size; y++) {
    for (let x = 0; x < qr.size; x++) {
      if (qr.getModule(x, y)) d += `M${x + border} ${y + border}h1v1h-1z`;
    }
  }
  return { size: qr.size + border * 2, d };
}

/** The dark and light squares as rows of "1" and "0" (used by the tests) */
export function qrRows(text: string) {
  const qr = qrcodegen.QrCode.encodeText(text, qrcodegen.QrCode.Ecc.MEDIUM);
  return Array.from({ length: qr.size }, (_, y) => Array.from({ length: qr.size }, (_, x) => (qr.getModule(x, y) ? "1" : "0")).join(""));
}
