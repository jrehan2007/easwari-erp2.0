import React, { useState } from "react";
import { theme as t, COLLEGE, FONT_D, FONT_B, FONT_M } from "../lib/theme";

/** The palette for everything below a provider: light by default, black and gold in the Career Hub. */
export const ThemeContext = React.createContext(t);
export const useTheme = () => React.useContext(ThemeContext);

/* ── Global styles: ambient ground, glass surfaces, phone rules ── */
export const GlobalStyle = () => (
  <style>{`
    @import url('https://fonts.googleapis.com/css2?family=Fraunces:opsz,wght@9..144,500;9..144,700;9..144,900&family=Inter:wght@400;500;600;700;800&family=JetBrains+Mono:wght@400;500;700&display=swap');
    * { -webkit-tap-highlight-color: transparent; box-sizing: border-box; }
    html, body { margin:0; overscroll-behavior-y: none; background: ${t.bg}; }
    @keyframes svUp { from {opacity:0;transform:translateY(12px)} to {opacity:1;transform:none} }
    @keyframes svIn { from {opacity:0} to {opacity:1} }
    @keyframes svScale { from {opacity:0;transform:scale(.95)} to {opacity:1;transform:scale(1)} }
    @keyframes svShimmer { 0%{background-position:-420px 0} 100%{background-position:420px 0} }
    @keyframes svDrift { 0%,100%{transform:translate(0,0) scale(1)} 50%{transform:translate(3%,-3%) scale(1.08)} }
    @keyframes svSpin { to { transform: rotate(360deg) } }
    .sv-stagger > * { animation: svUp .48s cubic-bezier(.2,.8,.2,1) both; }
    .sv-stagger > *:nth-child(1){animation-delay:.02s}.sv-stagger > *:nth-child(2){animation-delay:.06s}
    .sv-stagger > *:nth-child(3){animation-delay:.10s}.sv-stagger > *:nth-child(4){animation-delay:.14s}
    .sv-stagger > *:nth-child(5){animation-delay:.18s}.sv-stagger > *:nth-child(6){animation-delay:.22s}
    .sv-fade { animation: svIn .35s ease both; }
    .sv-scale { animation: svScale .2s cubic-bezier(.2,.9,.3,1.15) both; }
    .sv-ambient { position:fixed; inset:0; pointer-events:none; z-index:0; overflow:hidden; }
    .sv-blob { position:absolute; border-radius:50%; filter:blur(74px); opacity:.5; animation:svDrift 22s ease-in-out infinite; }
    .sv-glass {
      backdrop-filter: blur(18px) saturate(150%); -webkit-backdrop-filter: blur(18px) saturate(150%);
      position:relative; transition: transform .26s cubic-bezier(.2,.8,.2,1), box-shadow .26s ease, border-color .26s ease;
    }
    .sv-glass::before { content:''; position:absolute; inset:0; border-radius:inherit; pointer-events:none;
      background:linear-gradient(150deg, rgba(255,255,255,.62) 0%, rgba(255,255,255,.16) 34%, rgba(255,255,255,0) 62%); }
    .sv-glass::after { content:''; position:absolute; left:12%; right:12%; top:0; height:1px; pointer-events:none;
      background:linear-gradient(90deg, transparent, rgba(255,255,255,.95), transparent); }
    .sv-glass > * { position:relative; z-index:1; }
    /* Career Hub (black and gold): a faint gold sheen instead of the white glass highlight. */
    [data-career] .sv-glass::before { background:linear-gradient(150deg, rgba(232,199,102,.075) 0%, rgba(232,199,102,0) 42%); }
    [data-career] .sv-glass::after { background:linear-gradient(90deg, transparent, rgba(232,199,102,.45), transparent); }
    [data-career] .sv-skel { background:linear-gradient(90deg, rgba(212,175,55,.05) 0, rgba(212,175,55,.12) 44px, rgba(212,175,55,.05) 88px);
      background-size:840px 100%; }
    [data-career] ::selection { background: rgba(212,175,55,.35); color: #fff; }
    .sv-lift:hover { transform: translateY(-4px); }
    .sv-btn { transition: transform .12s ease, opacity .12s, background-color .16s, border-color .16s; }
    .sv-btn:active { transform: scale(.96); }
    .sv-btn:disabled { opacity:.5; cursor:not-allowed !important; }
    .sv-skel { background:linear-gradient(90deg, rgba(27,94,58,.05) 0, rgba(27,94,58,.11) 44px, rgba(27,94,58,.05) 88px);
      background-size:840px 100%; animation:svShimmer 1.5s infinite linear; }
    .sv-scroll::-webkit-scrollbar { width:6px; height:6px; }
    .sv-scroll::-webkit-scrollbar-thumb { background:rgba(27,94,58,.22); border-radius:10px; }
    .sv-cell { transition: transform .12s ease, filter .12s ease; }
    .sv-cell:hover { transform: scale(1.3); filter:saturate(1.4) brightness(1.06); z-index:2; }
    button:focus-visible, a:focus-visible, input:focus-visible, select:focus-visible, textarea:focus-visible,
    [role="button"]:focus-visible, [tabindex]:focus-visible {
      outline: 3px solid ${t.primary};
      outline-offset: 2px;
      box-shadow: 0 0 0 5px rgba(27, 94, 58, 0.18);
      border-radius: 8px;
    }
    table { border-collapse: collapse; }
    @media (prefers-reduced-motion: reduce) {
      *,*::before,*::after { animation-duration:.001ms !important; transition-duration:.001ms !important; }
    }
    @media (max-width: 900px) {
      .sv-desktop-only { display:none !important; }
      .sv-grid-2, .sv-grid-3 { grid-template-columns:1fr !important; }
      .sv-main { padding:14px 13px calc(84px + env(safe-area-inset-bottom)) !important; }
      .sv-glass { backdrop-filter: blur(14px) saturate(140%); -webkit-backdrop-filter: blur(14px) saturate(140%); }
      .sv-lift:hover { transform:none; }
      .sv-btn, button, [role="button"], input, select, textarea {
        min-height: 44px;
      }
    }
    @media (min-width: 901px) { .sv-mobile-only { display:none !important; } }
  `}</style>
);

