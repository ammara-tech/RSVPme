"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import EventForm from "@/components/EventForm";
import Icon from "@/components/Icon";
import { createEvent } from "@/lib/actions";

/* Starting an event: its details, then straight to its page to add guests and share the link */
export default function NewEvent() {
  const router = useRouter();
  return (
    <div className="mx-auto max-w-2xl">
      <Link href="/" className="inline-flex items-center gap-1 text-sm font-medium text-ink-soft hover:text-brand">
        <Icon name="left" className="h-4 w-4" /> Your events
      </Link>
      <div className="invite mt-3 p-6 sm:p-9">
        <p className="eyebrow text-center">A new invitation</p>
        <h1 className="mt-1 text-center text-4xl">Tell us about <em>the day</em></h1>
        <p className="mx-auto mt-2 max-w-md text-center text-ink-soft">This is what your guests see when they open the link. You can change any of it later.</p>
        <div className="mt-8">
          <EventForm
            submitLabel="Create the invitation"
            onSave={async (fields) => {
              const id = await createEvent(fields);
              router.push(`/event?id=${id}`);
            }}
          />
        </div>
      </div>
    </div>
  );
}
