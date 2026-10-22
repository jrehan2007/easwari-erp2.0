import React, { useEffect, useState } from "react";
import { Menu, Bell, LogOut, ChevronRight, ChevronLeft, ChevronDown } from "lucide-react";
import { theme as t, COLLEGE, FONT_D, FONT_B, FONT_M } from "../lib/theme";
import { CollegeMark } from "../components/Shared";
import LiquidEther from "../components/LiquidEther";

/**
 * Chrome shared by all three portals: crest-bearing sidebar, sticky header,
 * and a thumb-reachable bottom bar on phones.
 */
export default function Shell({ nav, active, setActive, session, onSignOut, children, subtitle }) {
  const [mobileOpen, setMobileOpen] = useState(false);
  const [collapsed, setCollapsed] = useState(false);

  const current = nav.find((n) => n.key === active);
  const [boxOpen, setBoxOpen] = useState(false);

  // Pages marked mono (the Career Hub) show the whole portal in black and white.
  // The filter goes on <html>: there it doesn't trap fixed modals and toasts.
  const mono = !!current?.mono;
  useEffect(() => {
    const root = document.documentElement;
    root.style.transition = "filter .45s ease";
    root.style.filter = mono ? "grayscale(1)" : "";
    return () => { root.style.filter = ""; };
  }, [mono]);
  const groups = nav.reduce((acc, n) => {
    (acc[n.group || "Menu"] = acc[n.group || "Menu"] || []).push(n);
    return acc;
  }, {});
  const bottomItems = [...nav.slice(0, 4), { key: "__more", label: "More", icon: Menu }];

  const sidebar = (isMobile) => (
    <aside className="sv-glass" style={{
      width: collapsed && !isMobile ? 74 : 240, minWidth: collapsed && !isMobile ? 74 : 240,
      background: t.sidebar, borderRight: `1px solid ${t.border}`,
      display: "flex", flexDirection: "column", padding: "16px 11px",
      paddingTop: "calc(16px + env(safe-area-inset-top))",
      position: isMobile ? "fixed" : "sticky", top: 0,
      left: isMobile ? (mobileOpen ? 0 : -300) : undefined,
      height: "100vh", zIndex: 100, boxShadow: isMobile ? t.shadowLg : "none",
      transition: "left .26s cubic-bezier(.2,.8,.2,1), width .22s ease",
    }}>
      <div style={{ padding: "4px 4px 16px", borderBottom: `1px solid ${t.border}`, marginBottom: 14 }}>
        {collapsed && !isMobile
          ? <div style={{ display: "flex", justifyContent: "center" }}><CollegeMark size={30} showText={false} /></div>
          : <CollegeMark size={38} compact />}
      </div>

      <nav className="sv-scroll" style={{ display: "flex", flexDirection: "column", flex: 1, overflowY: "auto" }}>
        {Object.entries(groups).map(([group, items]) => {
          const boxed = items[0].box;
          const inGroup = items.some((i) => i.key === active);
          const showItems = !boxed || inGroup || boxOpen || (collapsed && !isMobile);
          const BoxIcon = items[0].icon;
          const groupStyle = boxed
            ? { marginBottom: 10, borderRadius: 12, padding: 4, border: `1.5px solid ${inGroup ? "#111" : t.border}`,
                background: inGroup ? "rgba(0,0,0,0.04)" : "rgba(255,255,255,0.55)" }
            : { marginBottom: 10 };
          return (
          <div key={group} style={groupStyle}>
            {boxed && !(collapsed && !isMobile) ? (
              <div role="button" tabIndex={0} aria-expanded={showItems}
                onClick={() => { if (inGroup) { setBoxOpen(!boxOpen); } else { setBoxOpen(true); setActive(items[0].key); setMobileOpen(false); } }}
                onKeyDown={(e) => e.key === "Enter" && (setBoxOpen(true), setActive(items[0].key))}
                style={{ display: "flex", alignItems: "center", gap: 9, padding: "9px 9px", borderRadius: 9, cursor: "pointer",
                  background: inGroup ? "#111" : "transparent", color: inGroup ? "#fff" : "#000" }}>
                <BoxIcon size={16} style={{ flexShrink: 0 }} />
                <span style={{ fontSize: 12.5, fontWeight: 800, flex: 1, letterSpacing: "0.01em" }}>{group}</span>
                <span style={{ fontFamily: FONT_M, fontSize: 8.5, letterSpacing: "0.12em", opacity: 0.75 }}>B&amp;W</span>
                <ChevronDown size={14} style={{ transform: showItems ? "rotate(180deg)" : "none", transition: "transform .2s ease" }} />
              </div>
            ) : !(collapsed && !isMobile) && (
              <div style={{ fontFamily: FONT_M, fontSize: 8.5, letterSpacing: "0.16em",
                textTransform: "uppercase", color: "#000000", padding: "6px 11px 5px" }}>{group}</div>
            )}
            {showItems && (boxed && !(collapsed && !isMobile) ? items.slice(1) : items).map((item) => {
              const on = active === item.key;
              return (
                <div key={item.key} role="button" tabIndex={0} aria-label={item.label}
                  onClick={() => { setActive(item.key); setMobileOpen(false); }}
                  onKeyDown={(e) => e.key === "Enter" && (setActive(item.key), setMobileOpen(false))}
                  title={collapsed && !isMobile ? item.label : undefined}
                  style={{
                    display: "flex", alignItems: "center", gap: 11, position: "relative",
                    padding: (collapsed && !isMobile) ? "10px 0" : isMobile ? "12px 11px" : "9px 11px",
                    justifyContent: (collapsed && !isMobile) ? "center" : "flex-start",
                    borderRadius: 8, cursor: "pointer", marginBottom: 1,
                    color: "#000000", background: on ? t.primarySoft : "transparent",
                    transition: "background-color .16s ease",
                  }}>
                  {on && !(collapsed && !isMobile) && (
                    <span style={{ position: "absolute", left: 0, top: "50%", transform: "translateY(-50%)",
                      width: 3, height: 18, background: t.gold, borderRadius: "0 3px 3px 0" }} />
                  )}
                  <item.icon size={16} color={on ? t.gold : "#000000"} style={{ flexShrink: 0 }} />
                  {!(collapsed && !isMobile) && (
                    <span style={{ fontSize: 12.5, fontWeight: on ? 700 : 500, whiteSpace: "nowrap",
                      overflow: "hidden", textOverflow: "ellipsis", color: "#000000" }}>{item.label}</span>
                  )}
                </div>
              );
            })}
          </div>
          );
        })}
      </nav>

      {!(collapsed && !isMobile) && (
        <button onClick={onSignOut} className="sv-btn" style={{
          display: "flex", alignItems: "center", gap: 9, padding: "10px 11px", borderRadius: 9,
          background: "transparent", border: `1px solid ${t.border}`, color: "#000000",
          cursor: "pointer", fontSize: 12, fontWeight: 600, marginTop: 8, minHeight: 42,
        }}><LogOut size={15} /> Sign out</button>
      )}

      {!isMobile && (
        <button onClick={() => setCollapsed(!collapsed)} className="sv-btn" aria-label="Toggle sidebar"
          style={{ marginTop: 10, alignSelf: collapsed ? "center" : "flex-end", background: "#fff",
            border: `1px solid ${t.border}`, borderRadius: 7, width: 26, height: 26,
            display: "flex", alignItems: "center", justifyContent: "center", color: "#000000", cursor: "pointer" }}>
          {collapsed ? <ChevronRight size={13} /> : <ChevronLeft size={13} />}
        </button>
      )}
    </aside>
  );

  return (
    <div style={{ fontFamily: FONT_B, minHeight: "100vh", display: "flex",
      color: "#000000", position: "relative",
      background: "linear-gradient(160deg,#f6f8f5 0%,#eef3ee 55%,#f4f2e6 100%)" }}>
      {/* Plain, professional ground with a soft live flow behind everything */}
      <div aria-hidden="true" style={{ position: "fixed", inset: 0, zIndex: 0, pointerEvents: "none", opacity: 0.55 }}>
        <LiquidEther lightMode colors={["#1B5E3A", "#3fa86b", "#d9b43c"]} intensity={0.8} mouseForce={14}
          cursorSize={120} persistence={0.8} autoDemo autoSpeed={0.35} autoIntensity={1.6} intro={false} />
      </div>

      <div className="sv-desktop-only" style={{ position: "relative", zIndex: 1 }}>{sidebar(false)}</div>
      <div className="sv-mobile-only">
        {mobileOpen && <div onClick={() => setMobileOpen(false)} className="sv-fade"
          style={{ position: "fixed", inset: 0, background: t.overlay, zIndex: 90 }} />}
        {sidebar(true)}
      </div>

      <div style={{ flex: 1, minWidth: 0, display: "flex", flexDirection: "column", position: "relative", zIndex: 1 }}>
        <header className="sv-glass" style={{
          display: "flex", alignItems: "center", gap: 11, padding: "11px 16px",
          paddingTop: "calc(11px + env(safe-area-inset-top))",
          borderBottom: `1px solid ${t.border}`, background: "rgba(255,255,255,0.66)",
          position: "sticky", top: 0, zIndex: 80, boxShadow: t.shadowSm,
        }}>
          <button onClick={() => setMobileOpen(true)} className="sv-btn sv-mobile-only" aria-label="Open menu"
            style={{ background: "rgba(255,255,255,0.6)", border: `1px solid ${t.border}`, borderRadius: 9,
              width: 40, height: 40, display: "flex", alignItems: "center", justifyContent: "center",
              color: "#000000", cursor: "pointer", flexShrink: 0 }}>
            <Menu size={17} />
          </button>

          {/* The crest stays in the header on every page, phone included */}
          <div className="sv-mobile-only" style={{ minWidth: 0, flex: 1 }}>
            <CollegeMark size={28} compact />
          </div>

          <div className="sv-desktop-only" style={{ minWidth: 0, flex: 1 }}>
            <div style={{ fontFamily: FONT_M, fontSize: 9.5, letterSpacing: "0.15em",
              textTransform: "uppercase", color: "#000000" }}>{subtitle}</div>
            <div style={{ fontSize: 12.5, color: "#000000", marginTop: 2 }}>
              {new Date().toLocaleDateString("en-IN", { weekday: "long", day: "numeric", month: "long", year: "numeric" })}
            </div>
          </div>

          <div style={{ display: "flex", alignItems: "center", gap: 9, padding: "4px 10px 4px 4px",
            borderRadius: 10, background: "rgba(255,255,255,0.55)", border: `1px solid ${t.border}`,
            flexShrink: 0, minHeight: 40 }}>
            <div style={{ width: 32, height: 32, borderRadius: 8,
              background: `linear-gradient(140deg, ${t.primary}, ${t.gold})`, display: "flex",
              alignItems: "center", justifyContent: "center", color: "#fff", fontSize: 11.5, fontWeight: 800 }}>
              {(session.displayName || session.username).split(" ").map((n) => n[0]).join("").slice(0, 2)}
            </div>
            <div className="sv-desktop-only" style={{ textAlign: "left" }}>
              <div style={{ fontSize: 11.5, fontWeight: 700, color: "#000000", lineHeight: 1.2 }}>
                {session.displayName || session.username}
              </div>
              <div style={{ fontFamily: FONT_M, fontSize: 9, color: "#000000" }}>{session.username}</div>
            </div>
          </div>
        </header>

        <main className="sv-scroll sv-main" style={{ padding: "20px 22px 60px", flex: 1 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 7, marginBottom: 15, flexWrap: "wrap" }}>
            <span style={{ fontFamily: FONT_M, fontSize: 10, letterSpacing: "0.12em",
              textTransform: "uppercase", color: "#000000" }}>{current?.group}</span>
            <ChevronRight size={11} color="#000000" />
            <span style={{ fontFamily: FONT_M, fontSize: 10, letterSpacing: "0.12em",
              textTransform: "uppercase", color: t.gold, fontWeight: 700 }}>{current?.label}</span>
          </div>

          <div key={active} className="sv-fade">{children}</div>

          <footer style={{ marginTop: 36, paddingTop: 20, borderTop: `1px solid ${t.border}`,
            display: "flex", alignItems: "center", justifyContent: "space-between", gap: 16, flexWrap: "wrap" }}>
            <CollegeMark size={30} compact />
            <div style={{ fontSize: 10.5, color: "#000000", lineHeight: 1.6 }}>
              {COLLEGE.affiliation}<br />{COLLEGE.location} · {COLLEGE.motto}
            </div>
          </footer>
        </main>
      </div>

      <nav className="sv-mobile-only sv-glass" style={{
        position: "fixed", left: 0, right: 0, bottom: 0, zIndex: 85, display: "flex",
        background: "rgba(255,255,255,0.82)", borderTop: `1px solid ${t.border}`,
        boxShadow: "0 -4px 20px rgba(16,37,26,0.08)", paddingBottom: "env(safe-area-inset-bottom)",
      }}>
        {bottomItems.map((item) => {
          const on = active === item.key;
          return (
            <button key={item.key} className="sv-btn"
              onClick={() => item.key === "__more" ? setMobileOpen(true) : setActive(item.key)}
              style={{ flex: 1, minHeight: 58, display: "flex", flexDirection: "column",
                alignItems: "center", justifyContent: "center", gap: 4, position: "relative",
                background: "transparent", border: "none", cursor: "pointer",
                color: on ? t.primary : "#000000", padding: "6px 2px" }}>
              {on && <span style={{ position: "absolute", top: 0, width: 26, height: 2.5,
                background: t.gold, borderRadius: "0 0 3px 3px" }} />}
              <item.icon size={19} strokeWidth={on ? 2.4 : 1.9} />
              <span style={{ fontSize: 9.5, fontWeight: on ? 700 : 500 }}>{item.label.split(" ")[0]}</span>
            </button>
          );
        })}
      </nav>
    </div>
  );
}
