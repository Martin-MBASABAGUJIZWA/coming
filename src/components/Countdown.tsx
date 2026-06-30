"use client";

import { useState, useEffect } from "react";
import { useLanguage } from "@/i18n/LanguageContext";
import type { TranslationKey } from "@/i18n/translations";

const TARGET_DATE = new Date("2026-07-06T00:00:00");

const UNIT_KEYS: { key: "days" | "hours" | "minutes" | "seconds"; label: TranslationKey }[] = [
  { key: "days", label: "days" },
  { key: "hours", label: "hours" },
  { key: "minutes", label: "minutes" },
  { key: "seconds", label: "seconds" },
];

function getTimeLeft() {
  const diff = Math.max(0, TARGET_DATE.getTime() - Date.now());
  return {
    days: Math.floor(diff / (1000 * 60 * 60 * 24)),
    hours: Math.floor((diff / (1000 * 60 * 60)) % 24),
    minutes: Math.floor((diff / (1000 * 60)) % 60),
    seconds: Math.floor((diff / 1000) % 60),
  };
}

function pad(n: number) {
  return String(n).padStart(2, "0");
}

export default function Countdown() {
  const { t } = useLanguage();
  const [time, setTime] = useState({ days: 0, hours: 0, minutes: 0, seconds: 0 });
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
    setTime(getTimeLeft());
    const id = setInterval(() => setTime(getTimeLeft()), 1000);
    return () => clearInterval(id);
  }, []);

  return (
    <div className="countdown">
      {UNIT_KEYS.map(({ key, label }) => (
        <div key={key} className="countdown-item">
          <span className="countdown-number" key={`${key}-${time[key]}`}>
            {mounted ? pad(time[key]) : "--"}
          </span>
          <span className="countdown-label">{t(label)}</span>
        </div>
      ))}
    </div>
  );
}
