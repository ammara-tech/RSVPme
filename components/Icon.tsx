/* Small line icons (24 × 24, drawn with the current text colour). Decorative unless a label is given. */
const paths = {
  calendar: "M5 6h14a1 1 0 0 1 1 1v12a1 1 0 0 1-1 1H5a1 1 0 0 1-1-1V7a1 1 0 0 1 1-1Zm-1 4h16M8 3v4m8-4v4",
  inbox: "M4 13h4l1.5 3h5L16 13h4M5 6h14l1 7v5a1 1 0 0 1-1 1H5a1 1 0 0 1-1-1v-5l1-7Z",
  clock: "M12 21a9 9 0 1 0 0-18 9 9 0 0 0 0 18Zm0-13v4.5l3 2",
  download: "M12 4v11m0 0-4-4m4 4 4-4M5 20h14",
  megaphone: "M4 10v4a1 1 0 0 0 1 1h2l5 4V5L7 9H5a1 1 0 0 0-1 1Zm12-2.5a5 5 0 0 1 0 9M18.5 5a8.5 8.5 0 0 1 0 14",
  userPlus: "M15 19v-1a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v1M8.5 11a3.5 3.5 0 1 0 0-7 3.5 3.5 0 0 0 0 7ZM19 8v6m-3-3h6",
  send: "M4 12 20 4l-6 16-3-7-7-1Z",
  warn: "M12 9v4m0 3.5h.01M10.3 4.5 2.8 18a2 2 0 0 0 1.7 3h15a2 2 0 0 0 1.7-3L13.7 4.5a2 2 0 0 0-3.4 0Z",
  left: "m15 6-6 6 6 6",
  plus: "M12 5v14M5 12h14",
  copyWeek: "M17 2l3 3-3 3M4 11V9a4 4 0 0 1 4-4h12M7 22l-3-3 3-3m13-3v2a4 4 0 0 1-4 4H4",
  check: "m5 12.5 4.5 4.5L19 7.5",
  pencil: "M4 20h4L19 9l-4-4L4 16v4Zm9-13 4 4",
  trash: "M5 7h14M10 11v6m4-6v6M6 7l1 13h10l1-13M9 7V4h6v3",
  close: "M6 6l12 12M18 6 6 18",
  sun: "M12 4V2m0 20v-2m8-8h2M2 12h2m13.7-5.7 1.4-1.4M4.9 19.1l1.4-1.4m0-11.4L4.9 4.9m14.2 14.2-1.4-1.4M16 12a4 4 0 1 1-8 0 4 4 0 0 1 8 0Z",
  moon: "M20 14.5A8 8 0 0 1 9.5 4a8 8 0 1 0 10.5 10.5Z",
  people: "M16 19v-1a4 4 0 0 0-4-4H7a4 4 0 0 0-4 4v1m17 0v-1a4 4 0 0 0-3-3.9M13 4.1a4 4 0 0 1 0 7.8M13.5 8a4 4 0 1 1-8 0 4 4 0 0 1 8 0Z",
  link: "M10 14a4 4 0 0 0 5.7 0l3-3a4 4 0 0 0-5.7-5.7l-1 1M14 10a4 4 0 0 0-5.7 0l-3 3a4 4 0 0 0 5.7 5.7l1-1",
  copy: "M8 8V5a1 1 0 0 1 1-1h10a1 1 0 0 1 1 1v10a1 1 0 0 1-1 1h-3M5 8h10a1 1 0 0 1 1 1v10a1 1 0 0 1-1 1H5a1 1 0 0 1-1-1V9a1 1 0 0 1 1-1Z",
  whatsapp: "M4 20l1.3-3.9A8 8 0 1 1 8.2 19L4 20Zm5-11.5c0 3.6 2.9 6.5 6.5 6.5l1-1.6-1.9-1-1 .9a4.6 4.6 0 0 1-2.4-2.4l.9-1-1-1.9L9 8.5Z",
  refresh: "M20 11a8 8 0 1 0-2.3 5.7M20 4v7h-7",
  cloudOff: "M3 3l18 18M8 7.5A6 6 0 0 1 18 9a4.5 4.5 0 0 1 2 8.3M16 18H7a4 4 0 0 1-1.6-7.7",
  cloud: "M7 18a4 4 0 0 1-.6-8A6 6 0 0 1 18 9a4.5 4.5 0 0 1-.5 9H7Z",
  chevron: "m9 6 6 6-6 6",
  down: "m6 9 6 6 6-6",
  logout: "M15 4h3a1 1 0 0 1 1 1v14a1 1 0 0 1-1 1h-3M10 16l4-4-4-4M14 12H4",
  home: "M4 11.5 12 5l8 6.5V20a1 1 0 0 1-1 1h-4v-6h-6v6H5a1 1 0 0 1-1-1v-8.5Z",
  coins: "M9 7c0 1.1 2.2 2 5 2s5-.9 5-2-2.2-2-5-2-5 .9-5 2Zm0 0v3c0 1.1 2.2 2 5 2s5-.9 5-2V7M5 13c0 1.1 2.2 2 5 2s5-.9 5-2m-10 0c0-1.1 2.2-2 5-2m-5 2v3c0 1.1 2.2 2 5 2s5-.9 5-2v-3m4-3v3c0 1.1-2.2 2-5 2",
  book: "M5 4h11a3 3 0 0 1 3 3v13H8a3 3 0 0 1-3-3V4Zm0 13a3 3 0 0 1 3-3h11M9 8h6",
  history: "M4 12a8 8 0 1 0 2.3-5.7L4 8.5M4 4v4.5h4.5M12 8v4l3 2",
  vote: "M4 13h16v7H4v-7Zm4 0V5h8v8M10.5 9l1.5 1.5L15 7.5",
  turns: "M17 2l3 3-3 3M4 11V9a4 4 0 0 1 4-4h12M7 22l-3-3 3-3m13-3v2a4 4 0 0 1-4 4H4",
  print: "M7 9V3h10v6M7 18H5a1 1 0 0 1-1-1v-6a1 1 0 0 1 1-1h14a1 1 0 0 1 1 1v6a1 1 0 0 1-1 1h-2M7 14h10v7H7v-7Z",
  undo: "M9 14 4 9l5-5M4 9h10a6 6 0 0 1 0 12h-3",
  up: "m6 15 6-6 6 6",
  settings: "M12 15a3 3 0 1 0 0-6 3 3 0 0 0 0 6Zm7.4-3a7.4 7.4 0 0 0-.1-1.2l2-1.6-2-3.4-2.4 1a7.6 7.6 0 0 0-2-1.2L14.5 3h-5l-.4 2.6a7.6 7.6 0 0 0-2 1.2l-2.4-1-2 3.4 2 1.6a7.4 7.4 0 0 0 0 2.4l-2 1.6 2 3.4 2.4-1a7.6 7.6 0 0 0 2 1.2l.4 2.6h5l.4-2.6a7.6 7.6 0 0 0 2-1.2l2.4 1 2-3.4-2-1.6c.1-.4.1-.8.1-1.2Z",
  ticket: "M4 7a1 1 0 0 1 1-1h14a1 1 0 0 1 1 1v3a2 2 0 0 0 0 4v3a1 1 0 0 1-1 1H5a1 1 0 0 1-1-1v-3a2 2 0 0 0 0-4V7Zm10-1v12",
  qr: "M4 4h6v6H4V4Zm10 0h6v6h-6V4ZM4 14h6v6H4v-6Zm10 0h2v2h-2v-2Zm4 0h2v2h-2zm-4 4h2v2h-2zm4 0h2v2h-2zM6.5 6.5h1v1h-1zm10 0h1v1h-1zm-10 10h1v1h-1z",
  tv: "M3 5h18v12H3V5Zm5 16h8M12 17v4",
  pause: "M8 5v14M16 5v14",
  play: "M7 5l12 7-12 7V5Z",
  bell: "M6 16V11a6 6 0 1 1 12 0v5l1.5 2h-15L6 16Zm4 4a2 2 0 0 0 4 0",
  chart: "M4 20h16M7 16v-5m5 5V6m5 10v-8",
  next: "M5 12h14m-5-5 5 5-5 5",
  userX: "M15 19v-1a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v1M8.5 11a3.5 3.5 0 1 0 0-7 3.5 3.5 0 0 0 0 7ZM17 8l5 5m0-5-5 5",
  phone: "M5 4h4l2 5-2.5 1.5a11 11 0 0 0 5 5L15 13l5 2v4a2 2 0 0 1-2 2A16 16 0 0 1 3 6a2 2 0 0 1 2-2Z",
  ban: "M12 3a9 9 0 1 0 0 18 9 9 0 0 0 0-18ZM5.6 5.6l12.8 12.8",
  pin: "M12 21s-6.5-5.6-6.5-11a6.500 6.500 0 0 1 13 0c0 5.400-6.500 11-6.500 11Zm0-8.500a2.500 2.500 0 1 0 0-5 2.500 2.500 0 0 0 0 5Z",
  utensils: "M7 3v8m-3-8v5a3 3 0 0 0 6 0V3M7 11v10M17 21V3c-2.500 1.500-3.500 5-3.500 8H17",
  heart: "M12 20s-7.500-4.500-7.500-10.500A4.200 4.200 0 0 1 12 7a4.200 4.200 0 0 1 7.500 2.500C19.500 15.500 12 20 12 20Z",
  mail: "M4 6h16a1 1 0 0 1 1 1v10a1 1 0 0 1-1 1H4a1 1 0 0 1-1-1V7a1 1 0 0 1 1-1Zm-.5.500L12 13l8.500-6.500",
  search: "M11 18a7 7 0 1 0 0-14 7 7 0 0 0 0 14Zm5-2 4.500 4.500",
  calendarPlus: "M5 6h14a1 1 0 0 1 1 1v12a1 1 0 0 1-1 1H5a1 1 0 0 1-1-1V7a1 1 0 0 1 1-1Zm-1 4h16M8 3v4m8-4v4m-4 5v5m-2.500-2.500h5",
  eye: "M2 12s3.500-7 10-7 10 7 10 7-3.500 7-10 7S2 12 2 12Zm10 3a3 3 0 1 0 0-6 3 3 0 0 0 0 6Z",
  google: "",
} as const;

