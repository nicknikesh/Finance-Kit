import { useState, useEffect } from "react";
import { NavLink, useNavigate, useLocation } from "react-router-dom";

const LINKS = [
  { to:"/dashboard",    label:"Dashboard",    icon:"📊" },
  { to:"/transactions", label:"Transactions", icon:"💳" },
  { to:"/history",      label:"History",      icon:"📁" },
  { to:"/budget",       label:"Budget",       icon:"🎯" },
  { to:"/recurring",    label:"Recurring",    icon:"🔄" },
  { to:"/profile",      label:"Profile",      icon:"👤" },
  { to:"/settings",     label:"Settings",     icon:"⚙️" },
];

// ── Desktop Sidebar ───────────────────────────────────────────────────────────
export function Sidebar({ collapsed, onToggle }) {
  const navigate  = useNavigate();
  const logout    = () => { localStorage.removeItem("token"); navigate("/"); };
  const username  = localStorage.getItem("username") || "User";
  const w         = collapsed ? 64 : 220;

  return (
    <aside
      aria-label="Sidebar navigation"
      style={{
        position: "fixed", left: 0, top: 0, bottom: 0,
        width: w, zIndex: 40,
        background: "#0a0b14",
        borderRight: "1px solid rgba(255,255,255,0.07)",
        display: "flex", flexDirection: "column",
        transition: "width 0.28s cubic-bezier(0.4,0,0.2,1)",
        overflow: "hidden",
      }}
    >
      {/* Logo */}
      <div style={{
        height: 64, display: "flex", alignItems: "center",
        padding: collapsed ? "0 16px" : "0 20px",
        borderBottom: "1px solid rgba(255,255,255,0.06)",
        gap: 10, flexShrink: 0,
        justifyContent: collapsed ? "center" : "flex-start",
      }}>
        <div style={{
          width: 32, height: 32, borderRadius: 9, flexShrink: 0,
          background: "linear-gradient(135deg,#ff4d6d,#ff7043)",
          display: "flex", alignItems: "center", justifyContent: "center",
          fontFamily: "'Outfit',sans-serif", fontSize: 16, fontWeight: 900, color: "#fff",
          boxShadow: "0 2px 10px rgba(255,77,109,0.38)",
        }}>F</div>
        {!collapsed && (
          <span style={{
            fontFamily: "'Outfit',sans-serif", fontWeight: 800, fontSize: 16,
            color: "#fff", letterSpacing: "-0.02em", whiteSpace: "nowrap",
          }}>Finance Kit</span>
        )}
      </div>

      {/* Collapse toggle */}
      <button
        onClick={onToggle}
        aria-label={collapsed ? "Expand sidebar" : "Collapse sidebar"}
        style={{
          position: "absolute", top: 70, right: -12,
          width: 24, height: 24, borderRadius: "50%",
          background: "#1e2030", border: "1px solid rgba(255,255,255,0.12)",
          color: "#5c5f72", fontSize: 10, cursor: "pointer",
          display: "flex", alignItems: "center", justifyContent: "center",
          transition: "all 0.18s", zIndex: 10,
        }}
        onMouseEnter={e => { e.currentTarget.style.background = "#2a2d40"; e.currentTarget.style.color = "#fff"; }}
        onMouseLeave={e => { e.currentTarget.style.background = "#1e2030"; e.currentTarget.style.color = "#5c5f72"; }}
      >
        {collapsed ? "›" : "‹"}
      </button>

      {/* Nav links */}
      <nav aria-label="Main navigation" style={{ flex: 1, padding: "12px 8px", overflowY: "auto" }}>
        {LINKS.map(({ to, label, icon }) => (
          <NavLink key={to} to={to}
            title={collapsed ? label : undefined}
            style={({ isActive }) => ({
              display: "flex", alignItems: "center",
              gap: collapsed ? 0 : 10,
              justifyContent: collapsed ? "center" : "flex-start",
              padding: collapsed ? "11px 0" : "10px 14px",
              borderRadius: 11, marginBottom: 2, textDecoration: "none",
              fontSize: 13, fontWeight: 600,
              color:       isActive ? "#fff" : "#5c5f72",
              background:  isActive ? "rgba(255,77,109,0.14)" : "transparent",
              border:      isActive ? "1px solid rgba(255,77,109,0.28)" : "1px solid transparent",
              transition:  "all 0.16s ease",
            })}
            onMouseEnter={e => {
              if (!e.currentTarget.style.background.includes("255,77")) {
                e.currentTarget.style.background = "rgba(255,255,255,0.05)";
                e.currentTarget.style.color = "#a0a3b1";
              }
            }}
            onMouseLeave={e => {
              if (!e.currentTarget.style.background.includes("255,77")) {
                e.currentTarget.style.background = "transparent";
              }
            }}
          >
            <span style={{ fontSize: 16, flexShrink: 0 }}>{icon}</span>
            {!collapsed && <span style={{ whiteSpace: "nowrap" }}>{label}</span>}
          </NavLink>
        ))}
      </nav>

      {/* User + logout */}
      <div style={{
        padding: collapsed ? "12px 8px" : "12px 14px",
        borderTop: "1px solid rgba(255,255,255,0.06)",
        flexShrink: 0,
      }}>
        {!collapsed && (
          <div style={{
            display: "flex", alignItems: "center", gap: 10,
            padding: "10px 10px", borderRadius: 11,
            background: "rgba(255,255,255,0.04)",
            border: "1px solid rgba(255,255,255,0.07)",
            marginBottom: 8,
          }}>
            <div style={{
              width: 30, height: 30, borderRadius: "50%", flexShrink: 0,
              background: "linear-gradient(135deg,#a78bfa,#ff4d6d)",
              display: "flex", alignItems: "center", justifyContent: "center",
              fontSize: 13, fontWeight: 700, color: "#fff",
            }}>
              {username.charAt(0).toUpperCase()}
            </div>
            <div style={{ minWidth: 0 }}>
              <div style={{ fontSize: 12, fontWeight: 700, color: "#fff",
                overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                {username}
              </div>
              <div style={{ fontSize: 10, color: "#3a3d52" }}>Personal Account</div>
            </div>
          </div>
        )}
        <button
          onClick={logout}
          aria-label="Sign out"
          title={collapsed ? "Sign out" : undefined}
          style={{
            width: "100%", padding: collapsed ? "10px 0" : "9px 12px",
            borderRadius: 10, border: "1px solid rgba(255,77,109,0.18)",
            background: "rgba(255,77,109,0.07)", color: "#ff8a80",
            fontSize: 12, fontWeight: 700, cursor: "pointer",
            fontFamily: "'Inter',sans-serif", transition: "all 0.18s",
            display: "flex", alignItems: "center",
            justifyContent: "center", gap: 6,
          }}
          onMouseEnter={e => { e.currentTarget.style.background = "rgba(255,77,109,0.15)"; e.currentTarget.style.borderColor = "rgba(255,77,109,0.35)"; }}
          onMouseLeave={e => { e.currentTarget.style.background = "rgba(255,77,109,0.07)"; e.currentTarget.style.borderColor = "rgba(255,77,109,0.18)"; }}
        >
          <span>⏻</span>
          {!collapsed && <span>Sign out</span>}
        </button>
      </div>
    </aside>
  );
}

// ── Mobile top navbar ─────────────────────────────────────────────────────────
export function MobileNav({ menuOpen, onToggle }) {
  const navigate = useNavigate();
  const location = useLocation();
  const logout   = () => { localStorage.removeItem("token"); navigate("/"); };

  // Close menu on route change
  useEffect(() => { onToggle(false); }, [location.pathname]);

  return (
    <>
      <header
        role="banner"
        style={{
          position: "fixed", top: 0, left: 0, right: 0, zIndex: 50,
          background: "rgba(10,11,20,0.92)",
          backdropFilter: "blur(18px)", WebkitBackdropFilter: "blur(18px)",
          borderBottom: "1px solid rgba(255,255,255,0.07)",
          height: 58, display: "flex", alignItems: "center",
          justifyContent: "space-between", padding: "0 16px",
          fontFamily: "'Inter',system-ui,sans-serif",
        }}
      >
        {/* Logo */}
        <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
          <div style={{
            width: 30, height: 30, borderRadius: 8,
            background: "linear-gradient(135deg,#ff4d6d,#ff7043)",
            display: "flex", alignItems: "center", justifyContent: "center",
            fontSize: 14, fontWeight: 900, color: "#fff",
            boxShadow: "0 2px 10px rgba(255,77,109,0.38)",
          }}>F</div>
          <span style={{ fontFamily: "'Outfit',sans-serif", fontWeight: 800, fontSize: 15, color: "#fff" }}>
            Finance Kit
          </span>
        </div>

        {/* Hamburger */}
        <button
          onClick={() => onToggle(!menuOpen)}
          aria-label={menuOpen ? "Close menu" : "Open menu"}
          aria-expanded={menuOpen}
          style={{
            background: "rgba(255,255,255,0.06)", border: "1px solid rgba(255,255,255,0.1)",
            borderRadius: 9, width: 38, height: 38, cursor: "pointer",
            display: "flex", flexDirection: "column", alignItems: "center",
            justifyContent: "center", gap: 5,
          }}
        >
          {[0,1,2].map(i => (
            <span key={i} style={{
              display: "block", height: 2, borderRadius: 2, background: "#a0a3b1",
              transition: "all 0.22s",
              width: i === 1 && menuOpen ? 0 : i === 0 && menuOpen ? 20 : i === 2 && menuOpen ? 20 : 20,
              transform: i === 0 && menuOpen ? "rotate(45deg) translate(5px,5px)" : i === 2 && menuOpen ? "rotate(-45deg) translate(5px,-5px)" : "none",
            }}/>
          ))}
        </button>
      </header>

      {/* Drawer */}
      {menuOpen && (
        <div
          role="dialog"
          aria-modal="true"
          aria-label="Navigation menu"
          style={{
            position: "fixed", top: 58, left: 0, right: 0, bottom: 0,
            background: "rgba(10,11,20,0.97)",
            backdropFilter: "blur(20px)",
            zIndex: 49, padding: "20px 16px",
            animation: "fk-fadein 0.22s ease both",
            overflowY: "auto",
          }}
        >
          <nav aria-label="Mobile navigation">
            {LINKS.map(({ to, label, icon }) => (
              <NavLink key={to} to={to}
                style={({ isActive }) => ({
                  display: "flex", alignItems: "center", gap: 14,
                  padding: "14px 16px", borderRadius: 14, marginBottom: 6,
                  textDecoration: "none", fontSize: 15, fontWeight: 600,
                  color:      isActive ? "#fff" : "#a0a3b1",
                  background: isActive ? "rgba(255,77,109,0.14)" : "rgba(255,255,255,0.03)",
                  border:     isActive ? "1px solid rgba(255,77,109,0.3)" : "1px solid rgba(255,255,255,0.06)",
                })}
              >
                <span style={{ fontSize: 20 }}>{icon}</span>
                {label}
              </NavLink>
            ))}
          </nav>
          <button onClick={logout}
            style={{
              width: "100%", marginTop: 20, padding: "14px", borderRadius: 14,
              background: "rgba(255,77,109,0.1)", border: "1px solid rgba(255,77,109,0.25)",
              color: "#ff8a80", fontSize: 15, fontWeight: 700, cursor: "pointer",
              fontFamily: "'Inter',sans-serif",
            }}>
            ⏻ Sign out
          </button>
        </div>
      )}
    </>
  );
}
