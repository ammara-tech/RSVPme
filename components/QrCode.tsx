"use client";

import { useMemo } from "react";
import { qrPath } from "@/lib/qr";

/*
  A QR code for a link, drawn as SVG (sharp on screen and on paper). Always dark on white, because
  that's what phone cameras read best, even in dark mode. The link is also given as its label,
  for screen readers.
*/
export default function QrCode({ text, className = "h-40 w-40", label }: { text: string; className?: string; label?: string }) {
  const { size, d } = useMemo(() => qrPath(text), [text]);
  return (
    <svg viewBox={`0 0 ${size} ${size}`} className={`rounded-lg bg-white ${className}`} role="img" aria-label={label ?? `QR code for ${text}`} shapeRendering="crispEdges">
      <path d={d} fill="#17130f" />
    </svg>
  );
}
