import { Outlet } from "react-router-dom";
import Navbar from "./Navbar";

export default function ProtectedLayout() {
  return (
    <div style={{ minHeight:"100vh", background:"#030305", color:"#fff", fontFamily:"'Inter',system-ui,sans-serif" }}>
      <Navbar />
      <main style={{ maxWidth:1280, margin:"0 auto", padding:"36px 28px 64px" }}>
        <Outlet />
      </main>
    </div>
  );
}
