import { useEffect, useState } from 'react';
import type { Grade } from './games/types';

export type Settings = { grade: Grade; teams: boolean; sound: boolean };
export type SettingsApi = Settings & { update: (p: Partial<Settings>) => void };

const KEY = 'qs_settings';
const DEFAULTS: Settings = { grade: 1, teams: false, sound: true };

function load(): Settings {
  try {
    const raw = localStorage.getItem(KEY);
    if (!raw) return DEFAULTS;
    const s = { ...DEFAULTS, ...JSON.parse(raw) } as Settings;
    if (![1, 2, 3, 4].includes(s.grade)) s.grade = 1;
    return s;
  } catch {
    return DEFAULTS;
  }
}

/** Sinf, jamoa tartibi va ovoz sozlamalari (brauzerda eslab qolinadi) */
export function useSettings(): SettingsApi {
  const [s, setS] = useState<Settings>(load);
  useEffect(() => {
    try { localStorage.setItem(KEY, JSON.stringify(s)); } catch { /* ignore */ }
  }, [s]);
  return { ...s, update: (p) => setS((prev) => ({ ...prev, ...p })) };
}
