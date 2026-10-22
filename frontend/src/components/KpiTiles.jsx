import React from "react";
import { ChevronRight } from "lucide-react";
import { FONT_B } from "../lib/theme";
import { useTheme } from "./Shared";

/**
 * Summary figures for the top of a dashboard. Plain cards; colour is used only
 * when the number itself is a warning (tone "danger" / "warning").
 * tiles: [{ label, value, sub, icon, tone?, onClick? }]
 */
export default function KpiTiles({ tiles }) {
  const t = useTheme();
  const toneColor = { danger: t.danger, warning: t.warning, success: t.success };
  return (
    <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))", gap: 12 }}>
      {tiles.map((k) => {
        const Tag = k.onClick ? "button" : "div";
        return (
          <Tag key={k.label} onClick={k.onClick} className={k.onClick ? "sv-btn" : undefined}
            style={{ textAlign: "left", padding: "16px 18px", borderRadius: 12, background: t.card, color: t.text,
              border: `1px solid ${t.border}`, boxShadow: t.shadowMd, cursor: k.onClick ? "pointer" : "default",
              fontFamily: FONT_B, display: "flex", flexDirection: "column", minHeight: 112 }}>
            <div style={{ display: "flex", alignItems: "center", gap: 7, fontSize: 12.5, color: t.textDim, fontWeight: 500 }}>
              {k.icon && <k.icon size={15} color={t.textFaint} />}
              <span style={{ flex: 1 }}>{k.label}</span>
              {k.onClick && <ChevronRight size={15} color={t.textFaint} />}
            </div>
            <div style={{ fontSize: 28, fontWeight: 700, letterSpacing: "-0.02em", lineHeight: 1.15, marginTop: 10,
              color: toneColor[k.tone] || t.text, fontVariantNumeric: "tabular-nums" }}>{k.value}</div>
            {k.sub && <div style={{ fontSize: 12, color: k.tone === "danger" ? t.danger : t.textDim, marginTop: 4 }}>{k.sub}</div>}
          </Tag>
        );
      })}
    </div>
  );
}
