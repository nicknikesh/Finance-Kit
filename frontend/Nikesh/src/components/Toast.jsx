import { createContext, useCallback, useContext, useRef, useState } from "react";

const ToastCtx = createContext(null);

// ── Toast types ───────────────────────────────────────────────────────────────
const TOAST_STYLES = {
  success: { bg:"rgba(74,222,128,0.12)",  border:"rgba(74,222,128,0.3)",  icon:"✅", color:"#4ade80"  },
  error:   { bg:"rgba(255,77,109,0.12)",  border:"rgba(255,77,109,0.3)",  icon:"❌", color:"#ff8a80"  },
  warning: { bg:"rgba(251,146,60,0.12)",  border:"rgba(251,146,60,0.3)",  icon:"⚠️", color:"#fb923c"  },
  info:    { bg:"rgba(167,139,250,0.1)",  border:"rgba(167,139,250,0.28)",icon:"ℹ️", color:"#a78bfa"  },
};

// ── Individual toast ──────────────────────────────────────────────────────────
function Toast({ id, type = "info", message, onClose }) {
  const s = TOAST_STYLES[type] || TOAST_STYLES.info;
  return (
    <div
      role="alert"
      aria-live="polite"
      style={{
        display: "flex", alignItems: "flex-start", gap: 10,
        padding: "12px 16px", borderRadius: 14, minWidth: 260, maxWidth: 380,
        background: s.bg,
        border: `1px solid ${s.border}`,
        boxShadow: "0 8px 32px rgba(0,0,0,0.4)",
        backdropFilter: "blur(12px)",
        animation: "fk-toast-in 0.32s cubic-bezier(0.34,1.56,0.64,1) both",
        fontFamily: "'Inter',system-ui,sans-serif",
      }}
    >
      <span style={{ fontSize: 16, flexShrink: 0, marginTop: 1 }}>{s.icon}</span>
      <span style={{ flex: 1, fontSize: 13, fontWeight: 500, color: "#e0e3f0", lineHeight: 1.5 }}>
        {message}
      </span>
      <button
        onClick={() => onClose(id)}
        aria-label="Dismiss notification"
        style={{
          background: "none", border: "none", cursor: "pointer",
          color: "#3a3d52", fontSize: 16, flexShrink: 0, lineHeight: 1,
          padding: "0 0 0 4px", transition: "color 0.15s",
        }}
        onMouseEnter={e => e.currentTarget.style.color = "#fff"}
        onMouseLeave={e => e.currentTarget.style.color = "#3a3d52"}
      >×</button>
    </div>
  );
}

// ── Provider + container ──────────────────────────────────────────────────────
export function ToastProvider({ children }) {
  const [toasts, setToasts] = useState([]);
  const nextId = useRef(0);

  const show = useCallback((message, type = "info", duration = 3500) => {
    const id = ++nextId.current;
    setToasts(t => [...t, { id, message, type }]);
    setTimeout(() => setToasts(t => t.filter(x => x.id !== id)), duration);
    return id;
  }, []);

  const dismiss = useCallback((id) => {
    setToasts(t => t.filter(x => x.id !== id));
  }, []);

  return (
    <ToastCtx.Provider value={{ show, dismiss }}>
      {children}
      {/* Toast container — fixed top-right */}
      <div
        aria-label="Notifications"
        style={{
          position: "fixed", top: 80, right: 20, zIndex: 9999,
          display: "flex", flexDirection: "column", gap: 10,
          pointerEvents: "none",
        }}
      >
        {toasts.map(t => (
          <div key={t.id} style={{ pointerEvents: "auto" }}>
            <Toast {...t} onClose={dismiss} />
          </div>
        ))}
      </div>
    </ToastCtx.Provider>
  );
}

// ── Hook ──────────────────────────────────────────────────────────────────────
export function useToast() {
  const ctx = useContext(ToastCtx);
  if (!ctx) throw new Error("useToast must be inside <ToastProvider>");
  return ctx;
}
