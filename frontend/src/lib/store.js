import { useEffect, useState } from "react";

/**
 * Small per-student, per-browser store for the career tools. Keys carry the
 * student's username so two students sharing a lab PC never see each other's data.
 * Storage can be blocked or full, so every access is guarded.
 */
export function useStore(username, name, initial) {
  const key = `erp.career.${username}.${name}`;
  const [value, setValue] = useState(() => {
    try { const raw = localStorage.getItem(key); return raw ? JSON.parse(raw) : initial; } catch { return initial; }
  });
  const [error, setError] = useState(null);
  useEffect(() => {
    try { localStorage.setItem(key, JSON.stringify(value)); setError(null); }
    catch { setError("Your browser couldn't save this (storage is full or blocked)."); }
  }, [key, value]);
  return [value, setValue, error];
}