export const Ambient = () => (
  <div className="sv-ambient" aria-hidden="true">
    <div className="sv-blob" style={{ width: 460, height: 460, top: -140, left: -100, background: "rgba(27,94,58,0.20)" }} />
    <div className="sv-blob" style={{ width: 400, height: 400, top: "34%", right: -130, background: "rgba(233,184,36,0.22)", animationDelay: "-7s" }} />
    <div className="sv-blob" style={{ width: 340, height: 340, bottom: -110, left: "26%", background: "rgba(200,16,46,0.10)", animationDelay: "-13s" }} />
  </div>
);

/* ── The crest. Falls back to a drawn mark if the PNG is missing. ── */
export function CollegeMark({ size = 34, showText = true, compact = false, inverted = false }) {
  const [failed, setFailed] = useState(false);
  const textColor = inverted ? "#FFFFFF" : t.text;
  const dimColor = inverted ? "rgba(255,255,255,0.68)" : t.textFaint;

  return (
    <div style={{ display: "flex", alignItems: "center", gap: 11, minWidth: 0 }}>
      <div style={{
        width: size + 8, height: size + 8, borderRadius: 10, flexShrink: 0,
        display: "flex", alignItems: "center", justifyContent: "center",
        background: inverted ? "rgba(255,255,255,0.92)" : t.goldSoft,
        border: `1px solid ${inverted ? "rgba(255,255,255,0.5)" : t.borderGold}`,
      }}>
        {COLLEGE.logoUrl && !failed
          ? <img src={COLLEGE.logoUrl} alt={`${COLLEGE.name} crest`} onError={() => setFailed(true)}
                 style={{ width: size, height: size, objectFit: "contain" }} />
          : <Crest size={size} />}
      </div>
      {showText && (
        <div style={{ minWidth: 0 }}>
          <div style={{
            fontFamily: FONT_D, fontWeight: 700, color: textColor,
            fontSize: compact ? 14 : 15.5, lineHeight: 1.15, letterSpacing: "-0.01em",
            whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis",
          }}>{compact ? "Easwari Engineering" : COLLEGE.name}</div>
          <div style={{
            fontFamily: FONT_M, fontSize: 8.5, color: dimColor, letterSpacing: "0.14em",
            textTransform: "uppercase", marginTop: 2, whiteSpace: "nowrap",
          }}>{COLLEGE.group}</div>
        </div>
      )}
    </div>
  );
}

