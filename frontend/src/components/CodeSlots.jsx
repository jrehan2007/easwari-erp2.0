import React, { useEffect, useRef, useState } from "react";

/**
 * Slot-style one-time/quick code input (same props as the React Bits CodeSlots).
 * One real, invisible <input> receives typing, paste, backspace and autofill; the
 * slots are drawn from its value, so it behaves natively on phones too.
 */
export default function CodeSlots({
  length = 6,
  status = "idle",               // idle | success | error
  onChange,
  onComplete,
  accentColor = "#1B5E3A",
  inkColor = "#1B5E3A",
  slotColor = "#ffffff",
  digitColor = "#10251A",
  dangerColor = "#C8102E",
  slotSize = 46,
  gap = 9,
  radius = 12,
  bounce = 0.2,
  settle = 0.3,
  rise = 8,
  cascade = 20,
  mask = false,
  autoFocus = true,
  disabled = false,
  resetKey = 0,
}) {
  const [value, setValue] = useState("");
  const [focused, setFocused] = useState(false);
  const inputRef = useRef(null);

  // Clear during render, not in an effect: an effect leaves the old code on screen for a
  // frame, and keys typed then are dropped by maxLength before the box empties.
  const [seenKey, setSeenKey] = useState(resetKey);
  if (seenKey !== resetKey) { setSeenKey(resetKey); setValue(""); }
  useEffect(() => { if (autoFocus && !disabled) inputRef.current?.focus(); }, [autoFocus, disabled, resetKey]);
  // After a wrong code, shake, then clear so the user can type again straight away.
  useEffect(() => {
    if (status !== "error") return;
    const id = setTimeout(() => { setValue(""); onChange?.(""); inputRef.current?.focus(); }, 650);
    return () => clearTimeout(id);
  }, [status]);

  function handle(e) {
    const next = e.target.value.replace(/\D/g, "").slice(0, length);
    setValue(next);
    onChange?.(next);
    if (next.length === length) onComplete?.(next);
  }

  const err = status === "error", ok = status === "success";
  const id = `cs${length}`;
  return (
    <div style={{ position: "relative", display: "inline-block" }} onClick={() => inputRef.current?.focus()}>
      <style>{`
        @keyframes ${id}-in { 0% { opacity:0; transform: translateY(${rise}px) scale(.7);} 60% { opacity:1; transform: translateY(-${rise / 4}px) scale(${1 + bounce});} 100% { opacity:1; transform:none;} }
        @keyframes ${id}-shake { 0%,100% { transform:translateX(0);} 20% { transform:translateX(-7px);} 40% { transform:translateX(6px);} 60% { transform:translateX(-4px);} 80% { transform:translateX(3px);} }
        @keyframes ${id}-ok { 0% { transform:scale(1);} 45% { transform:scale(${1 + bounce});} 100% { transform:scale(1);} }
        @media (prefers-reduced-motion: reduce) { .${id}-slot, .${id}-digit { animation: none !important; } }
      `}</style>
      <div style={{ display: "flex", gap, animation: err ? `${id}-shake .45s ease` : "none" }}>
        {Array.from({ length }).map((_, i) => {
          const ch = value[i];
          const active = focused && !disabled && i === Math.min(value.length, length - 1);
          const border = err ? dangerColor : ok ? accentColor : active ? accentColor : "rgba(16,37,26,0.16)";
          return (
            <div key={i} className={`${id}-slot`} style={{
              width: slotSize, height: slotSize * 1.18, borderRadius: radius, background: slotColor,
              border: `1.6px solid ${border}`, display: "flex", alignItems: "center", justifyContent: "center",
              boxShadow: active ? `0 0 0 4px ${accentColor}22` : "0 1px 2px rgba(16,37,26,.06)",
              transition: `border-color ${settle}s ease, box-shadow ${settle}s ease`,
              animation: ok ? `${id}-ok ${settle + 0.25}s ease ${i * cascade}ms both` : "none",
            }}>
              {ch !== undefined && (
                <span key={ch + i} className={`${id}-digit`} style={{
                  fontFamily: "'JetBrains Mono', monospace", fontWeight: 700, fontSize: slotSize * 0.5,
                  color: err ? dangerColor : ok ? inkColor : digitColor,
                  animation: `${id}-in ${settle + 0.1}s cubic-bezier(.2,.9,.3,1.2) both`,
                }}>{mask ? "•" : ch}</span>
              )}
            </div>
          );
        })}
      </div>
      <input ref={inputRef} value={value} onChange={handle} disabled={disabled}
        onFocus={() => setFocused(true)} onBlur={() => setFocused(false)}
        inputMode="numeric" autoComplete="one-time-code" pattern="[0-9]*" maxLength={length}
        aria-label={`Enter your ${length}-digit code`}
        style={{ position: "absolute", inset: 0, width: "100%", height: "100%", opacity: 0,
          cursor: "text", border: "none", background: "transparent", fontSize: 16, minHeight: 0 }} />
    </div>
  );
}
