import { Suspense, lazy } from "react";
import { Box, CircularProgress, CssBaseline, ThemeProvider } from "@mui/material";
import { BrowserRouter, Navigate, Route, Routes } from "react-router-dom";
import { AdminAuthProvider, useAdminAuth } from "./context/AdminAuthContext";
import { adminTheme } from "./theme/adminTheme";
import AdminLogin from "./components/AdminLogin";
import AdminLayout from "./components/AdminLayout";

const OverviewPage = lazy(() => import("./pages/OverviewPage"));
const UsersPage = lazy(() => import("./pages/UsersPage"));
const TreasuryPage = lazy(() => import("./pages/TreasuryPage"));
const TradingRiskPage = lazy(() => import("./pages/TradingRiskPage"));
const OfferingsPage = lazy(() => import("./pages/OfferingsPage"));
const SupportBroadcastPage = lazy(() => import("./pages/SupportBroadcastPage"));
const AuditLogsPage = lazy(() => import("./pages/AuditLogsPage"));

function PageLoader() {
  return (
    <Box sx={{ display: "flex", justifyContent: "center", py: 8 }}>
      <CircularProgress size={28} />
    </Box>
  );
}

export function AdminRoutes() {
  const { admin, loading } = useAdminAuth();

  if (loading) {
    return (
      <Box
        sx={{
          minHeight: "100vh",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          bgcolor: "background.default",
        }}
      >
        <CircularProgress />
      </Box>
    );
  }

  if (!admin) {
    return <AdminLogin />;
  }

  return (
    <Suspense fallback={<PageLoader />}>
      <Routes>
        <Route path="/" element={<AdminLayout />}>
          <Route index element={<OverviewPage />} />
          <Route path="users" element={<UsersPage />} />
          <Route path="treasury" element={<TreasuryPage />} />
          <Route path="trading" element={<TradingRiskPage />} />
          <Route path="offerings" element={<OfferingsPage />} />
          <Route path="support" element={<SupportBroadcastPage />} />
          <Route path="audit-logs" element={<AuditLogsPage />} />
          <Route path="*" element={<Navigate to="/" replace />} />
        </Route>
      </Routes>
    </Suspense>
  );
}

export default function App() {
  return (
    <ThemeProvider theme={adminTheme}>
      <CssBaseline />
      <BrowserRouter>
        <AdminAuthProvider>
          <AdminRoutes />
        </AdminAuthProvider>
      </BrowserRouter>
    </ThemeProvider>
  );
}
