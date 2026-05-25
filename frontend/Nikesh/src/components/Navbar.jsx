import { NavLink, useNavigate } from "react-router-dom";

const LINKS = [
  { to:"/dashboard",    label:"Dashboard" },
  { to:"/transactions", label:"Transactions" },
  { to:"/history",      label:"History" },
  { to:"/profile",      label:"Profile" },
  { to:"/settings",     label:"Settings" },
];

export default function Navbar() {
  const navigate = useNavigate();
  const logout = () => { localStorage.removeItem("token"); navigate("/"); };

  return (
    <header style={{
      position:"sticky", top:0, zIndex:50, width:"100%",
      background:"rgba(3,3,5,0.88)",
      backdropFilter:"blur(18px)", WebkitBackdropFilter:"blur(18px)",
      borderBottom:"1px solid rgba(255,255,255,0.07)",
      fontFamily:"'Inter',system-ui,sans-serif",
    }}>
      <div style={{
        maxWidth:1280, margin:"0 auto", padding:"0 28px",
        height:62, display:"flex", alignItems:"center", justifyContent:"space-between", gap:16,
      }}>

        {/* Logo */}
        <div style={{ display:"flex", alignItems:"center", gap:10, flexShrink:0 }}>
          <div style={{
            width:32, height:32, borderRadius:8,
            background:"linear-gradient(135deg,#ff4d6d,#ff7043)",
            display:"flex", alignItems:"center", justifyContent:"center",
            fontFamily:"'Outfit',sans-serif", fontSize:15, fontWeight:900, color:"#fff",
            boxShadow:"0 2px 10px rgba(255,77,109,0.38)",
          }}>F</div>
          <span style={{ fontFamily:"'Outfit',sans-serif", fontWeight:800, fontSize:16,
            color:"#fff", letterSpacing:"-0.02em" }}>Finance Kit</span>
        </div>

        {/* Nav */}
        <nav style={{ display:"flex", alignItems:"center", gap:2 }}>
          {LINKS.map(({ to, label }) => (
            <NavLink key={to} to={to} style={({ isActive }) => ({
              padding:"7px 14px", borderRadius:9, textDecoration:"none",
              fontSize:13, fontWeight:600, letterSpacing:"0.01em",
              color:          isActive ? "#fff" : "#a0a3b1",
              background:     isActive ? "rgba(255,77,109,0.16)" : "transparent",
              border:         isActive ? "1px solid rgba(255,77,109,0.3)" : "1px solid transparent",
              transition:"all 0.18s ease",
            })}>
              {label}
            </NavLink>
          ))}
        </nav>

        {/* Logout */}
        <button className="fk-btn fk-btn-primary"
          onClick={logout}
          style={{ padding:"8px 18px", fontSize:13, flexShrink:0 }}>
          Sign out
        </button>
      </div>
    </header>
  );
}
