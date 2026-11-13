import { createContext, useCallback, useContext, useEffect, useState } from "react";
import api from "../config/api";

const AdminAuthContext = createContext(null);

export function AdminAuthProvider({ children }) {
  const [admin, setAdmin] = useState(null);
  const [loading, setLoading] = useState(true);

  const checkSession = useCallback(async () => {
    setLoading(true);
    try {
      const { data } = await api.get("/admin/me");
      if (data?.success && data.admin) {
        setAdmin(data.admin);
      } else {
        setAdmin(null);
      }
    } catch {
      setAdmin(null);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    checkSession();
  }, [checkSession]);

  const login = useCallback(async (email, password) => {
    const loginRes = await api.post("/kite-login", { identifier: email, password });
    if (!loginRes.data?.success) {
      throw new Error(loginRes.data?.message || "Invalid credentials");
    }

    try {
      const meRes = await api.get("/admin/me");
      if (!meRes.data?.success || !meRes.data?.admin) {
        await api.post("/logout").catch(() => {});
        throw new Error("Admin privileges required.");
      }
      setAdmin(meRes.data.admin);
      return meRes.data.admin;
    } catch (err) {
      await api.post("/logout").catch(() => {});
      const msg =
        err?.response?.status === 403
          ? "Access denied: this account does not have admin privileges."
          : err?.response?.data?.message || err.message || "Admin verification failed";
      throw new Error(msg);
    }
  }, []);

  const logout = useCallback(async () => {
    try {
      await api.post("/logout");
    } finally {
      setAdmin(null);
    }
  }, []);

  return (
    <AdminAuthContext.Provider value={{ admin, loading, login, logout, checkSession }}>
      {children}
    </AdminAuthContext.Provider>
  );
}

export function useAdminAuth() {
  const ctx = useContext(AdminAuthContext);
  if (!ctx) {
    throw new Error("useAdminAuth must be used inside AdminAuthProvider");
  }
  return ctx;
}
