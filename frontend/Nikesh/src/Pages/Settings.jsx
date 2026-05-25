import { useEffect, useState } from "react";

const CURRENCIES = [
  { v: "₹", l: "₹  Indian Rupee (INR)" },
  { v: "$", l: "$  US Dollar (USD)" },
  { v: "€", l: "€  Euro (EUR)" },
  { v: "£", l: "£  British Pound (GBP)" },
];

function Toggle({ checked, onChange }) {
  return (
    <label style={{ display: "inline-flex", alignItems: "center", cursor: "pointer" }}>
      <input type="checkbox" checked={checked} onChange={onChange}
        style={{ opacity: 0, width: 0, height: 0, position: "absolute" }} />
      <div style={{
        width: 44, height: 24, borderRadius: 99,
        background: checked ? "#ff4d6d" : "#1a1b28",
        border: `1px solid ${checked ? "transparent" : "rgba(255,255,255,0.1)"}`,
        transition: "all 0.22s ease",
        boxShadow: checked ? "0 0 12px rgba(255,77,109,0.28)" : "none",
        position: "relative", flexShrink: 0,
      }}>
        <div style={{
          position: "absolute", top: 2, borderRadius: "50%",
          left: checked ? 22 : 2, width: 18, height: 18,
          background: "#fff", transition: "left 0.22s ease",
          boxShadow: "0 1px 4px rgba(0,0,0,0.4)",
        }} />
      </div>
    </label>
  );
}

function Row({ icon, title, desc, children }) {
  return (
    <div style={{
      display: "flex", alignItems: "center", justifyContent: "space-between",
      gap: 16, padding: "16px 0", borderBottom: "1px solid rgba(255,255,255,0.06)",
    }}>
      <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
        <div style={{
          width: 36, height: 36, borderRadius: 9,
          background: "#0d0e17", border: "1px solid rgba(255,255,255,0.07)",
          display: "flex", alignItems: "center", justifyContent: "center",
          fontSize: 16, flexShrink: 0,
        }}>{icon}</div>
        <div>
          <div style={{ fontSize: 14, fontWeight: 600, color: "#fff" }}>{title}</div>
          <div style={{ fontSize: 12, color: "#5c5f72", marginTop: 2 }}>{desc}</div>
        </div>
      </div>
      <div style={{ flexShrink: 0 }}>{children}</div>
    </div>
  );
}

