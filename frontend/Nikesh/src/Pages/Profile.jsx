import { useEffect, useState } from "react";
import axios from "axios";
import { API } from "../utils/api";

export default function Profile() {
  const [profile,   setProfile]   = useState({ username:"", email:"", phone:"" });
  const [passwords, setPasswords] = useState({ current:"", newPassword:"", confirmPassword:"" });
  const [msg,       setMsg]       = useState({ text:"", type:"" });
  const [savingP,   setSavingP]   = useState(false);
  const [savingPw,  setSavingPw]  = useState(false);
  const token = localStorage.getItem("token");

  const flash = (text,type="info")=>{ setMsg({text,type}); setTimeout(()=>setMsg({text:"",type:""}),4000); };

  useEffect(()=>{
    (async()=>{
      try{
        const r=await axios.get(`${API.auth}/me`,{ headers:{ authorization:`Bearer ${token}` } });
        setProfile({ username:r.data.username||r.data.name||"", email:r.data.email||"", phone:r.data.phoneNumber||r.data.phone||"" });
      }catch{ const s=JSON.parse(localStorage.getItem("userProfile")||"null"); if(s) setProfile(s); }
    })();
  },[]);

  const saveProfile=async()=>{
    setSavingP(true);
    try{
      await axios.put(`${API.auth}/me`,
        { username:profile.username, email:profile.email, phoneNumber:profile.phone },
        { headers:{ authorization:`Bearer ${token}` } });
      localStorage.setItem("userProfile",JSON.stringify(profile));
      flash("Profile updated.","success");
    }catch(e){ flash(e.response?.data?.error||"Unable to update profile.","error"); }
    finally{ setSavingP(false); }
  };

  const changePw=async()=>{
    if(passwords.newPassword.length<6) return flash("New password must be at least 6 characters.","error");
    if(passwords.newPassword!==passwords.confirmPassword) return flash("Passwords do not match.","error");
    setSavingPw(true);
    try{
      await axios.put(`${API.auth}/change-password`,
        { currentPassword:passwords.current, newPassword:passwords.newPassword, confirmPassword:passwords.confirmPassword },
        { headers:{ authorization:`Bearer ${token}` } });
      flash("Password changed.","success");
      setPasswords({ current:"", newPassword:"", confirmPassword:"" });
    }catch(e){ flash(e.response?.data?.error||"Unable to change password.","error"); }
    finally{ setSavingPw(false); }
  };

  const initials = profile.username ? profile.username.slice(0,2).toUpperCase() : "??";

  return (
    <div style={{ fontFamily:"'Inter',system-ui,sans-serif" }} className="anim-fadeup">
      <div style={{ marginBottom:28 }}>
        <h1 style={{ fontFamily:"'Outfit',sans-serif", fontSize:26, fontWeight:800, color:"#fff", letterSpacing:"-0.03em", margin:0 }}>Profile</h1>
        <p style={{ color:"#a0a3b1", fontSize:14, marginTop:6 }}>Manage your account details and security</p>
      </div>

      {msg.text && <div className={`fk-alert fk-alert-${msg.type} anim-fadein`} style={{ marginBottom:20 }}>{msg.text}</div>}

      <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:18, alignItems:"start" }}>

        {/* Account */}
        <div className="fk-card">
          {/* Avatar */}
          <div style={{ display:"flex", alignItems:"center", gap:14, marginBottom:22, paddingBottom:18, borderBottom:"1px solid rgba(255,255,255,0.07)" }}>
            <div style={{
              width:52, height:52, borderRadius:14, flexShrink:0,
              background:"linear-gradient(135deg,#ff4d6d,#ff7043)",
              display:"flex", alignItems:"center", justifyContent:"center",
              fontFamily:"'Outfit',sans-serif", fontWeight:800, fontSize:18, color:"#fff",
              boxShadow:"0 4px 14px rgba(255,77,109,0.3)",
            }}>{initials}</div>
            <div>
              <div style={{ fontWeight:700, fontSize:15, color:"#fff" }}>{profile.username||"Your Name"}</div>
              <div style={{ fontSize:13, color:"#5c5f72", marginTop:3 }}>{profile.email||"—"}</div>
            </div>
          </div>

          <h2 style={{ fontSize:15, fontWeight:700, color:"#fff", margin:"0 0 14px", fontFamily:"'Outfit',sans-serif" }}>Account details</h2>
          <div style={{ display:"grid", gap:12 }}>
            {[
              { k:"username", l:"Username",    ph:"Your name",       t:"text" },
              { k:"email",    l:"Email",        ph:"you@example.com", t:"email" },
              { k:"phone",    l:"Phone",        ph:"+91 98765 43210", t:"tel" },
            ].map(({ k,l,ph,t })=>(
              <div key={k}>
                <label className="fk-label">{l}</label>
                <input className="fk-input" type={t} placeholder={ph}
                  value={profile[k]} onChange={e=>setProfile(p=>({...p,[k]:e.target.value}))} />
              </div>
            ))}
            <button className="fk-btn fk-btn-primary" onClick={saveProfile} disabled={savingP}
              style={{ marginTop:4, padding:"13px", fontSize:14 }}>
              {savingP?<><span className="fk-spinner"/>Saving…</>:"Save changes"}
            </button>
          </div>
        </div>

        {/* Password */}
        <div className="fk-card">
          <div style={{ display:"flex", alignItems:"center", gap:12, marginBottom:20, paddingBottom:16, borderBottom:"1px solid rgba(255,255,255,0.07)" }}>
            <div style={{
              width:40, height:40, borderRadius:11,
              background:"rgba(255,77,109,0.12)", border:"1px solid rgba(255,77,109,0.22)",
              display:"flex", alignItems:"center", justifyContent:"center", fontSize:18,
            }}>🔒</div>
            <div>
              <h2 style={{ fontSize:15, fontWeight:700, color:"#fff", margin:0, fontFamily:"'Outfit',sans-serif" }}>Change password</h2>
              <p style={{ fontSize:12, color:"#5c5f72", marginTop:2 }}>Update your account password</p>
            </div>
          </div>

          <div style={{ display:"grid", gap:12 }}>
            {[
              { k:"current",         l:"Current password",  ph:"Your current password" },
              { k:"newPassword",     l:"New password",       ph:"Min. 6 characters" },
              { k:"confirmPassword", l:"Confirm password",   ph:"Repeat new password" },
            ].map(({ k,l,ph })=>(
              <div key={k}>
                <label className="fk-label">{l}</label>
                <input className="fk-input" type="password" placeholder={ph}
                  value={passwords[k]} onChange={e=>setPasswords(p=>({...p,[k]:e.target.value}))} />
              </div>
            ))}
            <div style={{ padding:"11px 14px", borderRadius:11, background:"#0d0e17",
              border:"1px solid rgba(255,255,255,0.06)", fontSize:12, color:"#3a3d52", lineHeight:1.6 }}>
              Password must be at least 6 characters long.
            </div>
            <button className="fk-btn fk-btn-primary" onClick={changePw} disabled={savingPw}
              style={{ padding:"13px", fontSize:14 }}>
              {savingPw?<><span className="fk-spinner"/>Updating…</>:"Change password"}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
