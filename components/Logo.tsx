/*
  RSVPme's logo: a burgundy wax seal with two rings linked on it. The edge is uneven, like wax that
  was pressed, with a shine on one side. Always the same colours, in light and dark.
*/
export default function Logo({ className = "h-8 w-8" }: { className?: string }) {
  return (
    <svg viewBox="0 0 64 64" className={className} aria-hidden="true">
      <defs>
        <radialGradient id="wax" cx="35%" cy="30%" r="80%">
          <stop offset="0" stopColor="#a63245" />
          <stop offset="0.6" stopColor="#7a1f2e" />
          <stop offset="1" stopColor="#541320" />
        </radialGradient>
      </defs>
      <path
        d="M32 3c4 0 6 3.5 10 4.5s7.5-.5 10.5 2.5 1.5 7 3 11 6 6 6 10.5-4 6-5 10-.5 8.5-4 11.5-7.5 1.5-11 3.5S36 61 32 61s-6-3.5-10-4.5-8 .5-11-2.5-1.5-7.5-3-11.5S3 38 3 33.500 7 27 8 23s-.5-8 2.500-11 7.500-1.500 11-3.500S28 3 32 3Z"
        fill="url(#wax)"
      />
      <circle cx="32" cy="32" r="21" fill="none" stroke="#3d0c16" strokeOpacity=".35" strokeWidth="1.2" />
      <circle cx="32" cy="32" r="22" fill="none" stroke="#e8a9b3" strokeOpacity=".3" strokeWidth="1" />
      <g fill="none" stroke="#f4d9cf" strokeWidth="2.6">
        <circle cx="26" cy="32" r="9" />
        <circle cx="38" cy="32" r="9" />
      </g>
      <path d="M17 14c6-5 14-6 22-3" fill="none" stroke="#fff" strokeOpacity=".22" strokeWidth="2.5" strokeLinecap="round" />
    </svg>
  );
}
