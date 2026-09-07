import React, { createContext, useState, useEffect, useCallback } from "react";
import { getCurrentUser, logout as authLogout, type CurrentUser } from "../services/authService";
import type { Role } from "../types";

interface AuthContextType {
  user: CurrentUser | null;
  role: Role | null;
  loading: boolean;
  logout: () => void;
  refreshUser: () => Promise<CurrentUser | null>;
}

export const AuthContext = createContext<AuthContextType>({
  user: null,
  role: null,
  loading: true,
  logout: () => {},
  refreshUser: async () => null,
});

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<CurrentUser | null>(null);
  const [loading, setLoading] = useState(true);

  const refreshUser = useCallback(async () => {
    const token = localStorage.getItem("accessToken");
    if (!token) {
      setUser(null);
      setLoading(false);
      return null;
    }

    try {
      const u = await getCurrentUser();
      setUser(u);
      localStorage.setItem("bloodbridge_user", JSON.stringify(u));
      return u;
    } catch {
      authLogout();
      setUser(null);
      return null;
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    refreshUser();
  }, [refreshUser]);

  const logout = useCallback(() => {
    authLogout();
    setUser(null);
  }, []);

  return (
    <AuthContext.Provider
      value={{
        user,
        role: user?.role || null,
        loading,
        logout,
        refreshUser,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};