const CREST_GREEN = "#1B7A4B", CREST_GOLD = "#F2C230", CREST_RED = "#C8102E";

export function Crest({ size = 34 }) {
  return (
    <svg width={size} height={size} viewBox="0 0 100 100" aria-hidden="true">
      <circle cx="50" cy="17" r="3.4" fill={CREST_GOLD} />
      <path d="M43 27 Q50 19 57 27" fill="none" stroke={CREST_GREEN} strokeWidth="2.6" strokeLinecap="round" />
      <path d="M27 31 H73 V60 Q73 76 50 86 Q27 76 27 60 Z" fill={CREST_GREEN} stroke={CREST_RED} strokeWidth="2.2" strokeLinejoin="round" />
      <path d="M34 38 H66 V41 H34 Z" fill={CREST_GOLD} />
      <path d="M34 38 V70 H37 V38 Z M63 38 V70 H66 V38 Z" fill={CREST_GOLD} />
      <path d="M49 41 V70 H51 V41 Z" fill={CREST_GOLD} />
      <rect x="39.5" y="45" width="7" height="7" fill={CREST_RED} />
      <rect x="41.5" y="55" width="6" height="6" fill="#FFFFFF" />
      <rect x="53" y="47" width="6.5" height="6.5" fill="#FFFFFF" />
      <rect x="38" y="70" width="24" height="9" rx="1.5" fill={CREST_GOLD} />
      <text x="50" y="77" fontSize="7.2" fontWeight="800" fill={CREST_RED} textAnchor="middle" fontFamily="Inter, sans-serif">SRM</text>
    </svg>
  );
}

export function SealWatermark({ size = 200, style = {} }) {
  const t = useTheme();
  return (
  <div aria-hidden="true" style={{ position: "absolute", pointerEvents: "none", opacity: 0.5, ...style }}>
    <svg width={size} height={size} viewBox="0 0 100 100">
      <path d="M27 31 H73 V60 Q73 76 50 86 Q27 76 27 60 Z" fill={t.seal} />
      <path d="M34 38 H66 V41 H34 Z M34 38 V70 H37 V38 Z M63 38 V70 H66 V38 Z" fill={t.seal} />
    </svg>
  </div>
  );
}

export function Card({ children, style = {}, className = "", onClick, lift = true }) {
  const t = useTheme();
  const [hover, setHover] = useState(false);
  return (
    <div onClick={onClick} onMouseEnter={() => setHover(true)} onMouseLeave={() => setHover(false)}
      className={`sv-glass ${lift ? "sv-lift" : ""} ${className}`}
      style={{
        background: t.card, border: `1px solid ${hover ? t.glassBorder : t.border}`,
        borderRadius: 16, cursor: onClick ? "pointer" : "default",
        boxShadow: hover && lift ? t.shadowLg : t.shadowMd, overflow: "hidden", ...style,
      }}>{children}</div>
  );
}

export function Badge({ tone = "primary", children, style = {} }) {
  const t = useTheme();
  const c = { primary: t.primary, gold: t.gold, success: t.success, warning: t.warning, danger: t.danger }[tone];
  const bg = { primary: t.primarySoft, gold: t.goldSoft, success: t.successSoft, warning: t.warningSoft, danger: t.dangerSoft }[tone];
  return (
    <span style={{
      display: "inline-flex", alignItems: "center", gap: 5, padding: "3px 9px", borderRadius: 6,
      fontSize: 10.5, fontWeight: 700, color: c, background: bg, border: `1px solid ${c}33`,
      whiteSpace: "nowrap", ...style,
    }}>{children}</span>
  );
}

