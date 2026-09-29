import { useEffect, useState } from "react";
import { Navigate, useLocation } from "react-router-dom";
import { getCurrentUser } from "../services/authService";
import type { Role } from "../types";

interface Props {
  children: React.ReactNode;
}

export default function AdminProtectedRoute({ children }: Props) {
  const location = useLocation();

  const [role, setRole] = useState<Role | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const token = localStorage.getItem("accessToken");
    if (!token) {
      setLoading(false);
      return;
    }

    getCurrentUser()
      .then((user) => {
        setRole(user.role);
        localStorage.setItem("bloodbridge_user", JSON.stringify(user));
      })
      .catch(() => {
        localStorage.removeItem("accessToken");
        localStorage.removeItem("bloodbridge_user");
        setRole(null);
      })
      .finally(() => {
        setLoading(false);
      });
  }, [location.pathname]);

  if (loading) {
    return (
      <div className="min-h-screen bb-network-bg flex items-center justify-center text-bb-muted text-sm font-medium">
        Verifying administrator authorization...
      </div>
    );
  }

  if (!role || role !== "ADMIN") {
    return <Navigate to="/admin/login" replace state={{ from: location.pathname }} />;
  }

  return <>{children}</>;
}
