import { Navigate, Outlet, useLocation } from "react-router-dom";
import { useAuth } from "../lib/auth.jsx";
import { hasRole, isAdmin } from "../lib/theme.js";

export default function ProtectedLayout({ requiredRole }) {
  const { isAuthReady, isAuthenticated, user } = useAuth();
  const location = useLocation();

  if (!isAuthReady) {
    return <div className="route-page route-page--centered" style={{ color: "rgba(255,255,255,0.7)", padding: "2rem", textAlign: "center" }}>Loading…</div>;
  }
  if (!isAuthenticated) {
    return <Navigate to="/sign-in" replace state={{ from: "" + location.pathname + location.search }} />;
  }
  if (
    (requiredRole === "Owner" && !user?.isSystemOwner) ||
    (requiredRole === "Admin" && !isAdmin(user)) ||
    (requiredRole && requiredRole !== "Owner" && requiredRole !== "Admin" && !hasRole(user?.role, requiredRole))
  ) {
    return <Navigate to="/profile" replace />;
  }
  return <Outlet />;
}