export function Button({ children, onClick, variant = "primary", size = "md", icon: Icon, disabled, full, type = "button" }) {
  const t = useTheme();
  const styles = {
    primary: { background: t.primary, color: t.onPrimary, border: `1px solid ${t.primary}` },
    gold: { background: t.gold, color: t.onPrimary, border: `1px solid ${t.gold}` },
    ghost: { background: "transparent", color: t.textDim, border: `1px solid ${t.border}` },
    soft: { background: t.primarySoft, color: t.primary, border: `1px solid ${t.primary}33` },
    danger: { background: t.dangerSoft, color: t.danger, border: `1px solid ${t.danger}44` },
  }[variant];
  return (
    <button type={type} onClick={onClick} disabled={disabled} className="sv-btn" style={{
      display: "inline-flex", alignItems: "center", justifyContent: "center", gap: 6,
      padding: size === "sm" ? "6px 11px" : "10px 16px", minHeight: size === "sm" ? 32 : 42,
      borderRadius: 9, fontSize: size === "sm" ? 11.5 : 12.5, fontWeight: 700,
      cursor: "pointer", fontFamily: FONT_B, width: full ? "100%" : undefined, ...styles,
    }}>{Icon && <Icon size={size === "sm" ? 12 : 15} />}{children}</button>
  );
}

export function SectionHead({ title, sub, icon: Icon, right }) {
  const t = useTheme();
  return (
    <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", gap: 12, marginBottom: 16, flexWrap: "wrap" }}>
      <div style={{ display: "flex", alignItems: "flex-start", gap: 11, minWidth: 0 }}>
        {Icon && (
          <div style={{
            width: 32, height: 32, borderRadius: 8, background: t.goldSoft, border: `1px solid ${t.borderGold}`,
            display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0, marginTop: 1,
          }}><Icon size={15} color={t.gold} /></div>
        )}
        <div style={{ minWidth: 0 }}>
          <div style={{ fontFamily: FONT_D, fontSize: 17, fontWeight: 700, color: t.text }}>{title}</div>
          {sub && <div style={{ fontSize: 11.5, color: t.textDim, marginTop: 3, lineHeight: 1.45 }}>{sub}</div>}
        </div>
      </div>
      {right}
    </div>
  );
}

export function Progress({ pct, color, height = 6 }) {
  const t = useTheme();
  return (
    <div style={{ height, borderRadius: 999, background: t.border, overflow: "hidden" }}>
      <div style={{ height: "100%", width: `${Math.min(pct || 0, 100)}%`, background: color,
        borderRadius: 999, transition: "width 1s cubic-bezier(.2,.8,.2,1)" }} />
    </div>
  );
}

export function Spinner({ size = 18, color }) {
  const t = useTheme();
  color = color || t.primary;
  return (
    <div style={{
      width: size, height: size, borderRadius: "50%",
      border: `2px solid ${t.border}`, borderTopColor: color,
      animation: "svSpin .8s linear infinite",
    }} />
  );
}

export function Skeleton({ count = 4, height = 116 }) {
  const t = useTheme();
  return (
    <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(200px,1fr))", gap: 13 }}>
      {Array.from({ length: count }).map((_, i) =>
        <div key={i} className="sv-skel" style={{ height, borderRadius: 16, border: `1px solid ${t.border}` }} />)}
    </div>
  );
}

/** Empty states invite an action rather than apologise. */
export function EmptyState({ icon: Icon, title, body, action }) {
  const t = useTheme();
  return (
    <div style={{ textAlign: "center", padding: "40px 20px" }}>
      {Icon && <Icon size={30} color={t.textFaint} style={{ marginBottom: 12 }} />}
      <div style={{ fontFamily: FONT_D, fontSize: 16, fontWeight: 700, color: t.text }}>{title}</div>
      {body && <div style={{ fontSize: 12.5, color: t.textDim, marginTop: 6, maxWidth: 380, marginInline: "auto", lineHeight: 1.5 }}>{body}</div>}
      {action && <div style={{ marginTop: 16 }}>{action}</div>}
    </div>
  );
}

export function ErrorNote({ message, onRetry }) {
  const t = useTheme();
  return (
    <Card lift={false} style={{ padding: 18, borderColor: `${t.danger}44` }}>
      <div style={{ fontSize: 13, fontWeight: 700, color: t.danger }}>That didn't load</div>
      <div style={{ fontSize: 12, color: t.textDim, marginTop: 6, lineHeight: 1.5 }}>{message}</div>
      {onRetry && <div style={{ marginTop: 12 }}><Button size="sm" variant="soft" onClick={onRetry}>Try again</Button></div>}
    </Card>
  );
}