export type IconName = keyof typeof paths;

export default function Icon({ name, className = "h-5 w-5", label }: { name: IconName; className?: string; label?: string }) {
  if (name === "google") {
    return (
      <svg viewBox="0 0 24 24" className={className} role={label ? "img" : undefined} aria-label={label} aria-hidden={label ? undefined : true}>
        <path fill="#4285F4" d="M23.5 12.3c0-.8-.1-1.6-.2-2.3H12v4.4h6.5a5.6 5.6 0 0 1-2.4 3.6v3h3.9c2.2-2.1 3.5-5.1 3.5-8.7Z" />
        <path fill="#34A853" d="M12 24c3.2 0 6-1.1 8-2.9l-3.9-3c-1.1.7-2.5 1.2-4.1 1.2-3.1 0-5.8-2.1-6.7-5H1.3v3.1A12 12 0 0 0 12 24Z" />
        <path fill="#FBBC05" d="M5.3 14.3a7.2 7.2 0 0 1 0-4.6V6.6H1.3a12 12 0 0 0 0 10.8l4-3.1Z" />
        <path fill="#EA4335" d="M12 4.8c1.8 0 3.3.6 4.6 1.8l3.4-3.4A12 12 0 0 0 1.3 6.6l4 3.1c.9-2.8 3.6-4.9 6.7-4.9Z" />
      </svg>
    );
  }
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.9"
      strokeLinecap="round"
      strokeLinejoin="round"
      className={className}
      role={label ? "img" : undefined}
      aria-label={label}
      aria-hidden={label ? undefined : true}
    >
      <path d={paths[name]} />
    </svg>
  );
}
