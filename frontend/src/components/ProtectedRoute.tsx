import { useEffect, useState } from "react";
import { Navigate, useLocation, useNavigate } from "react-router-dom";
import { getCurrentUser } from "../services/authService";
import type { Role } from "../types";

interface Props {
  allowedRole: Role;
  children: React.ReactNode;
}

function dashboardPath(role: Role) {
  return role === "BLOOD_BANK"
    ? "/dashboard/blood-bank"
    : `/dashboard/${role.toLowerCase()}`;
}

export default function ProtectedRoute({ allowedRole, children }: Props) {
  const location = useLocation();
  const navigate = useNavigate();
  const [role, setRole] = useState<Role | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!localStorage.getItem("accessToken")) {
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
      })
      .finally(() => setLoading(false));
  }, [location.pathname, navigate]);

  if (loading) {
    return (
      <div className="min-h-screen bb-network-bg flex items-center justify-center text-bb-muted">
        Checking secure access...
      </div>
    );
  }

  if (!role) {
    return (
      <Navigate
        to={`/login/${allowedRole === "BLOOD_BANK" ? "blood-bank" : allowedRole.toLowerCase()}`}
        replace
      />
    );
  }

  if (role !== allowedRole) {
    return <Navigate to={dashboardPath(role)} replace />;
  }

  return children;
}
