import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import Login from "./Pages/Login";
import Register from "./Pages/Register";
import Dashboard from "./Pages/Dashboard";
import Transactions from "./Pages/Transactions";
import Profile from "./Pages/Profile";
import Settings from "./Pages/Settings";
import UploadHistory from "./Pages/UploadHistory";
import ProtectedRoute from "./ProtectedRoute";
import ProtectedLayout from "./components/ProtectedLayout";

export default function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<Login />} />
        <Route path="/register" element={<Register />} />
        <Route element={<ProtectedRoute />}>
          <Route element={<ProtectedLayout />}>
            <Route path="/dashboard"  element={<Dashboard />} />
            <Route path="/transactions" element={<Transactions />} />
            <Route path="/history"     element={<UploadHistory />} />
            <Route path="/profile"     element={<Profile />} />
            <Route path="/settings"    element={<Settings />} />
          </Route>
        </Route>
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </BrowserRouter>
  );
}