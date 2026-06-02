import { useEffect, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import axios from "axios";
import { API } from "../utils/api";

/* ── colour tokens (unchanged) ── */
const C = {
  bg:     "#030305",
  panel:  "#08090f",
  card:   "#10111c",
  border: "rgba(255,255,255,0.08)",
  accent: "#ff4d6d",
  text:   "#ffffff",
  muted:  "#a0a3b1",
  dim:    "#5c5f72",
};

/* ── Feature cards data ── */
const FEATURES = [
  {
    icon: "📊",
    title: "Smart Expense Analytics",
    desc: "Understand where your money goes through intelligent dashboards and visual reports.",
    accent: "#f59e0b",
  },
  {
    icon: "🤖",
    title: "AI Financial Insights",
    desc: "Get personalized spending analysis and financial recommendations powered by Gemini AI.",
    accent: "#a78bfa",
  },
  {
    icon: "📄",
    title: "Automated Statement Processing",
    desc: "Upload bank statements and automatically organize transactions by category.",
    accent: "#60a5fa",
  },
  {
    icon: "🎯",
    title: "Budget & Savings Tracking",
    desc: "Monitor goals, track progress, and build better financial discipline.",
    accent: "#4ade80",
  },
];

const TRUST = [
  { icon: "🔒", label: "Secure Authentication" },
  { icon: "⚡", label: "Fast Financial Analysis" },
  { icon: "📈", label: "Intelligent Insights" },
];

/* ── Main component ── */
export default function Login() {
  /* ── Auth state (UNCHANGED) ── */
  const [email,      setEmail]      = useState("");
  const [password,   setPassword]   = useState("");
  const [showPw,     setShowPw]     = useState(false);
  const [rememberMe, setRememberMe] = useState(false);
  const [loading,    setLoading]    = useState(false);
  const [error,      setError]      = useState("");
  const navigate = useNavigate();

  useEffect(() => {
    const saved = localStorage.getItem("rememberedEmail");
    if (saved) { setEmail(saved); setRememberMe(true); }
  }, []);

  /* ── Login handler (UNCHANGED) ── */
  const login = async () => {
    if (!email || !password) { setError("Please enter your email and password."); return; }
    setError(""); setLoading(true);
    try {
      const res = await axios.post(`${API.auth}/login`, {
        emailOrPhone: email, password, rememberMe,
      });
      localStorage.setItem("token", res.data.token);
      rememberMe
        ? localStorage.setItem("rememberedEmail", email)
        : localStorage.removeItem("rememberedEmail");
      navigate("/dashboard");
    } catch (err) {
      setError(err.response?.data?.error || err.response?.data?.message || "Invalid credentials.");
    } finally { setLoading(false); }
  };

  /* ── Render ── */
  return (
    <div style={{
      display: "flex", minHeight: "100vh",
      background: C.bg,
      fontFamily: "'Inter',system-ui,sans-serif",
      position: "relative", overflow: "hidden",
    }}>

      {/* ── Ambient background glow ── */}
      <div style={{ position:"fixed", inset:0, pointerEvents:"none", zIndex:0 }}>
        <div style={{
          position:"absolute", width:700, height:700, borderRadius:"50%",
          top:-200, left:-200,
          background:"radial-gradient(circle,rgba(255,77,109,0.07) 0%,transparent 65%)",
        }}/>
        <div style={{
          position:"absolute", width:500, height:500, borderRadius:"50%",
          bottom:-100, left:"30%",
          background:"radial-gradient(circle,rgba(167,139,250,0.06) 0%,transparent 65%)",
        }}/>
        <div style={{
          position:"absolute", width:400, height:400, borderRadius:"50%",
          top:"20%", right:-80,
          background:"radial-gradient(circle,rgba(96,165,250,0.05) 0%,transparent 65%)",
        }}/>
      </div>

      {/* ════════════════════════════════════════════════
          LEFT — Branding + Features
      ════════════════════════════════════════════════ */}
      <div style={{
        flex: 1,
        display: "flex", flexDirection: "column", justifyContent: "center",
        padding: "60px 56px",
        position: "relative", zIndex: 1,
        borderRight: `1px solid ${C.border}`,
        background: "linear-gradient(160deg,#0a0b15 0%,#080910 100%)",
        // Hide on very narrow screens
        minWidth: 0,
      }}>

        {/* Logo */}
        <div style={{ display:"flex", alignItems:"center", gap:10, marginBottom:48 }}>
          <div style={{
            width:38, height:38, borderRadius:11,
            background:"linear-gradient(135deg,#ff4d6d,#ff7043)",
            display:"flex", alignItems:"center", justifyContent:"center",
            fontFamily:"'Outfit',sans-serif", fontSize:18, fontWeight:900, color:"#fff",
            boxShadow:"0 4px 16px rgba(255,77,109,0.42)",
          }}>F</div>
          <span style={{
            fontFamily:"'Outfit',sans-serif", fontWeight:800,
            fontSize:18, color:"#fff", letterSpacing:"-0.02em",
          }}>Finance Kit</span>
          <span style={{
            fontSize:10, fontWeight:700, color:"#a78bfa", letterSpacing:"0.08em",
            textTransform:"uppercase", padding:"3px 8px",
            background:"rgba(167,139,250,0.12)", border:"1px solid rgba(167,139,250,0.25)",
            borderRadius:99, marginLeft:4,
          }}>AI</span>
        </div>

        {/* Headline */}
        <h1 style={{
          fontFamily:"'Outfit',sans-serif", fontSize:42, fontWeight:900,
          lineHeight:1.12, letterSpacing:"-0.04em", color:"#fff",
          marginBottom:16, maxWidth:460,
        }}>
          Take Control of Your<br />
          <span style={{
            background:"linear-gradient(90deg,#ff4d6d,#a78bfa)",
            WebkitBackgroundClip:"text", WebkitTextFillColor:"transparent",
            backgroundClip:"text",
          }}>Financial Future</span>
        </h1>

        <p style={{
          fontSize:15, color:C.muted, lineHeight:1.8,
          maxWidth:400, marginBottom:48,
        }}>
          Track income, analyze spending, upload bank statements, and receive
          AI-powered financial insights from a single intelligent platform.
        </p>

        {/* Feature grid */}
        <div style={{
          display:"grid",
          gridTemplateColumns:"1fr 1fr",
          gap:12,
          marginBottom:40,
        }}>
          {FEATURES.map(({ icon, title, desc, accent }) => (
            <div key={title} style={{
              padding:"16px 18px", borderRadius:16,
              background:"rgba(255,255,255,0.03)",
              border:"1px solid rgba(255,255,255,0.07)",
              transition:"all 0.2s ease",
              cursor:"default",
            }}
              onMouseEnter={e => {
                e.currentTarget.style.background = `${accent}0d`;
                e.currentTarget.style.borderColor = `${accent}30`;
                e.currentTarget.style.transform = "translateY(-2px)";
              }}
              onMouseLeave={e => {
                e.currentTarget.style.background = "rgba(255,255,255,0.03)";
                e.currentTarget.style.borderColor = "rgba(255,255,255,0.07)";
                e.currentTarget.style.transform = "none";
              }}
            >
              <div style={{ fontSize:22, marginBottom:8 }}>{icon}</div>
              <div style={{
                fontSize:13, fontWeight:700, color:"#fff",
                fontFamily:"'Outfit',sans-serif", marginBottom:5, lineHeight:1.3,
              }}>{title}</div>
              <div style={{ fontSize:12, color:C.dim, lineHeight:1.6 }}>{desc}</div>
            </div>
          ))}
        </div>

        {/* Trust badges */}
        <div style={{ display:"flex", gap:20, flexWrap:"wrap" }}>
          {TRUST.map(({ icon, label }) => (
            <div key={label} style={{
              display:"flex", alignItems:"center", gap:7,
              padding:"7px 14px", borderRadius:99,
              background:"rgba(255,255,255,0.04)",
              border:"1px solid rgba(255,255,255,0.08)",
            }}>
              <span style={{ fontSize:14 }}>{icon}</span>
              <span style={{ fontSize:12, fontWeight:600, color:C.dim }}>{label}</span>
            </div>
          ))}
        </div>
      </div>

      {/* ════════════════════════════════════════════════
          RIGHT — Login card
      ════════════════════════════════════════════════ */}
      <div style={{
        width: 480, flexShrink: 0,
        display:"flex", alignItems:"center", justifyContent:"center",
        padding:"40px 44px",
        position:"relative", zIndex:1,
        background:"rgba(8,9,15,0.7)",
        backdropFilter:"blur(20px)", WebkitBackdropFilter:"blur(20px)",
        borderLeft:`1px solid ${C.border}`,
      }}>

        <div style={{ width:"100%" }} className="anim-fadeup">

          {/* Card header */}
          <div style={{ marginBottom:32 }}>
            <div style={{
              display:"inline-flex", alignItems:"center", gap:7,
              padding:"5px 12px", borderRadius:99, marginBottom:20,
              background:"rgba(255,77,109,0.1)", border:"1px solid rgba(255,77,109,0.25)",
            }}>
              <span style={{ fontSize:12 }}>✨</span>
              <span style={{ fontSize:11, fontWeight:700, color:"#ff8a80", letterSpacing:"0.07em", textTransform:"uppercase" }}>
                Finance Kit
              </span>
            </div>
            <h2 style={{
              fontFamily:"'Outfit',sans-serif", fontSize:28, fontWeight:800,
              color:"#fff", letterSpacing:"-0.03em", margin:"0 0 8px",
            }}>Welcome back</h2>
            <p style={{ fontSize:14, color:C.muted }}>
              Sign in to access your financial dashboard
            </p>
          </div>

          {/* Error */}
          {error && (
            <div className="fk-alert fk-alert-error anim-fadein" style={{ marginBottom:20 }}>
              {error}
            </div>
          )}

          {/* Email */}
          <div style={{ marginBottom:16 }}>
            <label className="fk-label" htmlFor="login-email">Email or Phone</label>
            <input
              id="login-email"
              className="fk-input"
              placeholder="you@example.com"
              value={email}
              onChange={e => setEmail(e.target.value)}
              onKeyDown={e => e.key === "Enter" && login()}
              autoComplete="email"
            />
          </div>

          {/* Password */}
          <div style={{ marginBottom:20 }}>
            <label className="fk-label" htmlFor="login-password">Password</label>
            <div style={{ position:"relative" }}>
              <input
                id="login-password"
                className="fk-input"
                type={showPw ? "text" : "password"}
                placeholder="Your password"
                value={password}
                onChange={e => setPassword(e.target.value)}
                onKeyDown={e => e.key === "Enter" && login()}
                autoComplete="current-password"
                style={{ paddingRight:46 }}
              />
              <button
                type="button"
                onClick={() => setShowPw(p => !p)}
                aria-label={showPw ? "Hide password" : "Show password"}
                style={{
                  position:"absolute", right:13, top:"50%", transform:"translateY(-50%)",
                  background:"none", border:"none", color:C.dim,
                  cursor:"pointer", fontSize:16, padding:4,
                  transition:"color 0.15s",
                }}
                onMouseEnter={e => e.currentTarget.style.color = "#fff"}
                onMouseLeave={e => e.currentTarget.style.color = C.dim}
              >
                {showPw ? "🙈" : "👁"}
              </button>
            </div>
          </div>

          {/* Remember me + register link */}
          <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center", marginBottom:28 }}>
            <label style={{ display:"flex", alignItems:"center", gap:8, fontSize:13, color:C.muted, cursor:"pointer" }}>
              <input
                type="checkbox"
                checked={rememberMe}
                onChange={e => setRememberMe(e.target.checked)}
                style={{ accentColor:C.accent, width:15, height:15 }}
              />
              Remember me
            </label>
            <Link to="/register" style={{ fontSize:13, color:C.accent, textDecoration:"none", fontWeight:600 }}>
              Create account →
            </Link>
          </div>

          {/* Sign in button */}
          <button
            onClick={login}
            disabled={loading}
            style={{
              width:"100%", padding:"15px", borderRadius:14,
              border:"none", cursor: loading ? "not-allowed" : "pointer",
              fontSize:15, fontWeight:700, color:"#fff",
              fontFamily:"'Inter',sans-serif",
              background: loading
                ? "rgba(255,77,109,0.5)"
                : "linear-gradient(135deg,#ff4d6d 0%,#e8304f 100%)",
              boxShadow: loading ? "none" : "0 6px 24px rgba(255,77,109,0.38)",
              display:"flex", alignItems:"center", justifyContent:"center", gap:10,
              transition:"all 0.22s ease",
              opacity: loading ? 0.85 : 1,
            }}
            onMouseEnter={e => {
              if (!loading) {
                e.currentTarget.style.transform = "translateY(-2px)";
                e.currentTarget.style.boxShadow = "0 10px 32px rgba(255,77,109,0.52)";
              }
            }}
            onMouseLeave={e => {
              e.currentTarget.style.transform = "none";
              e.currentTarget.style.boxShadow = "0 6px 24px rgba(255,77,109,0.38)";
            }}
          >
            {loading ? (
              <>
                <span className="fk-spinner" style={{ width:16, height:16, borderWidth:2 }} />
                Signing in…
              </>
            ) : (
              <>
                <span>Sign in</span>
                <span style={{ fontSize:16 }}>→</span>
              </>
            )}
          </button>

          {/* Register */}
          <p style={{ textAlign:"center", marginTop:24, fontSize:13, color:C.dim }}>
            No account?{" "}
            <Link to="/register" style={{ color:C.accent, textDecoration:"none", fontWeight:600 }}>
              Register for free
            </Link>
          </p>

          {/* Divider */}
          <div style={{
            marginTop:32, paddingTop:24,
            borderTop:"1px solid rgba(255,255,255,0.06)",
            display:"flex", justifyContent:"center", gap:20, flexWrap:"wrap",
          }}>
            {TRUST.map(({ icon, label }) => (
              <div key={label} style={{
                display:"flex", alignItems:"center", gap:5,
                fontSize:11, color:"#3a3d52", fontWeight:500,
              }}>
                <span style={{ fontSize:12 }}>{icon}</span>
                {label}
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* ── Responsive styles (injected inline for single-file simplicity) ── */}
      <style>{`
        @media (max-width: 900px) {
          .fk-login-left  { display: none !important; }
          .fk-login-right { width: 100% !important; }
        }
        @media (max-width: 480px) {
          .fk-login-right { padding: 28px 20px !important; }
        }
      `}</style>
    </div>
  );
}
