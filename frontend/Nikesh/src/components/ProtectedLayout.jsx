import { useState, useEffect } from "react";
import { Outlet } from "react-router-dom";
import { Sidebar, MobileNav } from "./Navbar";
import ErrorBoundary from "./ErrorBoundary";

const SIDEBAR_EXPANDED  = 220;
const SIDEBAR_COLLAPSED = 64;
const DESKTOP_BP        = 900; // px

export default function ProtectedLayout() {
  const [collapsed,  setCollapsed]  = useState(false);
  const [isMobile,   setIsMobile]   = useState(window.innerWidth < DESKTOP_BP);
  const [menuOpen,   setMenuOpen]   = useState(false);

  useEffect(() => {
    const onResize = () => setIsMobile(window.innerWidth < DESKTOP_BP);
    window.addEventListener("resize", onResize);
    return () => window.removeEventListener("resize", onResize);
  }, []);

  const sidebarW = isMobile ? 0 : (collapsed ? SIDEBAR_COLLAPSED : SIDEBAR_EXPANDED);

  return (
    <div style={{
      minHeight: "100vh",
      background: "#030305",
      color: "#fff",
      fontFamily: "'Inter',system-ui,sans-serif",
    }}>
      {/* Desktop sidebar */}
      {!isMobile && (
        <Sidebar
          collapsed={collapsed}
          onToggle={() => setCollapsed(c => !c)}
        />
      )}

      {/* Mobile top bar */}
      {isMobile && (
        <MobileNav menuOpen={menuOpen} onToggle={setMenuOpen} />
      )}

      {/* Main content — offset by sidebar width on desktop */}
      <main
        id="main-content"
        role="main"
        style={{
          marginLeft: sidebarW,
          paddingTop: isMobile ? 58 : 0,
          transition: "margin-left 0.28s cubic-bezier(0.4,0,0.2,1)",
          minHeight: "100vh",
        }}
      >
        <div style={{
          maxWidth: 1200,
          margin: "0 auto",
          padding: isMobile ? "24px 14px 60px" : "36px 32px 64px",
        }}>
          <ErrorBoundary>
            <Outlet />
          </ErrorBoundary>
        </div>
      </main>
    </div>
  );
}
