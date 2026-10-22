import React from "react";
import { FONT_D, FONT_M } from "../lib/theme";

/** Colourful summary tiles for the top of a dashboard. tiles: [{label, value, sub, icon, from, to}] */
export default function KpiTiles({ tiles }) {
  return (
    <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(190px, 1fr))", gap: 14 }}>
      {tiles.map((k) => (
        <div key={k.label} className="sv-lift" style={{ position: "relative", overflow: "hidden", borderRadius: 16,
          padding: "16px 18px", color: "#fff", background: `linear-gradient(135deg, ${k.from}, ${k.to})`,
          boxShadow: `0 10px 26px ${k.to}44`, transition: "transform .25s ease" }}>
          <span style={{ position: "absolute", right: -18, top: -18, width: 90, height: 90, borderRadius: "50%",
            background: "rgba(255,255,255,.16)" }} />
          <span style={{ position: "absolute", right: 14, bottom: 12, opacity: 0.3 }}>
            {k.icon && <k.icon size={34} />}
          </span>
          <div style={{ fontFamily: FONT_M, fontSize: 9.5, letterSpacing: "0.16em", textTransform: "uppercase", opacity: 0.9 }}>{k.label}</div>
          <div style={{ fontFamily: FONT_D, fontSize: 30, fontWeight: 800, lineHeight: 1.1, marginTop: 8 }}>{k.value}</div>
          <div style={{ fontSize: 11.5, opacity: 0.92, marginTop: 4 }}>{k.sub}</div>
        </div>
      ))}
    </div>
  );
}
