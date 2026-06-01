import { Component } from "react";

/**
 * ErrorBoundary — catches JS errors in child tree.
 * Shows a premium recovery UI instead of a blank screen.
 */
export default class ErrorBoundary extends Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error) {
    return { hasError: true, error };
  }

  componentDidCatch(error, info) {
    console.error("[ErrorBoundary]", error, info);
  }

  render() {
    if (!this.state.hasError) return this.props.children;

    return (
      <div style={{
        minHeight: "60vh", display: "flex", flexDirection: "column",
        alignItems: "center", justifyContent: "center",
        padding: 40, fontFamily: "'Inter',system-ui,sans-serif",
      }}>
        <div style={{
          background: "#10111c", border: "1px solid rgba(255,77,109,0.25)",
          borderRadius: 20, padding: "40px 48px", maxWidth: 480, textAlign: "center",
          boxShadow: "0 20px 60px rgba(0,0,0,0.5)",
        }}>
          <div style={{ fontSize: 48, marginBottom: 16 }}>⚠️</div>
          <h2 style={{
            fontFamily: "'Outfit',sans-serif", fontSize: 22, fontWeight: 800,
            color: "#fff", marginBottom: 10, letterSpacing: "-0.03em",
          }}>Something went wrong</h2>
          <p style={{ fontSize: 14, color: "#5c5f72", marginBottom: 24, lineHeight: 1.7 }}>
            An unexpected error occurred in this section. Your data is safe.
          </p>
          {this.state.error && (
            <pre style={{
              fontSize: 11, color: "#3a3d52", background: "#08090f",
              borderRadius: 10, padding: "10px 14px", marginBottom: 24,
              textAlign: "left", overflow: "auto", maxHeight: 100,
              border: "1px solid rgba(255,255,255,0.05)",
            }}>
              {this.state.error.message}
            </pre>
          )}
          <button
            onClick={() => { this.setState({ hasError: false, error: null }); window.location.reload(); }}
            style={{
              padding: "11px 24px", borderRadius: 12, border: "none",
              background: "#ff4d6d", color: "#fff", fontSize: 14, fontWeight: 700,
              cursor: "pointer", fontFamily: "'Inter',sans-serif",
              boxShadow: "0 4px 16px rgba(255,77,109,0.35)",
              transition: "all 0.18s",
            }}
            onMouseEnter={e => e.currentTarget.style.background = "#ff6b85"}
            onMouseLeave={e => e.currentTarget.style.background = "#ff4d6d"}
          >
            🔄 Reload Page
          </button>
        </div>
      </div>
    );
  }
}
