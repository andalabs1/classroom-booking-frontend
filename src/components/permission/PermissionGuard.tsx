import type { ReactNode } from "react";
import { Navigate, useLocation } from "react-router-dom";
import { useAuth } from "../../stores/authStore";
import type { Role } from "../../types";
export function PermissionGuard({
  children,
  role,
}: {
  children: ReactNode;
  role?: Role;
}) {
  const user = useAuth((s) => s.user);
  const location = useLocation();
  if (!user)
    return (
      <Navigate
        to={role === "ADMIN" ? "/admin/login" : "/login"}
        state={{ from: location.pathname + location.search }}
        replace
      />
    );
  if (role && user.role !== role) return <Navigate to="/403" replace />;
  return <>{children}</>;
}
