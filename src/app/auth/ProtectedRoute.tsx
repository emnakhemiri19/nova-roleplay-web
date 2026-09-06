import { Navigate } from "react-router-dom";
import { useAuth } from "./AuthContext";

export function ProtectedRoute({
  children,
  requireRoles,
}: {
  children: React.ReactNode;
  requireRoles?: string[];
}) {
  const { user, loading } = useAuth();

  if (loading) return <div className="p-6">Loading...</div>;
  if (!user) return <Navigate to="/login" replace />;

  if (requireRoles?.length) {
    const ok = requireRoles.some((r) => user.roles.includes(r));
    if (!ok) return <Navigate to="/dashboard" replace />;
  }

  return <>{children}</>;
}