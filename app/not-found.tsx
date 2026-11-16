import Link from "next/link";

export default function NotFound() {
  return (
    <div className="py-16 text-center">
      <p className="font-serif text-8xl italic text-brand">404</p>
      <h1 className="mt-2 text-4xl">This page isn&apos;t on the guest list</h1>
      <p className="mt-3 text-ink-soft">The address may be mistyped, or the page has moved.</p>
      <Link href="/" className="btn mt-8">
        Back to your events
      </Link>
    </div>
  );
}