export function Modal({ open, onClose, title, eyebrow, children, footer, width = 480 }) {
  const t = useTheme();
  React.useEffect(() => {
    if (!open) return;
    const onKey = (e) => e.key === "Escape" && onClose();
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open, onClose]);
  if (!open) return null;
  return (
    <div className="sv-fade" onClick={onClose} role="dialog" aria-modal="true" style={{
      position: "fixed", inset: 0, background: t.overlay, backdropFilter: "blur(3px)",
      zIndex: 150, display: "flex", alignItems: "center", justifyContent: "center", padding: 18,
    }}>
      <div className="sv-scale" onClick={(e) => e.stopPropagation()} style={{
        background: t.cardSolid, border: `1px solid ${t.border}`, borderRadius: 16,
        width, maxWidth: "100%", maxHeight: "88vh", display: "flex", flexDirection: "column",
        // clip, not hidden: the watermark overhangs the edge, and a hidden box can still be
        // scrolled sideways by scroll-into-view (find-in-page, assistive tech), shifting the form.
        boxShadow: t.shadowLg, overflow: "clip", position: "relative",
      }}>
        <SealWatermark size={170} style={{ top: -30, right: -30 }} />
        <div style={{ padding: "18px 20px 14px", borderBottom: `1px solid ${t.border}`, position: "relative" }}>
          {eyebrow && <div style={{ fontFamily: FONT_M, fontSize: 9.5, letterSpacing: "0.16em",
            textTransform: "uppercase", color: t.gold, marginBottom: 6 }}>{eyebrow}</div>}
          <div style={{ fontFamily: FONT_D, fontSize: 18, fontWeight: 700, color: t.text }}>{title}</div>
        </div>
        <div className="sv-scroll" style={{ padding: 20, overflowY: "auto", flex: 1 }}>{children}</div>
        {footer && <div style={{ padding: "14px 20px", borderTop: `1px solid ${t.border}`,
          background: t.bgSoft, display: "flex", gap: 9, justifyContent: "flex-end" }}>{footer}</div>}
      </div>
    </div>
  );
}

/** Copies text; falls back to a hidden textarea where the Clipboard API is unavailable (plain-http LAN). */
export async function copyText(text) {
  try { if (navigator.clipboard && window.isSecureContext) { await navigator.clipboard.writeText(text); return true; } } catch { /* fall back */ }
  try {
    const ta = document.createElement("textarea");
    ta.value = text; ta.setAttribute("readonly", ""); ta.style.position = "fixed"; ta.style.opacity = "0";
    document.body.appendChild(ta); ta.select();
    const ok = document.execCommand("copy");
    document.body.removeChild(ta);
    return ok;
  } catch { return false; }
}

export function CopyButton({ text, label = "Copy" }) {
  const t = useTheme();
  const [state, setState] = useState("idle");   // idle | done | failed
  return (
    <button type="button" className="sv-btn" aria-label={`${label}: ${text}`}
      onClick={async () => { setState((await copyText(text)) ? "done" : "failed"); setTimeout(() => setState("idle"), 1800); }}
      style={{ padding: "6px 11px", borderRadius: 7, fontSize: 11.5, fontWeight: 700, cursor: "pointer", minHeight: 34,
        background: state === "done" ? t.successSoft : t.surface, color: state === "failed" ? t.danger : t.primary,
        border: `1px solid ${state === "done" ? t.success : t.border}` }}>
      {state === "done" ? "Copied" : state === "failed" ? "Select and copy" : label}
    </button>
  );
}

/**
 * One-time passwords for newly created accounts. Shown once: the server never
 * stores them in plain text, so closing this is the last chance to copy them.
 */
