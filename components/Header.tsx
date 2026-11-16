"use client";

import Link from "next/link";
import Icon from "@/components/Icon";
import { Wordmark } from "@/components/LoginScreen";
import Logo from "@/components/Logo";
import ThemeToggle from "@/components/ThemeToggle";
import { signOutUser } from "@/lib/auth";
import { useApp } from "@/lib/store";

/* The top of the host's pages: the seal and name on the left, and the theme and sign-out on the right */
export default function Header({ demo }: { demo: boolean }) {
  const { pending } = useApp();
  return (
    <header className="no-print mx-auto flex max-w-5xl items-center gap-3 px-4 pt-5">
      <Link href="/" className="flex items-center gap-2.5" aria-label="RSVPme: your events">
        <Logo className="h-11 w-11 shrink-0" />
        <Wordmark className="text-3xl" />
      </Link>
      <div className="ml-auto flex items-center gap-1">
        {pending && (
          <span className="mr-2 text-xs text-ink-soft" role="status">
            Saving…
          </span>
        )}
        <ThemeToggle />
        {!demo && (
          <button type="button" onClick={() => signOutUser()} className="tool px-3 text-sm font-medium" aria-label="Sign out">
            <Icon name="logout" className="h-4 w-4 sm:mr-1.5" />
            <span className="hidden sm:inline">Sign out</span>
          </button>
        )}
      </div>
    </header>
  );
}
