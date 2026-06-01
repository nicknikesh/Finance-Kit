import { lazy, Suspense } from "react";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { ToastProvider } from "./components/Toast";
import ErrorBoundary from "./components/ErrorBoundary";
import ProtectedRoute from "./ProtectedRoute";
import ProtectedLayout from "./components/ProtectedLayout";

// ── Code-split all pages (loaded only when visited) ───────────────────────────
const Login            = lazy(() => import("./Pages/Login"));
const Register         = lazy(() => import("./Pages/Register"));
const Dashboard        = lazy(() => import("./Pages/Dashboard"));
const Transactions     = lazy(() => import("./Pages/Transactions"));
const Profile          = lazy(() => import("./Pages/Profile"));
const Settings         = lazy(() => import("./Pages/Settings"));
const UploadHistory    = lazy(() => import("./Pages/UploadHistory"));
const Budget           = lazy(() => import("./Pages/Budget"));
const RecurringPayments = lazy(() => import("./components/RecurringPayments"));

// ── Page-level loading skeleton ───────────────────────────────────────────────
function PageSkeleton() {
  return (
    <div style={{ padding: "40px 0" }}>
      {/* Header skeleton */}
      <div style={{
        height: 32, width: "45%", borderRadius: 10, marginBottom: 10,
        background: "linear-gradient(90deg,rgba(255,255,255,0.04) 25%,rgba(255,255,255,0.08) 50%,rgba(255,255,255,0.04) 75%)",
        backgroundSize: "200% 100%",
        animation: "fk-shimmer 1.5s infinite",
      }}/>
      <div style={{
        height: 16, width: "30%", borderRadius: 8, marginBottom: 32,
        background: "linear-gradient(90deg,rgba(255,255,255,0.03) 25%,rgba(255,255,255,0.06) 50%,rgba(255,255,255,0.03) 75%)",
        backgroundSize: "200% 100%",
        animation: "fk-shimmer 1.5s infinite 0.1s",
      }}/>
      {/* Card skeletons */}
      {[1,2,3].map(i => (
        <div key={i} style={{
          height: 90, borderRadius: 18, marginBottom: 14,
          background: "linear-gradient(90deg,rgba(255,255,255,0.04) 25%,rgba(255,255,255,0.07) 50%,rgba(255,255,255,0.04) 75%)",
          backgroundSize: "200% 100%",
          animation: `fk-shimmer 1.5s infinite ${i * 0.12}s`,
        }}/>
      ))}
    </div>
  );
}

export default function App() {
  return (
    <BrowserRouter>
      <ErrorBoundary>
        <ToastProvider>
          <Suspense fallback={<div style={{ minHeight:"100vh",background:"#030305" }}/>}>
            <Routes>
              <Route path="/"         element={<Login />} />
              <Route path="/register" element={<Register />} />

              <Route element={<ProtectedRoute />}>
                <Route element={<ProtectedLayout />}>
                  <Route path="/dashboard"   element={<Suspense fallback={<PageSkeleton />}><Dashboard /></Suspense>} />
                  <Route path="/transactions" element={<Suspense fallback={<PageSkeleton />}><Transactions /></Suspense>} />
                  <Route path="/history"     element={<Suspense fallback={<PageSkeleton />}><UploadHistory /></Suspense>} />
                  <Route path="/budget"      element={<Suspense fallback={<PageSkeleton />}><Budget /></Suspense>} />
                  <Route path="/recurring"   element={<Suspense fallback={<PageSkeleton />}><RecurringPayments /></Suspense>} />
                  <Route path="/profile"     element={<Suspense fallback={<PageSkeleton />}><Profile /></Suspense>} />
                  <Route path="/settings"    element={<Suspense fallback={<PageSkeleton />}><Settings /></Suspense>} />
                </Route>
              </Route>

              <Route path="*" element={<Navigate to="/" replace />} />
            </Routes>
          </Suspense>
        </ToastProvider>
      </ErrorBoundary>
    </BrowserRouter>
  );
}