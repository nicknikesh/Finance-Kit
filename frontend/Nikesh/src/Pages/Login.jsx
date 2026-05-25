import { useEffect, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import axios from "axios";

/* ── colour tokens ── */
const C = {
  bg:      "#030305",
  panel:   "#08090f",
  card:    "#10111c",
  border:  "rgba(255,255,255,0.08)",
  accent:  "#ff4d6d",
  text:    "#ffffff",
  muted:   "#a0a3b1",
  dim:     "#5c5f72",
};

export default function Login() {
  const [email,        setEmail]        = useState("");
  const [password,     setPassword]     = useState("");
  const [showPw,       setShowPw]       = useState(false);
  const [rememberMe,   setRememberMe]   = useState(false);
  const [loading,      setLoading]      = useState(false);
  const [error,        setError]        = useState("");
  const navigate = useNavigate();

  useEffect(() => {
    const saved = localStorage.getItem("rememberedEmail");
    if (saved) { setEmail(saved); setRememberMe(true); }
  }, []);

  const login = async () => {
    if (!email || !password) { setError("Please enter your email and password."); return; }
    setError(""); setLoading(true);
    try {
      const res = await axios.post("http://localhost:5000/api/auth/login", {
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

  return (
    <div style={{ display:"flex", minHeight:"100vh", background: C.bg, fontFamily:"'Inter',system-ui,sans-serif" }}>

      {/* ── LEFT branding panel ── */}
      <div style={{
        flex: 1,
        background: "linear-gradient(145deg,#0d0e1c 0%,#0a0b14 100%)",
        borderRight: `1px solid ${C.border}`,
        display:"flex", flexDirection:"column", justifyContent:"center",
        padding:"60px 56px",
        position:"relative", overflow:"hidden",
      }}>
        {/* glow orbs */}
        <div style={{ position:"absolute", width:400, height:400, borderRadius:"50%", top:-100, left:-80,
          background:"radial-gradient(circle,rgba(255,77,109,0.14) 0%,transparent 68%)", pointerEvents:"none" }} />
        <div style={{ position:"absolute", width:260, height:260, borderRadius:"50%", bottom:60, right:-40,
          background:"radial-gradient(circle,rgba(255,77,109,0.07) 0%,transparent 70%)", pointerEvents:"none" }} />

        {/* logo */}
        <div style={{ display:"flex", alignItems:"center", gap:10, marginBottom:52 }}>
          <div style={{
            width:36, height:36, borderRadius:10,
            background:"linear-gradient(135deg,#ff4d6d,#ff7043)",
            display:"flex", alignItems:"center", justifyContent:"center",
            fontFamily:"'Outfit',sans-serif", fontSize:17, fontWeight:900, color:"#fff",
            boxShadow:"0 4px 14px rgba(255,77,109,0.4)",
          }}>F</div>
          <span style={{ fontFamily:"'Outfit',sans-serif", fontWeight:800, fontSize:17, color:"#fff", letterSpacing:"-0.02em" }}>
            Finance Kit
          </span>
        </div>

        {/* headline */}
        <h1 style={{ fontFamily:"'Outfit',sans-serif", fontSize:40, fontWeight:900, lineHeight:1.15,
          letterSpacing:"-0.04em", color:"#fff", marginBottom:14 }}>
          Your money,<br />
          <span style={{ color: C.accent }}>your control.</span>
        </h1>
        <p style={{ fontSize:15, color: C.muted, lineHeight:1.75, maxWidth:320 }}>
          Track income, monitor spending, and understand your financial health — all in one place.
        </p>

        {/* stats */}
        <div style={{ display:"flex", gap:32, marginTop:44 }}>
          {[["10K+","Users"],["₹2Cr+","Tracked"],["99.9%","Uptime"]].map(([val,lbl]) => (
            <div key={lbl}>
              <div style={{ fontFamily:"'Outfit',sans-serif", fontSize:22, fontWeight:800, color:"#fff", letterSpacing:"-0.03em" }}>{val}</div>
              <div style={{ fontSize:12, color: C.dim, marginTop:2, fontWeight:500 }}>{lbl}</div>
            </div>
          ))}
        </div>
      </div>

      {/* ── RIGHT form panel ── */}
      <div style={{
        width:440, flexShrink:0,
        background: C.panel,
        display:"flex", alignItems:"center", justifyContent:"center",
        padding:"40px 44px",
      }}>
        <div style={{ width:"100%" }} className="anim-fadeup">

          <h2 style={{ fontFamily:"'Outfit',sans-serif", fontSize:24, fontWeight:800,
            color:"#fff", letterSpacing:"-0.03em", marginBottom:6 }}>Welcome back</h2>
          <p style={{ fontSize:14, color: C.muted, marginBottom:28 }}>Sign in to your account to continue</p>

          {error && (
            <div className="fk-alert fk-alert-error anim-fadein" style={{ marginBottom:18 }}>{error}</div>
          )}

          {/* Email */}
          <div style={{ marginBottom:14 }}>
            <label className="fk-label">Email or Phone</label>
            <input className="fk-input" placeholder="you@example.com"
              value={email} onChange={e => setEmail(e.target.value)}
              onKeyDown={e => e.key==="Enter" && login()} autoComplete="email" />
          </div>

          {/* Password */}
          <div style={{ marginBottom:18 }}>
            <label className="fk-label">Password</label>
            <div style={{ position:"relative" }}>
              <input className="fk-input"
                type={showPw ? "text" : "password"}
                placeholder="Your password"
                value={password}
                onChange={e => setPassword(e.target.value)}
                onKeyDown={e => e.key==="Enter" && login()}
                autoComplete="current-password"
                style={{ paddingRight:46 }}
              />
              <button type="button" onClick={() => setShowPw(p => !p)}
                style={{ position:"absolute", right:13, top:"50%", transform:"translateY(-50%)",
                  background:"none", border:"none", color: C.dim, cursor:"pointer", fontSize:16, padding:4 }}>
                {showPw ? "🙈" : "👁"}
              </button>
            </div>
          </div>

          {/* Remember + link */}
          <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center", marginBottom:24 }}>
            <label style={{ display:"flex", alignItems:"center", gap:8, fontSize:13, color: C.muted, cursor:"pointer" }}>
              <input type="checkbox" checked={rememberMe} onChange={e => setRememberMe(e.target.checked)}
                style={{ accentColor: C.accent, width:15, height:15 }} />
              Remember me
            </label>
            <Link to="/register" style={{ fontSize:13, color: C.accent, textDecoration:"none", fontWeight:600 }}>
              Create account →
            </Link>
          </div>

          {/* Submit */}
          <button className="fk-btn fk-btn-primary" onClick={login} disabled={loading}
            style={{ width:"100%", padding:"14px", fontSize:15, borderRadius:13 }}>
            {loading ? <><span className="fk-spinner" /> Signing in…</> : "Sign in"}
          </button>

          <p style={{ textAlign:"center", marginTop:22, fontSize:13, color: C.dim }}>
            No account?{" "}
            <Link to="/register" style={{ color: C.accent, textDecoration:"none", fontWeight:600 }}>
              Register for free
            </Link>
          </p>
        </div>
      </div>
    </div>
  );
}
