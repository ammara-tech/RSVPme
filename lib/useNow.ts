"use client";

import { useEffect, useState } from "react";

/** The time now, updated every 30 seconds, so "waiting 12 min" keeps counting by itself */
export function useNow(every = 30000) {
  const [now, setNow] = useState(() => Date.now());
  useEffect(() => {
    const id = setInterval(() => setNow(Date.now()), every);
    return () => clearInterval(id);
  }, [every]);
  return now;
}
