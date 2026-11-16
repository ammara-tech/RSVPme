"use client";

import { useEffect, useState, type FormEvent } from "react";
import Icon from "@/components/Icon";
import Logo from "@/components/Logo";
import ThemeToggle from "@/components/ThemeToggle";
import { authErrorMessage, errorCode, finishRedirectSignIn, resetPassword, signInDemo, signInEmail, signInGoogle, signUpEmail } from "@/lib/auth";

/*
  The host's sign-in screen: a wedding invitation. On a laptop the invitation and its reply card,
  with a wax seal, sit beside the form. On a phone it's the headline, the form and a small seal.
  Guests never need this screen: they answer on the invitation page, without an account.
*/
export default function LoginScreen() {
  const [mode, setMode] = useState<"signIn" | "create">("signIn");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [show, setShow] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<{ text: string; code: string } | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  // Opened from a "Try the demo" link (…/?demo): the demo box goes to the top
  const [fromDemoLink, setFromDemoLink] = useState(false);
  useEffect(() => {
    setFromDemoLink(new URLSearchParams(window.location.search).has("demo"));
  }, []);

  // If Google sign-in went the full-page way and failed, say why when the page comes back.
  useEffect(() => {
    finishRedirectSignIn().catch((e) => {
      setError({ text: authErrorMessage(e), code: errorCode(e) });
      console.error("Sign-in failed:", errorCode(e) || e);
    });
  }, []);

  async function run(action: () => Promise<unknown>) {
    setBusy(true);
    setError(null);
    setNotice(null);
    try {
      await action();
    } catch (e) {
      setError({ text: authErrorMessage(e), code: errorCode(e) });
      console.error("Sign-in failed:", errorCode(e) || e); // the code, for whoever is fixing it
    } finally {
      setBusy(false);
    }
  }

  function submit(e: FormEvent) {
    e.preventDefault();
    run(() => (mode === "signIn" ? signInEmail(email, password) : signUpEmail(email, password)));
  }

  async function forgot() {
    if (!email.trim()) {
      setError({ text: "Type your email address first, then press \"Forgot your password?\" again.", code: "" });
      return;
    }
    await run(async () => {
      await resetPassword(email);
      setNotice("If there's an account for that email, a reset link is on its way. Check your inbox.");
    });
  }

  const demoBox = (
    <div className="rounded-md border border-dashed border-gold bg-sage-soft p-3.5">
      <p className="font-semibold">Just looking?</p>
      <p className="mt-0.5 text-sm">Host a made-up wedding with replies already coming in. No account needed.</p>
      <button type="button" disabled={busy} onClick={() => run(signInDemo)} className="btn mt-2.5 w-full py-2">
        Try the demo
      </button>
    </div>
  );

  return (
    <div className="garden min-h-screen">
      <div className="mx-auto grid min-h-screen max-w-6xl items-center gap-8 px-4 py-6 lg:grid-cols-[1.15fr_1fr] lg:gap-12 lg:px-8">
        <Intro />

        <main className="w-full">
          <div className="mb-3 flex justify-end">
            <ThemeToggle />
          </div>
          <div className="invite mx-auto w-full max-w-md p-6 sm:px-8 sm:py-7">
            <p className="eyebrow text-center">{mode === "signIn" ? "Welcome back" : "Join us"}</p>
            <h1 className="mt-1 text-center text-4xl">{mode === "signIn" ? <>Sign in to <em>RSVPme</em></> : <>Create your <em>account</em></>}</h1>
                        {fromDemoLink && <div className="mt-5">{demoBox}</div>}

            <button type="button" disabled={busy} onClick={() => run(signInGoogle)} className="btn-quiet mt-5 w-full py-2.5">
              <Icon name="google" />
              Continue with Google
            </button>

            <p className="my-4 flex items-center gap-3 text-sm text-ink-soft before:h-px before:flex-1 before:bg-line after:h-px after:flex-1 after:bg-line">or</p>

            <form onSubmit={submit} className="space-y-3.5">
              <label className="block text-sm font-medium">
                Email
                <input type="email" required autoComplete="email" value={email} onChange={(e) => setEmail(e.target.value)} className="field mt-1 py-2 font-normal" />
              </label>
              <div>
                <label htmlFor="password" className="text-sm font-medium">
                  Password
                </label>
                <div className="relative mt-1">
                  <input
                    id="password"
                    type={show ? "text" : "password"}
                    required
                    minLength={6}
                    autoComplete={mode === "signIn" ? "current-password" : "new-password"}
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    className="field py-2 pr-20"
                  />
                  <button
                    type="button"
                    onClick={() => setShow((s) => !s)}
                    aria-pressed={show}
                    className="absolute inset-y-0 right-2 my-auto h-9 rounded-md px-3 text-sm font-semibold text-ink underline-offset-2 hover:underline"
                  >
                    {show ? "Hide" : "Show"}
                  </button>
                </div>
              </div>
              {error && (
                <div role="alert" className="text-sm font-semibold text-alert">
                  <p>{error.text}</p>
                  {error.code && <p className="mt-1 text-xs font-normal opacity-70">Error code: {error.code}</p>}
                </div>
              )}
              {notice && (
                <p role="status" className="text-sm text-brand">
                  {notice}
                </p>
              )}
              <button type="submit" disabled={busy} className="btn w-full py-2.5">
                {mode === "signIn" ? "Sign in" : "Create account"}
              </button>
            </form>

            {mode === "signIn" && (
              <button type="button" onClick={forgot} className="mt-3 text-sm font-semibold text-brand hover:underline">
                Forgot your password?
              </button>
            )}

            <p className="mt-4 text-ink-soft">
              {mode === "signIn" ? "New to RSVPme? " : "Already have an account? "}
              <button
                type="button"
                onClick={() => {
                  setMode(mode === "signIn" ? "create" : "signIn");
                  setError(null);
                  setNotice(null);
                }}
                className="font-bold text-brand hover:underline"
              >
                {mode === "signIn" ? "Create an account" : "Sign in"}
              </button>
            </p>
            {!fromDemoLink && <div className="mt-4">{demoBox}</div>}
            <p className="mt-4 text-xs text-ink-soft">Guest names and numbers stay private to you and each guest.</p>
          </div>
        </main>
      </div>
    </div>
  );
}