export default function Settings() {
  const [theme, setTheme] = useState(localStorage.getItem("theme") || "dark");
  const [currency, setCurrency] = useState(localStorage.getItem("currency") || "₹");
  const [notifications, setNotifications] = useState(localStorage.getItem("notifications") === "true");
  const [compact, setCompact] = useState(localStorage.getItem("compact") === "true");
  const [saved, setSaved] = useState(false);

  useEffect(() => { localStorage.setItem("theme", theme); }, [theme]);
  useEffect(() => { localStorage.setItem("currency", currency); }, [currency]);
  useEffect(() => { localStorage.setItem("notifications", String(notifications)); }, [notifications]);
  useEffect(() => { localStorage.setItem("compact", String(compact)); }, [compact]);

  const save = () => { setSaved(true); setTimeout(() => setSaved(false), 2500); };

  const btnStyle = active => ({
    padding: "8px 16px", fontSize: 13, borderRadius: 10,
    background: active ? "#ff4d6d" : "transparent",
    color: active ? "#fff" : "#a0a3b1",
    border: active ? "1px solid transparent" : "1px solid rgba(255,255,255,0.08)",
    boxShadow: active ? "0 4px 12px rgba(255,77,109,0.28)" : "none",
    cursor: "pointer", fontFamily: "'Inter',system-ui,sans-serif", fontWeight: 600,
    transition: "all 0.18s ease",
  });

  return (
    <div style={{ fontFamily: "'Inter',system-ui,sans-serif" }} className="anim-fadeup">
      <div style={{ marginBottom: 28 }}>
        <h1 style={{ fontFamily: "'Outfit',sans-serif", fontSize: 26, fontWeight: 800, color: "#fff", letterSpacing: "-0.03em", margin: 0 }}>Settings</h1>
        <p style={{ color: "#a0a3b1", fontSize: 14, marginTop: 6 }}>Customize your Finance Kit experience</p>
      </div>

      {saved && <div className="fk-alert fk-alert-success anim-fadein" style={{ marginBottom: 20 }}>✅ Settings saved.</div>}

      <div style={{ maxWidth: 720, display: "grid", gap: 18 }}>

        {/* Appearance */}
        <div className="fk-card">
          <h2 style={{ fontSize: 15, fontWeight: 700, color: "#fff", margin: "0 0 2px", fontFamily: "'Outfit',sans-serif" }}>Appearance</h2>
          <p style={{ fontSize: 13, color: "#5c5f72", marginBottom: 6 }}>How Finance Kit looks on your device</p>

          <Row icon="🎨" title="Theme" desc="Dark or light mode">
            <div style={{ display: "flex", gap: 6 }}>
              <button style={btnStyle(theme === "dark")} onClick={() => setTheme("dark")}>Dark</button>
              <button style={btnStyle(theme === "light")} onClick={() => setTheme("light")}>Light</button>
            </div>
          </Row>

          <Row icon="📦" title="Compact mode" desc="Tighter spacing for more content">
            <Toggle checked={compact} onChange={e => setCompact(e.target.checked)} />
          </Row>
        </div>

        {/* Regional */}
        <div className="fk-card">
          <h2 style={{ fontSize: 15, fontWeight: 700, color: "#fff", margin: "0 0 2px", fontFamily: "'Outfit',sans-serif" }}>Regional</h2>
          <p style={{ fontSize: 13, color: "#5c5f72", marginBottom: 6 }}>Currency and locale preferences</p>

          <Row icon="💱" title="Currency" desc="Symbol shown across the app">
            <select className="fk-input" value={currency} onChange={e => setCurrency(e.target.value)}
              style={{ minWidth: 220, padding: "9px 13px", fontSize: 13 }}>
              {CURRENCIES.map(({ v, l }) => <option key={v} value={v}>{l}</option>)}
            </select>
          </Row>
        </div>

        {/* Notifications */}
        <div className="fk-card">
          <h2 style={{ fontSize: 15, fontWeight: 700, color: "#fff", margin: "0 0 2px", fontFamily: "'Outfit',sans-serif" }}>Notifications</h2>
          <p style={{ fontSize: 13, color: "#5c5f72", marginBottom: 6 }}>How you receive alerts</p>

          <Row icon="📧" title="Email alerts" desc="Weekly spending summary by email">
            <Toggle checked={notifications} onChange={e => setNotifications(e.target.checked)} />
          </Row>
        </div>

        {/* Danger */}
        <div className="fk-card" style={{ border: "1px solid rgba(255,77,109,0.18)" }}>
          <h2 style={{ fontSize: 15, fontWeight: 700, color: "#ff8a80", margin: "0 0 2px", fontFamily: "'Outfit',sans-serif" }}>Danger zone</h2>
          <p style={{ fontSize: 13, color: "#5c5f72", marginBottom: 14 }}>Irreversible account actions</p>
          <button className="fk-btn fk-btn-danger" style={{ padding: "10px 18px", fontSize: 13 }}>
            Clear all transaction data
          </button>
          <p style={{ fontSize: 12, color: "#3a3d52", marginTop: 8 }}>
            This permanently removes all your transactions.
          </p>
        </div>

        <button className="fk-btn fk-btn-primary" onClick={save} style={{ alignSelf: "flex-start", padding: "13px 28px", fontSize: 14 }}>
          Save settings
        </button>
      </div>
    </div>
  );
}
