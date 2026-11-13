import { useCallback, useEffect, useState } from "react";
import { useNavigate, useOutletContext } from "react-router-dom";
import {
  Alert,
  Box,
  Button,
  Chip,
  Grid,
  LinearProgress,
  Paper,
  Skeleton,
  Stack,
  Typography,
} from "@mui/material";
import RefreshIcon from "@mui/icons-material/Refresh";
import WarningAmberIcon from "@mui/icons-material/WarningAmber";
import ArrowForwardIcon from "@mui/icons-material/ArrowForward";
import api from "../config/api";
import { parseINR } from "../utils/adminUtils";

function KpiCard({ title, value, subtitle, accent = "primary.light" }) {
  return (
    <Paper sx={{ p: 2.5, height: "100%" }}>
      <Typography variant="caption" color="text.secondary" textTransform="uppercase" fontWeight={600}>
        {title}
      </Typography>
      <Typography
        variant="h5"
        sx={{ mt: 1, mb: 0.5, color: accent, fontVariantNumeric: "tabular-nums" }}
      >
        {value}
      </Typography>
      {subtitle && (
        <Typography variant="caption" color="text.secondary">
          {subtitle}
        </Typography>
      )}
    </Paper>
  );
}

export default function OverviewPage() {
  const navigate = useNavigate();
  const outletCtx = useOutletContext() || {};
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const load = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const res = await api.get("/admin/overview");
      setData(res.data);
    } catch (err) {
      setError(err?.response?.data?.message || "Failed to load executive overview");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load, outletCtx.refreshTick]);

  if (loading && !data) {
    return (
      <Stack spacing={3}>
        <Grid container spacing={2}>
          {Array.from({ length: 8 }).map((_, idx) => (
            <Grid key={idx} size={{ xs: 12, sm: 6, md: 3 }}>
              <Paper sx={{ p: 2.5 }}>
                <Skeleton width="45%" height={16} />
                <Skeleton width="70%" height={34} sx={{ my: 1 }} />
                <Skeleton width="60%" height={16} />
              </Paper>
            </Grid>
          ))}
        </Grid>
      </Stack>
    );
  }

  if (error) {
    return <Alert severity="error">{error}</Alert>;
  }

  const k = data?.kpis || {};
  const health = data?.systemHealth || {};

  const cashVal = parseINR(k.treasury?.totalAvailableCash);
  const usedVal = parseINR(k.treasury?.totalUsedMargin);
  const collateralVal = parseINR(k.treasury?.totalCollateral);
  const totalTreasury = Math.max(1, cashVal + usedVal + collateralVal);
  const cashPct = Math.round((cashVal / totalTreasury) * 100);
  const usedPct = Math.round((usedVal / totalTreasury) * 100);
  const collPct = Math.max(0, 100 - cashPct - usedPct);

  const memMb = Number(health.memoryRssMb || 0);
  const memPct = Math.min(100, Math.round((memMb / 512) * 100));

  const alerts = [];
  if ((k.users?.cdslLocked ?? 0) > 0) {
    alerts.push({
      label: `${k.users.cdslLocked} CDSL-locked client(s) require attention`,
      path: "/users",
      severity: "warning",
    });
  }
  if ((k.operations?.urgentTickets ?? 0) > 0) {
    alerts.push({
      label: `${k.operations.urgentTickets} URGENT support ticket(s) open`,
      path: "/support",
      severity: "error",
    });
  }
  if ((k.trading?.openPositionsPnl ?? 0) < 0) {
    alerts.push({
      label: `Aggregate Open Positions PnL is negative (₹${Number(k.trading.openPositionsPnl).toFixed(2)})`,
      path: "/trading",
      severity: "warning",
    });
  }

  return (
    <Stack spacing={3}>
      <Stack direction="row" justifyContent="space-between" alignItems="center">
        <Box>
          <Typography variant="h5">Brokerage Command Center</Typography>
          <Typography variant="body2" color="text.secondary">
            Live telemetry across clients, treasury, risk, and primary markets
          </Typography>
        </Box>
        <Button variant="outlined" startIcon={<RefreshIcon />} onClick={load}>
          Refresh
        </Button>
      </Stack>

      {alerts.length > 0 && (
        <Paper sx={{ p: 2, borderColor: "rgba(245, 158, 11, 0.35)", bgcolor: "rgba(245, 158, 11, 0.05)" }}>
          <Stack direction="row" spacing={1} alignItems="center" mb={1}>
            <WarningAmberIcon color="warning" fontSize="small" />
            <Typography variant="subtitle2" color="warning.light">
              Risk &amp; Operations Alerts
            </Typography>
          </Stack>
          <Stack direction={{ xs: "column", md: "row" }} spacing={1} flexWrap="wrap" useFlexGap>
            {alerts.map((a, i) => (
              <Chip
                key={i}
                label={a.label}
                color={a.severity}
                variant="outlined"
                onClick={() => navigate(a.path)}
                onDelete={() => navigate(a.path)}
                deleteIcon={<ArrowForwardIcon />}
              />
            ))}
          </Stack>
        </Paper>
      )}

      <Grid container spacing={2}>
        <Grid size={{ xs: 12, sm: 6, md: 3 }}>
          <KpiCard
            title="Total Clients"
            value={k.users?.total ?? 0}
            subtitle={`${k.users?.admins ?? 0} admins · ${k.users?.cdslLocked ?? 0} CDSL locked`}
          />
        </Grid>
        <Grid size={{ xs: 12, sm: 6, md: 3 }}>
          <KpiCard
            title="Treasury Available Cash"
            value={`₹${k.treasury?.totalAvailableCash ?? "0.00"}`}
            subtitle={`Margin: ₹${k.treasury?.totalAvailableMargin ?? "0.00"}`}
            accent="secondary.main"
          />
        </Grid>
        <Grid size={{ xs: 12, sm: 6, md: 3 }}>
          <KpiCard
            title="Open Positions & PnL"
            value={`${k.trading?.openPositionsCount ?? 0} open`}
            subtitle={`Aggregate PnL: ₹${Number(k.trading?.openPositionsPnl ?? 0).toFixed(2)}`}
            accent={(k.trading?.openPositionsPnl ?? 0) >= 0 ? "secondary.main" : "error.main"}
          />
        </Grid>
        <Grid size={{ xs: 12, sm: 6, md: 3 }}>
          <KpiCard
            title="Support & Offerings"
            value={`${k.operations?.openTickets ?? 0} open tickets`}
            subtitle={`${k.operations?.urgentTickets ?? 0} urgent · ${k.operations?.activeIpos ?? 0} active IPOs`}
            accent={(k.operations?.urgentTickets ?? 0) > 0 ? "warning.main" : "primary.light"}
          />
        </Grid>

        <Grid size={{ xs: 12, sm: 6, md: 3 }}>
          <KpiCard
            title="Orders Executed"
            value={k.trading?.totalOrders ?? 0}
            subtitle={`${k.trading?.ordersToday ?? 0} placed today`}
          />
        </Grid>
        <Grid size={{ xs: 12, sm: 6, md: 3 }}>
          <KpiCard
            title="Used Margin"
            value={`₹${k.treasury?.totalUsedMargin ?? "0.00"}`}
            subtitle={`Collateral: ₹${k.treasury?.totalCollateral ?? "0.00"}`}
          />
        </Grid>
        <Grid size={{ xs: 12, sm: 6, md: 3 }}>
          <KpiCard
            title="Pledged Collateral"
            value={`₹${Number(k.trading?.pledgedCollateralValue ?? 0).toFixed(2)}`}
            subtitle={`${k.trading?.pledgedCollateralCount ?? 0} active pledges`}
          />
        </Grid>
        <Grid size={{ xs: 12, sm: 6, md: 3 }}>
          <KpiCard
            title="Primary Market Pipeline"
            value={`${k.operations?.totalIpoApplications ?? 0} IPO apps`}
            subtitle={`${k.operations?.activeSseIpos ?? 0} SSE · ${k.operations?.openAuctions ?? 0} Auctions`}
          />
        </Grid>
      </Grid>

      <Grid container spacing={2}>
        <Grid size={{ xs: 12, md: 7 }}>
          <Paper sx={{ p: 2.5, height: "100%" }}>
            <Typography variant="h6" gutterBottom>
              Treasury Capital Allocation
            </Typography>
            <Box
              sx={{
                display: "flex",
                height: 14,
                borderRadius: 99,
                overflow: "hidden",
                bgcolor: "rgba(148, 163, 184, 0.14)",
                my: 2,
              }}
            >
              <Box sx={{ width: `${cashPct}%`, bgcolor: "secondary.main" }} />
              <Box sx={{ width: `${usedPct}%`, bgcolor: "warning.main" }} />
              <Box sx={{ width: `${collPct}%`, bgcolor: "primary.main" }} />
            </Box>
            <Stack direction="row" spacing={3} flexWrap="wrap" useFlexGap>
              <Typography variant="caption" color="secondary.light">
                Available Cash: <strong>{cashPct}%</strong> (₹{k.treasury?.totalAvailableCash ?? "0.00"})
              </Typography>
              <Typography variant="caption" color="warning.light">
                Used Margin: <strong>{usedPct}%</strong> (₹{k.treasury?.totalUsedMargin ?? "0.00"})
              </Typography>
              <Typography variant="caption" color="primary.light">
                Collateral: <strong>{collPct}%</strong> (₹{k.treasury?.totalCollateral ?? "0.00"})
              </Typography>
            </Stack>
          </Paper>
        </Grid>

        <Grid size={{ xs: 12, md: 5 }}>
          <Paper sx={{ p: 2.5, height: "100%" }}>
            <Stack direction="row" justifyContent="space-between" alignItems="center" mb={1}>
              <Typography variant="h6">System &amp; Database Telemetry</Typography>
              <Chip
                label={health.dbState || "UNKNOWN"}
                color={health.dbState === "CONNECTED" ? "success" : "error"}
                size="small"
              />
            </Stack>
            <Typography variant="caption" color="text.secondary" display="block" mb={1.5}>
              Uptime: {health.uptimeSeconds ?? 0}s · Node {health.nodeVersion || ""} · Snapshot:{" "}
              {health.timestamp ? new Date(health.timestamp).toLocaleTimeString() : "—"}
            </Typography>
            <Stack direction="row" justifyContent="space-between" mb={0.5}>
              <Typography variant="caption" color="text.secondary">
                Node RSS Memory
              </Typography>
              <Typography variant="caption" fontWeight={600}>
                {memMb} MB / 512 MB
              </Typography>
            </Stack>
            <LinearProgress
              variant="determinate"
              value={memPct}
              color={memPct > 80 ? "warning" : "primary"}
              sx={{ height: 8, borderRadius: 4 }}
            />
          </Paper>
        </Grid>
      </Grid>
    </Stack>
  );
}