/*
  The headline, and on a laptop a wedding invitation with its reply card and wax seal. The cards are
  decoration (screen readers skip them). The headline isn't the page's heading: "Sign in" is the h1.
*/
function Intro() {
  return (
    <aside className="pt-2">
      <p className="flex items-center gap-2.5">
        <Logo className="h-12 w-12" />
        <Wordmark className="text-4xl" />
      </p>
      <p className="font-serif mt-5 text-5xl leading-[1.02] sm:text-6xl">
        Invitations whose
        <br />
        <em className="text-brand">replies count themselves.</em>
      </p>
      <p className="mt-3 max-w-lg text-lg text-ink-soft">
        Share one link or QR code. Guests say yes, maybe or no on their phone, with who they&apos;re bringing and what they eat. You see the list, the seats left and who still hasn&apos;t answered.
      </p>

      <div aria-hidden="true" className="relative mt-8 hidden h-[22.5rem] max-w-xl select-none lg:block">
        <div className="invite absolute left-0 top-2 w-[19rem] rotate-[-3deg] px-7 pb-6 pt-7 text-center">
          <Sprig className="mx-auto h-10 w-28 text-sage" />
          <p className="eyebrow mt-3">Together with their families</p>
          <p className="font-script mt-2 text-[2.6rem] leading-[1.05] text-brand">Thandi &amp; Sipho</p>
          <p className="mt-2 font-serif text-lg italic text-ink-soft">invite you to celebrate their wedding</p>
          <div className="flourish my-4">
            <span className="block h-1.5 w-1.5 rotate-45 bg-gold" />
          </div>
          <p className="font-serif text-2xl">Saturday 12 December</p>
          <p className="eyebrow mt-1">at three in the afternoon</p>
          <p className="mt-3 font-serif text-lg">Kloof Garden Estate</p>
        </div>

        <div className="invite absolute right-0 top-20 w-[17rem] rotate-[4deg] px-6 pb-14 pt-7">
          <p className="eyebrow text-center">Kindly reply by 2 December</p>
          <ul className="mt-4 space-y-2.5">
            {[
              ["Joyfully accepts", true],
              ["Not sure yet", false],
              ["Regretfully declines", false],
            ].map(([label, on]) => (
              <li key={String(label)} className={`flex items-center gap-3 rounded-md border px-3 py-2 ${on ? "border-brand bg-brand-soft" : "border-line"}`}>
                <span className={`grid h-5 w-5 place-items-center rounded-full border-[1.5px] ${on ? "border-brand bg-brand text-on-brand" : "border-ink-soft"}`}>{on && <Icon name="check" className="h-3 w-3" />}</span>
                <span className="font-medium">{label}</span>
              </li>
            ))}
          </ul>
        </div>

        <Logo className="absolute -bottom-1 right-14 h-[4.5rem] w-[4.5rem] rotate-[-8deg] drop-shadow-[0_10px_10px_rgba(60,15,25,0.35)]" />
      </div>
    </aside>
  );
}

/* The name: RSVP in capitals, "me" in italics, in the invitation's serif */
export function Wordmark({ className = "text-3xl" }: { className?: string }) {
  return (
    <span className={`font-serif font-semibold leading-none tracking-[0.04em] ${className}`}>
      RSVP<em className="font-medium text-brand">me</em>
    </span>
  );
}

/* A sprig of leaves, in the sage of the invitation */
export function Sprig({ className = "" }: { className?: string }) {
  return (
    <svg viewBox="0 0 112 40" className={className} fill="none" aria-hidden="true">
      <path d="M6 22c20 6 40 6 50-2s30-8 50 0" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" />
      <g fill="currentColor">
        <path d="M30 24c-2-7 1-12 7-14 1 7-1 12-7 14Z" opacity=".9" />
        <path d="M44 22c-3 7-9 9-15 7 2-6 8-9 15-7Z" opacity=".7" />
        <path d="M70 21c2-7 7-11 13-11-1 7-5 11-13 11Z" opacity=".9" />
        <path d="M84 22c-3 7-9 9-14 7 2-6 7-9 14-7Z" opacity=".7" />
        <circle cx="56" cy="18" r="2.6" />
      </g>
    </svg>
  );
}
