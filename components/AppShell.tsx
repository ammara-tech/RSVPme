"use client";

import { useEffect } from "react";
import { usePathname } from "next/navigation";
import { useAuth, useDemoFlag } from "@/lib/auth";
import { firebaseConfigured } from "@/lib/firebase";
import { connect, disconnect, reportProblem, useApp } from "@/lib/store";
import { seedDemoOnce } from "@/lib/demo";
import DemoBanner from "@/components/DemoBanner";
import Header from "@/components/Header";
import Icon from "@/components/Icon";
import LoginScreen from "@/components/LoginScreen";
import Logo from "@/components/Logo";
import Toasts from "@/components/Toasts";

/*
  Wraps every page.
  - The invitation page (/rsvp) is open to everyone: it shows only what a host has made public,
    and a guest gets an anonymous account when they answer.
  - The host's pages need an account, so until someone signs in they show the sign-in screen.
    An anonymous account only counts here while trying the demo (see lib/auth.ts), so a guest
    who answered on this phone isn't taken for a host.
  The real protection is in firestore.rules.
*/
const PUBLIC = ["/rsvp"];

export default function AppShell({ children }: { children: React.ReactNode }) {
  const path = usePathname();
  if (PUBLIC.some((p) => path.startsWith(p))) return <>{children}</>;
  return <Host>{children}</Host>;
}

function Host({ children }: { children: React.ReactNode }) {
  const auth = useAuth();
  const demoFlag = useDemoFlag();
  const app = useApp();
  const signedIn = auth.status === "signedIn" ? auth.user : null;
  const user = signedIn && (!signedIn.isAnonymous || demoFlag) ? signedIn : null;
  const demo = Boolean(user?.isAnonymous);

  useEffect(() => {
    if (user) connect(user.uid);
    else disconnect();
  }, [user]);

  // "Try the demo": a guest with no events yet gets the example wedding, once (lib/demo.ts)
  useEffect(() => {
    if (demo && user && app.status === "ready" && app.uid === user.uid && app.events.length === 0) seedDemoOnce(user.uid);
  }, [demo, user, app.status, app.uid, app.events.length]);

  if (!firebaseConfigured) return <SetupNeeded />;
  if (!user && auth.status !== "loading") return <LoginScreen />;
  if (!user)
    return (
      <>
        <div className="gate-splash">
          <Splash text="Opening RSVPme…" />
        </div>
        <div className="gate-login">
          <LoginScreen />
        </div>
      </>
    );
  if (app.status === "loading") return <Splash text={demo ? "Setting up the demo wedding…" : "Opening your invitations…"} />;

  return (
    <>
      <a href="#main" className="sr-only focus:not-sr-only focus:fixed focus:left-4 focus:top-4 focus:z-50 focus:rounded focus:bg-card focus:px-4 focus:py-2">
        Skip to the main content
      </a>
      {demo && (
        <div className="no-print">
          <DemoBanner />
        </div>
      )}
      <Header demo={demo} />
      <main id="main" className="mx-auto max-w-5xl px-4 pb-24 pt-6">
        {!app.online && (
          <p className="no-print mb-4 flex items-start gap-2 rounded-md border border-line bg-card px-4 py-3 text-sm">
            <Icon name="cloudOff" className="mt-0.5 h-4 w-4 shrink-0 text-alert" />
            <span>
              <strong>You&apos;re offline.</strong> You can still see your guest list: it&apos;s saved on this device. Changes are sent when you&apos;re back online.
            </span>
          </p>
        )}
        {app.problem && (
          <p role="alert" className="no-print mb-4 flex items-start gap-3 rounded-md border border-alert/40 bg-card px-4 py-3 text-sm">
            <span className="flex-1">{app.problem}</span>
            <button type="button" onClick={() => reportProblem(null)} aria-label="Close" className="text-ink-soft hover:text-ink">
              <Icon name="close" className="h-4 w-4" />
            </button>
          </p>
        )}
        {children}
      </main>
      <Toasts />
    </>
  );
}

function Splash({ text }: { text: string }) {
  return (
    <div className="flex min-h-screen flex-col items-center justify-center gap-4 text-ink-soft">
      <Logo className="h-16 w-16 motion-safe:animate-pulse" />
      <p role="status">{text}</p>
    </div>
  );
}

/* Shown only to a developer who hasn't added the Firebase settings yet */
function SetupNeeded() {
  return (
    <div className="mx-auto max-w-xl px-6 py-20">
      <h1 className="text-5xl">RSVPme needs its Firebase settings</h1>
      <p className="mt-4 text-lg text-ink-soft">
        Add the four <code>NEXT_PUBLIC_FIREBASE_</code> settings (see the README and <code>.env.example</code>), then restart the app or redeploy.
      </p>
    </div>
  );
}
