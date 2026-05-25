import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import axios from "axios";

const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

const C = {
  bg:"#030305", panel:"#08090f", border:"rgba(255,255,255,0.08)",
  accent:"#ff4d6d", text:"#fff", muted:"#a0a3b1", dim:"#5c5f72",
};

export default function Register() {
  const [form, setForm] = useState({ username:"", email:"", phone:"", password:"", confirmPassword:"" });
  const [error, setError]     = useState("");
  const [success, setSuccess] = useState("");
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();

  const set = k => e => setForm(f => ({ ...f, [k]: e.target.value }));

  const register = async () => {
    setError(""); setSuccess("");
    if (!form.username.trim())               return setError("Please enter a username.");
    if (!emailRegex.test(form.email))        return setError("Please enter a valid email.");
    if (!form.phone.trim())                  return setError("Please enter a phone number.");
    if (form.password.length < 6)            return setError("Password must be at least 6 characters.");
    if (form.password !== form.confirmPassword) return setError("Passwords do not match.");

    setLoading(true);
    try {
      await axios.post("http://localhost:5000/api/auth/register", {
        username: form.username, email: form.email,
        phoneNumber: form.phone, password: form.password, confirmPassword: form.confirmPassword,
      });
      setSuccess("Account created! Redirecting…");
      setTimeout(() => navigate("/"), 1500);
    } catch (err) {
      setError(err.response?.data?.error || err.response?.data?.message || "Registration failed.");
    } finally { setLoading(false); }
  };

  const FIELDS = [
    { k:"username",        lbl:"Username",          ph:"Your name",           t:"text" },
    { k:"email",           lbl:"Email",              ph:"you@example.com",     t:"email" },
    { k:"phone",           lbl:"Phone Number",       ph:"+91 98765 43210",     t:"tel" },
    { k:"password",        lbl:"Password",           ph:"Min. 6 characters",   t:"password" },
    { k:"confirmPassword", lbl:"Confirm Password",   ph:"Repeat password",     t:"password" },
  ];

  return (
    <div style={{ display:"flex", minHeight:"100vh", background: C.bg, fontFamily:"'Inter',system-ui,sans-serif" }}>

      {/* Left branding */}
      <div style={{
        flex:1, background:"linear-gradient(145deg,#0d0e1c 0%,#0a0b14 100%)",
        borderRight:`1px solid ${C.border}`,
        display:"flex", flexDirection:"column", justifyContent:"center",
        padding:"60px 56px", position:"relative", overflow:"hidden",
      }}>
        <div style={{ position:"absolute", width:360, height:360, borderRadius:"50%", top:-80, left:-60,
          background:"radial-gradient(circle,rgba(255,77,109,0.13) 0%,transparent 68%)", pointerEvents:"none" }} />

        {/* logo */}
        <div style={{ display:"flex", alignItems:"center", gap:10, marginBottom:52 }}>
          <div style={{ width:36, height:36, borderRadius:10,
            background:"linear-gradient(135deg,#ff4d6d,#ff7043)",
            display:"flex", alignItems:"center", justifyContent:"center",
            fontFamily:"'Outfit',sans-serif", fontSize:17, fontWeight:900, color:"#fff",
            boxShadow:"0 4px 14px rgba(255,77,109,0.4)" }}>F</div>
          <span style={{ fontFamily:"'Outfit',sans-serif", fontWeight:800, fontSize:17, color:"#fff", letterSpacing:"-0.02em" }}>Finance Kit</span>
        </div>

        <h1 style={{ fontFamily:"'Outfit',sans-serif", fontSize:36, fontWeight:900, lineHeight:1.2,
          letterSpacing:"-0.04em", color:"#fff", marginBottom:14 }}>
          Start your<br /><span style={{ color: C.accent }}>financial journey.</span>
        </h1>
        <p style={{ fontSize:15, color: C.muted, lineHeight:1.75, maxWidth:300 }}>
          Create a free account and take control of your money today.
        </p>

        <div style={{ display:"flex", flexDirection:"column", gap:12, marginTop:36 }}>
          {["Track income & expenses","Visualize spending trends","Export your history as CSV"].map(t => (
            <div key={t} style={{ display:"flex", alignItems:"center", gap:10, fontSize:14, color: C.muted }}>
              <span style={{ color: C.accent, fontWeight:700, fontSize:16 }}>✓</span> {t}
            </div>
          ))}
        </div>
      </div>

      {/* Right form */}
      <div style={{
        width:480, flexShrink:0,
        background: C.panel,
        display:"flex", alignItems:"center", justifyContent:"center",
        padding:"40px 44px", overflowY:"auto",
      }}>
        <div style={{ width:"100%" }} className="anim-fadeup">

          <h2 style={{ fontFamily:"'Outfit',sans-serif", fontSize:22, fontWeight:800,
            color:"#fff", letterSpacing:"-0.03em", marginBottom:6 }}>Create an account</h2>
          <p style={{ fontSize:14, color: C.muted, marginBottom:26 }}>
            Already have one?{" "}
            <Link to="/" style={{ color: C.accent, textDecoration:"none", fontWeight:600 }}>Sign in →</Link>
          </p>

          {error   && <div className="fk-alert fk-alert-error anim-fadein"   style={{ marginBottom:18 }}>{error}</div>}
          {success && <div className="fk-alert fk-alert-success anim-fadein" style={{ marginBottom:18 }}>{success}</div>}

          <div style={{ display:"grid", gap:12 }}>
            {FIELDS.map(({ k, lbl, ph, t }) => (
              <div key={k}>
                <label className="fk-label">{lbl}</label>
                <input className="fk-input" type={t} placeholder={ph}
                  value={form[k]} onChange={set(k)}
                  onKeyDown={e => e.key==="Enter" && register()} />
              </div>
            ))}
          </div>

          <button className="fk-btn fk-btn-primary" onClick={register} disabled={loading}
            style={{ width:"100%", padding:"14px", fontSize:15, borderRadius:13, marginTop:20 }}>
            {loading ? <><span className="fk-spinner" /> Creating account…</> : "Create account"}
          </button>

          <p style={{ textAlign:"center", marginTop:18, fontSize:12, color: C.dim, lineHeight:1.7 }}>
            By registering you agree to our{" "}
            <span style={{ color: C.muted }}>Terms of Service</span> and{" "}
            <span style={{ color: C.muted }}>Privacy Policy</span>.
          </p>
        </div>
      </div>
    </div>
  );
}