import React, { useEffect, useMemo, useState } from "react";
import { Wallet, Receipt, CheckCircle2, AlertTriangle, CreditCard, Smartphone, Landmark, Bus, Home, BookOpen, GraduationCap, FileText, Users, Printer } from "lucide-react";
import { theme as t, FONT_D, FONT_M, COLLEGE } from "../lib/theme";
import { Card, Badge, Button, SectionHead, Skeleton, ErrorNote, Modal, Spinner } from "../components/Shared";
import { api } from "../lib/api";
import KpiTiles from "../components/KpiTiles";

const inr = (n) => "₹" + Number(n).toLocaleString("en-IN");
const ICON = { TUITION: GraduationCap, DEVELOPMENT: Landmark, TRANSPORT: Bus, HOSTEL: Home, MESS: Home, EXAM: FileText,
  LIBRARY: BookOpen, TRAINING: Users, ASSOCIATION: Users };
const LABEL = { TUITION: "Tuition", DEVELOPMENT: "Development", TRANSPORT: "Bus / transport", HOSTEL: "Hostel", MESS: "Mess",
  EXAM: "Examination", LIBRARY: "Library & lab", TRAINING: "Training", ASSOCIATION: "Association" };
const MODES = [["UPI", "UPI", Smartphone], ["NET_BANKING", "Net banking", Landmark], ["CARD", "Debit / credit card", CreditCard]];
const fmtDate = (d) => (d ? new Date(d).toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" }) : "—");

/** Fee statement with a simulated payment: settling lines issues a receipt, no money moves. */
export default function FeePortal({ push }) {
  const [data, setData] = useState(null);
  const [error, setError] = useState(null);
  const [selected, setSelected] = useState([]);
  const [payOpen, setPayOpen] = useState(false);
  const [mode, setMode] = useState("UPI");
  const [busy, setBusy] = useState(false);
  const [receipt, setReceipt] = useState(null);

  const load = () => api.studentFees().then((d) => { setData(d); setError(null); }).catch((e) => setError(e.message));
  useEffect(() => { load(); }, []);

  const unpaid = useMemo(() => (data?.items || []).filter((i) => !i.paid), [data]);
  const total = unpaid.filter((i) => selected.includes(i.id)).reduce((n, i) => n + i.amount, 0);
  const byTerm = useMemo(() => {
    const m = {};
    (data?.items || []).forEach((i) => { (m[i.term] = m[i.term] || []).push(i); });
    return Object.entries(m).sort((a, b) => b[0].localeCompare(a[0]));
  }, [data]);

  async function pay() {
    setBusy(true);
    try {
      const before = new Set((data.items || []).filter((i) => i.paid).map((i) => i.id));
      const res = await api.payFees(selected, mode);
      const settled = res.items.filter((i) => i.paid && !before.has(i.id));
      setData(res); setSelected([]); setPayOpen(false);
      setReceipt({ no: settled[0]?.receiptNo, at: settled[0]?.paidAt, mode, items: settled });
      push({ title: "Payment successful", body: `${inr(settled.reduce((n, i) => n + i.amount, 0))} · receipt ${settled[0]?.receiptNo}`, tone: "success" });
    } catch (e) {
      push({ title: "Payment failed", body: e.message, tone: "danger" });
    } finally { setBusy(false); }
  }

  if (error) return <ErrorNote message={error} onRetry={load} />;
  if (!data) return <Skeleton />;

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
      <KpiTiles tiles={[
        { label: "Total billed", value: inr(data.billed), sub: "All academic years", icon: Receipt },
        { label: "Paid", value: inr(data.paid), sub: `${data.items.filter((i) => i.paid).length} items settled`, icon: CheckCircle2 },
        { label: "Due", value: inr(data.due), sub: unpaid.length ? `${unpaid.length} item${unpaid.length === 1 ? "" : "s"} open` : "Nothing due", icon: Wallet,
          tone: data.due ? "warning" : undefined },
        { label: "Overdue", value: inr(data.overdue), sub: data.overdue ? "Pay now to avoid a late fine" : "Nothing overdue", icon: AlertTriangle,
          tone: data.overdue ? "danger" : undefined },
      ]} />

      <Card lift={false} style={{ padding: 18 }}>
        <SectionHead icon={Wallet} title="Pay fees" sub="Select what to pay. Payment here is simulated: it records the payment and issues a receipt."
          right={<Button icon={CreditCard} disabled={!selected.length} onClick={() => setPayOpen(true)}>
            {selected.length ? `Pay ${inr(total)}` : "Select items to pay"}</Button>} />
        {!unpaid.length ? (
          <div style={{ display: "flex", gap: 8, alignItems: "center", fontSize: 13, color: t.success }}>
            <CheckCircle2 size={16} /> All fees are paid. Nothing is due.</div>
        ) : unpaid.map((i) => {
          const Icon = ICON[i.category] || Receipt;
          const on = selected.includes(i.id);
          return (
            <label key={i.id} style={{ display: "flex", alignItems: "center", gap: 12, padding: "11px 13px", borderRadius: 11, marginBottom: 8,
              cursor: "pointer", border: `1px solid ${on ? t.primary : i.overdue ? `${t.danger}55` : t.border}`,
              background: on ? t.primarySoft : i.overdue ? t.dangerSoft : "#fff" }}>
              <input type="checkbox" checked={on} onChange={() => setSelected(on ? selected.filter((x) => x !== i.id) : [...selected, i.id])}
                style={{ width: 18, height: 18, accentColor: t.primary }} />
              <span style={{ width: 34, height: 34, borderRadius: 9, background: t.bgSoft, display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
                <Icon size={16} color={t.primary} /></span>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ fontSize: 13, fontWeight: 600 }}>{i.description}</div>
                <div style={{ fontSize: 11, color: i.overdue ? t.danger : t.textDim }}>
                  {LABEL[i.category] || i.category} · {i.term} · {i.overdue ? "Overdue since" : "Due"} {fmtDate(i.dueDate)}</div>
              </div>
              {i.overdue && <Badge tone="danger">Overdue</Badge>}
              <div style={{ fontFamily: FONT_M, fontSize: 14, fontWeight: 800 }}>{inr(i.amount)}</div>
            </label>
          );
        })}
        {unpaid.length > 1 && (
          <button className="sv-btn" onClick={() => setSelected(selected.length === unpaid.length ? [] : unpaid.map((i) => i.id))}
            style={{ background: "none", border: "none", color: t.primary, fontSize: 12, fontWeight: 700, cursor: "pointer", padding: "4px 0" }}>
            {selected.length === unpaid.length ? "Clear selection" : "Select everything due"}</button>
        )}
      </Card>

      <Card lift={false} style={{ padding: 18 }}>
        <SectionHead icon={Receipt} title="Fee statement" sub="Every fee by academic year, with receipts for what is paid." />
        {byTerm.map(([term, items]) => (
          <div key={term} style={{ marginBottom: 16 }}>
            <div style={{ fontFamily: FONT_M, fontSize: 10.5, letterSpacing: "0.12em", textTransform: "uppercase", color: t.gold, margin: "4px 0 8px" }}>
              Academic year {term}</div>
            <div className="sv-scroll" style={{ overflowX: "auto" }}>
              <table style={{ width: "100%", minWidth: 640, fontSize: 12.5, borderCollapse: "collapse" }}>
                <thead><tr>{["Fee", "Category", "Due date", "Amount", "Status", "Receipt"].map((h) => (
                  <th key={h} style={{ textAlign: h === "Amount" ? "right" : "left", padding: "7px 10px", fontFamily: FONT_M, fontSize: 9.5,
                    letterSpacing: "0.12em", textTransform: "uppercase", color: t.textFaint, borderBottom: `1px solid ${t.border}`, fontWeight: 500 }}>{h}</th>))}</tr></thead>
                <tbody>
                  {items.map((i) => (
                    <tr key={i.id}>
                      <td style={{ padding: "9px 10px", borderBottom: `1px solid ${t.border}` }}>{i.description}</td>
                      <td style={{ padding: "9px 10px", color: t.textDim, borderBottom: `1px solid ${t.border}` }}>{LABEL[i.category] || i.category}</td>
                      <td style={{ padding: "9px 10px", color: t.textDim, borderBottom: `1px solid ${t.border}` }}>{fmtDate(i.dueDate)}</td>
                      <td style={{ padding: "9px 10px", textAlign: "right", fontFamily: FONT_M, fontWeight: 700, borderBottom: `1px solid ${t.border}` }}>{inr(i.amount)}</td>
                      <td style={{ padding: "9px 10px", borderBottom: `1px solid ${t.border}` }}>
                        {i.paid ? <Badge tone="success">Paid {i.paidAt?.split(",")[0]}</Badge> : i.overdue ? <Badge tone="danger">Overdue</Badge> : <Badge tone="warning">Due</Badge>}</td>
                      <td style={{ padding: "9px 10px", borderBottom: `1px solid ${t.border}` }}>
                        {i.paid ? <button className="sv-btn" onClick={() => setReceipt({ no: i.receiptNo, at: i.paidAt, mode: i.paymentMode,
                          items: data.items.filter((x) => x.receiptNo === i.receiptNo) })}
                          style={{ background: "none", border: "none", color: t.primary, fontFamily: FONT_M, fontSize: 11.5, cursor: "pointer", textDecoration: "underline", padding: 0 }}>
                          {i.receiptNo}</button> : <span style={{ color: t.textFaint }}>—</span>}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        ))}
      </Card>

      <Modal open={payOpen} onClose={() => !busy && setPayOpen(false)} eyebrow="Fee payment" title={`Pay ${inr(total)}`} width={460}
        footer={<><Button variant="ghost" onClick={() => setPayOpen(false)} disabled={busy}>Cancel</Button>
          <Button onClick={pay} disabled={busy}>{busy ? <Spinner size={14} color="#fff" /> : `Pay ${inr(total)}`}</Button></>}>
        <div style={{ fontSize: 12.5, color: t.textDim, marginBottom: 12 }}>
          {unpaid.filter((i) => selected.includes(i.id)).map((i) => i.description).join(" · ")}</div>
        <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
          {MODES.map(([key, label, Icon]) => (
            <label key={key} style={{ display: "flex", alignItems: "center", gap: 11, padding: "12px 13px", borderRadius: 11, cursor: "pointer",
              border: `1px solid ${mode === key ? t.primary : t.border}`, background: mode === key ? t.primarySoft : "#fff" }}>
              <input type="radio" name="paymode" checked={mode === key} onChange={() => setMode(key)} style={{ accentColor: t.primary }} />
              <Icon size={17} color={t.primary} /> <span style={{ fontSize: 13, fontWeight: 600 }}>{label}</span>
            </label>
          ))}
        </div>
        <div style={{ fontSize: 11, color: t.textFaint, marginTop: 12 }}>Simulated payment for the college ERP. No card or bank details are asked for or stored.</div>
      </Modal>

      <Modal open={!!receipt} onClose={() => setReceipt(null)} eyebrow="Payment receipt" title={receipt?.no || ""} width={460}
        footer={<><Button variant="ghost" icon={Printer} onClick={() => window.print()}>Print</Button>
          <Button onClick={() => setReceipt(null)}>Done</Button></>}>
        {receipt && (
          <div>
            <div style={{ fontFamily: FONT_D, fontSize: 16, fontWeight: 700 }}>{COLLEGE.name}</div>
            <div style={{ fontSize: 11.5, color: t.textDim, marginBottom: 12 }}>{COLLEGE.location} · Accounts section</div>
            {receipt.items.map((i) => (
              <div key={i.id} style={{ display: "flex", justifyContent: "space-between", gap: 10, fontSize: 12.5, padding: "7px 0", borderBottom: `1px dashed ${t.border}` }}>
                <span>{i.description}</span><span style={{ fontFamily: FONT_M, fontWeight: 700 }}>{inr(i.amount)}</span></div>
            ))}
            <div style={{ display: "flex", justifyContent: "space-between", fontSize: 14, fontWeight: 800, padding: "10px 0" }}>
              <span>Total paid</span><span style={{ fontFamily: FONT_M }}>{inr(receipt.items.reduce((n, i) => n + i.amount, 0))}</span></div>
            <div style={{ fontSize: 11.5, color: t.textDim }}>
              Paid {receipt.at} · {(MODES.find((m) => m[0] === receipt.mode) || [0, receipt.mode])[1]}</div>
          </div>
        )}
      </Modal>
      {data.overdue > 0 && (
        <div style={{ display: "flex", gap: 7, alignItems: "center", fontSize: 12, color: t.danger }}>
          <AlertTriangle size={14} /> {inr(data.overdue)} is past its due date.</div>
      )}
    </div>
  );
}
