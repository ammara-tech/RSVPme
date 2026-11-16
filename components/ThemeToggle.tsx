"use client";

import { useEffect, useState } from "react";
import Icon from "@/components/Icon";

/*
  Light/dark switch. The choice is remembered on this device; a small script in
  app/layout.tsx applies it before the page is drawn, so there's no white flash.
*/

export const THEME_KEY = "rsvpme:theme";

export function toggleTheme() {
  const next = document.documentElement.dataset.theme === "dark" ? "light" : "dark";
  document.documentElement.dataset.theme = next;
  try {
    localStorage.setItem(THEME_KEY, next);
  } catch {
    /* it still changes for this visit */
  }
  window.dispatchEvent(new Event("rsvpme:theme"));
}

export default function ThemeToggle({ className = "tool" }: { className?: string }) {
  const [dark, setDark] = useState(false);
  useEffect(() => {
    const read = () => setDark(document.documentElement.dataset.theme === "dark");
    read();
    window.addEventListener("rsvpme:theme", read);
    return () => window.removeEventListener("rsvpme:theme", read);
  }, []);
  const label = dark ? "Switch to light mode" : "Switch to dark mode";
  return (
    <button type="button" onClick={toggleTheme} aria-label={label} title={label} className={className}>
      <Icon name={dark ? "sun" : "moon"} />
    </button>
  );
}