export function CredentialsModal({ open, onClose, title = "Account created", rows = [] }) {
  const t = useTheme();
  const all = rows.map((r) => `${r.username}\t${r.temporaryPassword}`).join("\n");
  return (
    <Modal open={open} onClose={onClose} eyebrow="Temporary password" title={title} width={520}
      footer={<>
        {rows.length > 1 && <CopyButton text={all} label="Copy all" />}
        <Button onClick={onClose}>I've saved it</Button>
      </>}>
      <div style={{ fontSize: 12.5, color: t.textDim, lineHeight: 1.5, marginBottom: 14 }}>
        Share {rows.length > 1 ? "each password" : "this password"} with the person directly. It is shown only now,
        and they must choose their own at first sign-in.
      </div>
      <div className="sv-scroll" style={{ maxHeight: 340, overflowY: "auto", display: "flex", flexDirection: "column", gap: 8 }}>
        {rows.map((r) => (
          <div key={r.username} style={{ display: "flex", alignItems: "center", gap: 12, padding: "10px 12px",
            borderRadius: 10, border: `1px solid ${t.border}`, background: t.bgSoft }}>
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{ fontSize: 12.5, fontWeight: 600 }}>{r.name || r.username}</div>
              <div style={{ fontFamily: FONT_M, fontSize: 11, color: t.textDim }}>{r.username}</div>
            </div>
            <code data-testid="temp-password" style={{ fontFamily: FONT_M, fontSize: 15, fontWeight: 700, letterSpacing: "0.06em",
              color: t.text, userSelect: "all" }}>{r.temporaryPassword}</code>
            <CopyButton text={r.temporaryPassword} />
          </div>
        ))}
      </div>
    </Modal>
  );
}

export function Field({ label, value, onChange, type = "text", placeholder, hint }) {
  const t = useTheme();
  return (
    <div>
      <label style={{ display: "block", fontSize: 11.5, fontWeight: 600, color: t.textDim, marginBottom: 6 }}>{label}</label>
      <input type={type} value={value} onChange={(e) => onChange(e.target.value)} placeholder={placeholder}
        style={{
          width: "100%", padding: "11px 13px", borderRadius: 9, background: t.surface,
          border: `1px solid ${t.border}`, color: t.text, fontSize: 13.5,
          outline: "2px solid transparent", outlineOffset: 2, fontFamily: FONT_B, minHeight: 44,
        }} />
      {hint && <div style={{ fontSize: 10.5, color: t.textFaint, marginTop: 5 }}>{hint}</div>}
    </div>
  );
}

export function useToasts() {
  const [toasts, setToasts] = useState([]);
  const push = React.useCallback((n) => {
    const id = Date.now() + Math.random();
    setToasts((s) => [...s, { id, ...n }]);
    setTimeout(() => setToasts((s) => s.filter((x) => x.id !== id)), 4600);
  }, []);
  const dismiss = React.useCallback((id) => setToasts((s) => s.filter((x) => x.id !== id)), []);
  return { toasts, push, dismiss };
}

export function ToastStack({ toasts, dismiss }) {
  return (
    <div style={{ position: "fixed", bottom: 20, right: 20, zIndex: 200, display: "flex",
      flexDirection: "column", gap: 9, maxWidth: "calc(100vw - 40px)" }}>
      {toasts.map((n) => {
        const c = { success: t.success, danger: t.danger, warning: t.warning, primary: t.primary }[n.tone] || t.primary;
        return (
          <div key={n.id} className="sv-scale" role="status" style={{
            display: "flex", alignItems: "flex-start", gap: 10, padding: "12px 14px", minWidth: 250,
            background: t.cardSolid, border: `1px solid ${t.border}`, borderLeft: `3px solid ${c}`,
            borderRadius: 10, boxShadow: t.shadowLg,
          }}>
            <div style={{ flex: 1 }}>
              <div style={{ fontSize: 12.5, fontWeight: 700, color: t.text }}>{n.title}</div>
              {n.body && <div style={{ fontSize: 11.5, color: t.textDim, marginTop: 2, lineHeight: 1.4 }}>{n.body}</div>}
            </div>
            <button onClick={() => dismiss(n.id)} aria-label="Dismiss" style={{
              background: "none", border: "none", cursor: "pointer", color: t.textFaint, fontSize: 16, lineHeight: 1 }}>×</button>
          </div>
        );
      })}
    </div>
  );
}
