import { useCallback, useEffect, useState } from "react";
import { useOutletContext, useSearchParams } from "react-router-dom";
import {
  Alert,
  Avatar,
  Box,
  Button,
  Checkbox,
  Chip,
  CircularProgress,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  Divider,
  Drawer,
  FormControlLabel,
  FormGroup,
  Grid,
  IconButton,
  LinearProgress,
  MenuItem,
  Paper,
  Stack,
  Tab,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TablePagination,
  TableRow,
  Tabs,
  TextField,
  Tooltip,
  Typography,
} from "@mui/material";
import SearchIcon from "@mui/icons-material/Search";
import CloseIcon from "@mui/icons-material/Close";
import AccountBalanceIcon from "@mui/icons-material/AccountBalance";
import ContentCopyIcon from "@mui/icons-material/ContentCopy";
import AccountBalanceWalletIcon from "@mui/icons-material/AccountBalanceWallet";
import api from "../config/api";
import { useAdminAuth } from "../context/AdminAuthContext";
import TableSkeleton from "../components/TableSkeleton";
import { copyToClipboard, parseINR } from "../utils/adminUtils";

const ALL_SEGMENTS = ["NSE", "BSE", "NFO", "MCX", "BFO", "CDS"];

export default function UsersPage() {
  const { admin } = useAdminAuth();
  const outletCtx = useOutletContext() || {};
  const [searchParams, setSearchParams] = useSearchParams();

  const [users, setUsers] = useState([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(0);
  const [rowsPerPage, setRowsPerPage] = useState(25);
  const [q, setQ] = useState("");
  const [roleFilter, setRoleFilter] = useState("");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");

  const [selectedId, setSelectedId] = useState("");
  const [detail, setDetail] = useState(null);
  const [detailLoading, setDetailLoading] = useState(false);
  const [segmentsDraft, setSegmentsDraft] = useState([]);
  const [drawerTab, setDrawerTab] = useState(0);

  const [deleteTarget, setDeleteTarget] = useState(null);
  const [deleteConfirmId, setDeleteConfirmId] = useState("");
  const [deleteReason, setDeleteReason] = useState("");
  const [deleting, setDeleting] = useState(false);

  const [fundsModalOpen, setFundsModalOpen] = useState(false);
  const [fundsDir, setFundsDir] = useState("CREDIT");
  const [fundsAmount, setFundsAmount] = useState("");
  const [fundsReason, setFundsReason] = useState("");
  const [fundsSubmitting, setFundsSubmitting] = useState(false);

  const loadUsers = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const { data } = await api.get("/admin/users", {
        params: {
          q: q.trim() || undefined,
          role: roleFilter || undefined,
          page: page + 1,
          limit: rowsPerPage,
        },
      });
      setUsers(data.users || []);
      setTotal(data.pagination?.total ?? (data.users || []).length);
    } catch (err) {
      setError(err?.response?.data?.message || "Failed to load users");
    } finally {
      setLoading(false);
    }
  }, [q, roleFilter, page, rowsPerPage]);

  useEffect(() => {
    loadUsers();
  }, [loadUsers, outletCtx.refreshTick]);

  const openInspector = useCallback(async (userId) => {
    setSelectedId(userId);
    setDetailLoading(true);
    setNotice("");
    try {
      const { data } = await api.get(`/admin/users/${userId}`);
      setDetail(data);
      setSegmentsDraft(data.client?.segments || []);
    } catch (err) {
      setError(err?.response?.data?.message || "Failed to load client 360 profile");
    } finally {
      setDetailLoading(false);
    }
  }, []);

  useEffect(() => {
    const inspectId = searchParams.get("inspect");
    if (inspectId) {
      openInspector(inspectId);
      setSearchParams({}, { replace: true });
    }
  }, [searchParams, setSearchParams, openInspector]);

  const handleToggleSegment = (seg) => {
    setSegmentsDraft((prev) =>
      prev.includes(seg) ? prev.filter((s) => s !== seg) : [...prev, seg]
    );
  };

  const saveSegments = async () => {
    if (!selectedId) return;
    try {
      await api.patch(`/admin/users/${selectedId}/segments`, {
        segments: segmentsDraft,
        reason: "Updated from Client 360 Inspector",
      });
      setNotice("Segments updated.");
      openInspector(selectedId);
      loadUsers();
    } catch (err) {
      setError(err?.response?.data?.message || "Failed to update segments");
    }
  };

  const revokeSession = async () => {
    if (!selectedId) return;
    try {
      const { data } = await api.post(`/admin/users/${selectedId}/revoke-session`, {
        reason: "Admin forced logout",
      });
      setNotice(`Session revoked (tokenVersion=${data.tokenVersion}).`);
      openInspector(selectedId);
    } catch (err) {
      setError(err?.response?.data?.message || "Failed to revoke session");
    }
  };

  const unlockCdsl = async () => {
    if (!selectedId) return;
    try {
      await api.post(`/admin/users/${selectedId}/unlock-cdsl`, {
        reason: "Admin unlocked CDSL TPIN",
      });
      setNotice("CDSL TPIN lock cleared.");
      openInspector(selectedId);
      loadUsers();
    } catch (err) {
      setError(err?.response?.data?.message || "Failed to unlock CDSL");
    }
  };

  const toggleRole = async (currentRole) => {
    if (!selectedId) return;
    const nextRole = currentRole === "admin" ? "user" : "admin";
    try {
      await api.patch(`/admin/users/${selectedId}/role`, {
        role: nextRole,
        reason: `Admin switched role to ${nextRole}`,
      });
      setNotice(`Role updated to ${nextRole}.`);
      openInspector(selectedId);
      loadUsers();
    } catch (err) {
      setError(err?.response?.data?.message || "Failed to change role");
    }
  };

  const handleQuickFundsSubmit = async (e) => {
    e.preventDefault();
    if (!selectedId) return;
    setFundsSubmitting(true);
    setError("");
    try {
      const { data } = await api.post("/admin/funds/adjust", {
        userId: selectedId,
        direction: fundsDir,
        amount: Number(fundsAmount),
        reason: fundsReason.trim(),
      });
      setNotice(`Funds adjusted (${data.referenceId}). New Cash: ₹${data.balances?.availableCash}`);
      setFundsModalOpen(false);
      setFundsAmount("");
      setFundsReason("");
      openInspector(selectedId);
      loadUsers();
    } catch (err) {
      setError(err?.response?.data?.message || "Funds adjustment failed");
    } finally {
      setFundsSubmitting(false);
    }
  };

  const availMarginNum = parseINR(detail?.funds?.equity?.availableMargin);
  const usedMarginNum = parseINR(detail?.funds?.equity?.usedMargin);
  const totalMarginNum = availMarginNum + usedMarginNum;
  const marginUtilPct = totalMarginNum > 0 ? Math.min(100, Math.round((usedMarginNum / totalMarginNum) * 100)) : 0;

  return (
    <Stack spacing={2.5}>
      {error && <Alert severity="error" onClose={() => setError("")}>{error}</Alert>}
      {notice && <Alert severity="success" onClose={() => setNotice("")}>{notice}</Alert>}

      <Paper sx={{ p: 2 }}>
        <Stack direction={{ xs: "column", sm: "row" }} spacing={2} alignItems="center">
          <TextField
            size="small"
            placeholder="Search userId, email, name, phone..."
            value={q}
            onChange={(e) => {
              setQ(e.target.value);
              setPage(0);
            }}
            sx={{ flex: 1, minWidth: 240 }}
          />
          <TextField
            select
            size="small"
            label="Role"
            value={roleFilter}
            onChange={(e) => {
              setRoleFilter(e.target.value);
              setPage(0);
            }}
            sx={{ width: 150 }}
          >
            <MenuItem value="">All Roles</MenuItem>
            <MenuItem value="user">User</MenuItem>
            <MenuItem value="admin">Admin</MenuItem>
          </TextField>
          <Button variant="contained" startIcon={<SearchIcon />} onClick={loadUsers}>
            Search
          </Button>
        </Stack>
      </Paper>

      <Paper sx={{ overflow: "hidden" }}>
        {loading ? (
          <TableSkeleton rows={6} cols={7} />
        ) : (
          <TableContainer sx={{ maxHeight: 560 }}>
            <Table size="small" stickyHeader>
              <TableHead>
                <TableRow>
                  <TableCell>User ID</TableCell>
                  <TableCell>Name / Email</TableCell>
                  <TableCell>Role</TableCell>
                  <TableCell>Segments</TableCell>
                  <TableCell align="right">Avail. Cash</TableCell>
                  <TableCell>CDSL</TableCell>
                  <TableCell align="right">Action</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {users.map((u) => (
                  <TableRow key={u.userId} hover>
                    <TableCell sx={{ fontFamily: "monospace", fontWeight: 600 }}>
                      <Stack direction="row" spacing={0.5} alignItems="center">
                        <span>{u.userId}</span>
                        <Tooltip title="Copy User ID">
                          <IconButton
                            size="small"
                            onClick={async () => {
                              if (await copyToClipboard(u.userId)) setNotice(`Copied ${u.userId}`);
                            }}
                          >
                            <ContentCopyIcon sx={{ fontSize: 13 }} />
                          </IconButton>
                        </Tooltip>
                      </Stack>
                    </TableCell>
                    <TableCell>
                      <Typography variant="body2" fontWeight={500}>{u.fullName || "—"}</Typography>
                      <Typography variant="caption" color="text.secondary">{u.email}</Typography>
                    </TableCell>
                    <TableCell>
                      <Chip
                        label={u.role}
                        size="small"
                        color={u.role === "admin" ? "primary" : "default"}
                        variant={u.role === "admin" ? "filled" : "outlined"}
                      />
                    </TableCell>
                    <TableCell>
                      <Stack direction="row" spacing={0.5} flexWrap="wrap" useFlexGap>
                        {(u.segments || []).map((s) => (
                          <Chip key={s} label={s} size="small" variant="outlined" />
                        ))}
                      </Stack>
                    </TableCell>
                    <TableCell align="right" sx={{ fontWeight: 600 }}>
                      ₹{u.funds?.availableCash ?? "0.00"}
                    </TableCell>
                    <TableCell>
                      {u.cdslLocked ? (
                        <Chip label="LOCKED" size="small" color="error" />
                      ) : (
                        <Chip label="OK" size="small" color="success" variant="outlined" />
                      )}
                    </TableCell>
                    <TableCell align="right">
                      <Stack direction="row" spacing={1} justifyContent="flex-end">
                        <Button size="small" onClick={() => openInspector(u.userId)}>
                          360° Inspect
                        </Button>
                        <Button
                          size="small"
                          color="error"
                          disabled={u.userId === admin?.userId}
                          onClick={() => {
                            setDeleteTarget(u);
                            setDeleteConfirmId("");
                            setDeleteReason("");
                          }}
                        >
                          Delete
                        </Button>
                      </Stack>
                    </TableCell>
                  </TableRow>
                ))}
                {users.length === 0 && (
                  <TableRow>
                    <TableCell colSpan={7} align="center" sx={{ py: 4 }}>
                      No clients matched your filter.
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </TableContainer>
        )}

        <TablePagination
          component="div"
          count={total}
          page={page}
          onPageChange={(_, p) => setPage(p)}
          rowsPerPage={rowsPerPage}
          onRowsPerPageChange={(e) => {
            setRowsPerPage(parseInt(e.target.value, 10));
            setPage(0);
          }}
          rowsPerPageOptions={[15, 25, 50]}
        />
      </Paper>

      <Drawer
        anchor="right"
        open={Boolean(selectedId)}
        onClose={() => {
          setSelectedId("");
          setDetail(null);
        }}
        slotProps={{
          paper: {
            sx: {
              width: { xs: "100%", sm: 600 },
              maxWidth: "100vw",
              bgcolor: "background.default",
              borderLeft: "1px solid rgba(148, 163, 184, 0.18)",
            },
          },
        }}
      >
        {detailLoading || !detail ? (
          <Box sx={{ display: "flex", justifyContent: "center", alignItems: "center", height: "100%" }}>
            <CircularProgress />
          </Box>
        ) : (
          <Box sx={{ display: "flex", flexDirection: "column", height: "100%" }}>
            <Box
              sx={{
                px: 3,
                py: 2.25,
                bgcolor: "background.paper",
                borderBottom: "1px solid rgba(148, 163, 184, 0.14)",
              }}
            >
              <Stack direction="row" justifyContent="space-between" alignItems="flex-start" spacing={2}>
                <Stack direction="row" spacing={1.75} alignItems="center">
                  <Avatar
                    sx={{
                      bgcolor: "primary.main",
                      width: 44,
                      height: 44,
                      fontWeight: 700,
                      fontSize: 16,
                    }}
                  >
                    {(detail.client.fullName || detail.client.userId || "U").slice(0, 2).toUpperCase()}
                  </Avatar>
                  <Box>
                    <Stack direction="row" spacing={1} alignItems="center">
                      <Typography variant="h6">
                        {detail.client.fullName || detail.client.userId}
                      </Typography>
                      <Chip
                        label={detail.client.role}
                        size="small"
                        color={detail.client.role === "admin" ? "primary" : "default"}
                      />
                      {detail.client.cdslLocked && (
                        <Chip label="CDSL LOCKED" size="small" color="error" />
                      )}
                    </Stack>
                    <Typography variant="body2" color="text.secondary">
                      {detail.client.userId} · {detail.client.email}
                    </Typography>
                  </Box>
                </Stack>
                <IconButton
                  size="small"
                  onClick={() => {
                    setSelectedId("");
                    setDetail(null);
                  }}
                >
                  <CloseIcon />
                </IconButton>
              </Stack>

              <Stack direction="row" spacing={2} flexWrap="wrap" sx={{ mt: 1.5 }}>
                <Typography variant="caption" color="text.secondary">
                  PAN: <strong>{detail.client.panMasked || "—"}</strong>
                </Typography>
                <Typography variant="caption" color="text.secondary">
                  Demat: <strong>{detail.client.dematAccountNo || "—"}</strong>
                </Typography>
                <Typography variant="caption" color="text.secondary">
                  Session: <strong>Token v{detail.client.tokenVersion}</strong>
                </Typography>
              </Stack>
            </Box>

            <Box sx={{ p: 2.5, overflowY: "auto", flex: 1 }}>
              <Stack spacing={2}>
                <Grid container spacing={1.25}>
                  <Grid size={{ xs: 6, sm: 3 }}>
                    <Paper sx={{ p: 1.5 }}>
                      <Typography variant="caption" color="text.secondary">
                        Avail. Cash
                      </Typography>
                      <Typography variant="subtitle2" color="secondary.main" sx={{ fontWeight: 700 }}>
                        ₹{detail.funds?.equity?.availableCash || "0.00"}
                      </Typography>
                    </Paper>
                  </Grid>
                  <Grid size={{ xs: 6, sm: 3 }}>
                    <Paper sx={{ p: 1.5 }}>
                      <Typography variant="caption" color="text.secondary">
                        Avail. Margin
                      </Typography>
                      <Typography variant="subtitle2" sx={{ fontWeight: 700 }}>
                        ₹{detail.funds?.equity?.availableMargin || "0.00"}
                      </Typography>
                    </Paper>
                  </Grid>
                  <Grid size={{ xs: 6, sm: 3 }}>
                    <Paper sx={{ p: 1.5 }}>
                      <Typography variant="caption" color="text.secondary">
                        Used Margin
                      </Typography>
                      <Typography variant="subtitle2" sx={{ fontWeight: 700 }}>
                        ₹{detail.funds?.equity?.usedMargin || "0.00"}
                      </Typography>
                    </Paper>
                  </Grid>
                  <Grid size={{ xs: 6, sm: 3 }}>
                    <Paper sx={{ p: 1.5 }}>
                      <Typography variant="caption" color="text.secondary">
                        Collateral
                      </Typography>
                      <Typography variant="subtitle2" sx={{ fontWeight: 700 }}>
                        ₹{detail.funds?.equity?.totalCollateral || "0.00"}
                      </Typography>
                    </Paper>
                  </Grid>
                </Grid>

                <Paper sx={{ p: 1.75 }}>
                  <Stack direction="row" justifyContent="space-between" alignItems="center" mb={0.75}>
                    <Typography variant="caption" color="text.secondary" fontWeight={600}>
                      MARGIN UTILIZATION
                    </Typography>
                    <Typography variant="caption" fontWeight={700}>
                      {marginUtilPct}%
                    </Typography>
                  </Stack>
                  <LinearProgress
                    variant="determinate"
                    value={marginUtilPct}
                    color={marginUtilPct > 75 ? "error" : marginUtilPct > 45 ? "warning" : "secondary"}
                    sx={{ height: 7, borderRadius: 4 }}
                  />
                </Paper>

                <Paper sx={{ p: 2 }}>
                  <Stack direction="row" justifyContent="space-between" alignItems="center" mb={0.5}>
                    <Typography variant="subtitle2">Segment Kill-Switch &amp; Controls</Typography>
                    <Button
                      size="small"
                      variant="outlined"
                      color="secondary"
                      startIcon={<AccountBalanceWalletIcon fontSize="small" />}
                      onClick={() => setFundsModalOpen(true)}
                    >
                      Adjust Funds
                    </Button>
                  </Stack>
                  <FormGroup row>
                    {ALL_SEGMENTS.map((seg) => (
                      <FormControlLabel
                        key={seg}
                        control={
                          <Checkbox
                            size="small"
                            checked={segmentsDraft.includes(seg)}
                            onChange={() => handleToggleSegment(seg)}
                          />
                        }
                        label={seg}
                      />
                    ))}
                  </FormGroup>
                  <Divider sx={{ my: 1.5 }} />
                  <Stack direction="row" spacing={1} flexWrap="wrap" useFlexGap>
                    <Button variant="contained" size="small" sx={{ whiteSpace: "nowrap" }} onClick={saveSegments}>
                      Save Segments
                    </Button>
                    <Button variant="outlined" color="warning" size="small" sx={{ whiteSpace: "nowrap" }} onClick={revokeSession}>
                      Revoke Session
                    </Button>
                    <Button variant="outlined" color="info" size="small" sx={{ whiteSpace: "nowrap" }} onClick={unlockCdsl}>
                      Unlock CDSL
                    </Button>
                    <Button
                      variant="outlined"
                      color="secondary"
                      size="small"
                      sx={{ whiteSpace: "nowrap" }}
                      onClick={() => toggleRole(detail.client.role)}
                    >
                      {detail.client.role === "admin" ? "Demote" : "Make Admin"}
                    </Button>
                    <Button
                      variant="outlined"
                      color="error"
                      size="small"
                      sx={{ whiteSpace: "nowrap" }}
                      disabled={detail.client.userId === admin?.userId}
                      onClick={() => {
                        setDeleteTarget(detail.client);
                        setDeleteConfirmId("");
                        setDeleteReason("");
                      }}
                    >
                      Delete
                    </Button>
                  </Stack>
                </Paper>

                <Paper sx={{ flexShrink: 0 }}>
                  <Tabs
                    value={drawerTab}
                    onChange={(_, v) => setDrawerTab(v)}
                    variant="scrollable"
                    scrollButtons="auto"
                    sx={{ borderBottom: "1px solid rgba(148, 163, 184, 0.14)", px: 1 }}
                  >
                    <Tab label={`Orders (${detail.orders?.length || 0})`} />
                    <Tab label={`Holdings (${detail.holdings?.length || 0})`} />
                    <Tab label={`Positions (${detail.positions?.length || 0})`} />
                    <Tab label={`Banks (${detail.banks?.length || 0})`} />
                  </Tabs>

                  <Box sx={{ p: 2 }}>
                    {drawerTab === 0 && (
                      <Stack spacing={1}>
                        {(detail.orders || []).map((o) => (
                          <Box
                            key={o._id}
                            sx={{
                              display: "flex",
                              justifyContent: "space-between",
                              alignItems: "center",
                              p: 1.25,
                              borderRadius: 1.5,
                              bgcolor: "rgba(255, 255, 255, 0.02)",
                              border: "1px solid rgba(148, 163, 184, 0.1)",
                            }}
                          >
                            <Stack direction="row" spacing={1.25} alignItems="center">
                              <Chip
                                label={o.mode}
                                size="small"
                                color={o.mode === "BUY" ? "primary" : "error"}
                                sx={{ minWidth: 54 }}
                              />
                              <Box>
                                <Typography variant="body2" fontWeight={600}>
                                  {o.name}
                                </Typography>
                                <Typography variant="caption" color="text.secondary">
                                  {o.qty} qty @ ₹{Number(o.price || 0).toFixed(2)} · {o.product || "CNC"}
                                </Typography>
                              </Box>
                            </Stack>
                            <Chip label={o.status} size="small" variant="outlined" />
                          </Box>
                        ))}
                        {(detail.orders || []).length === 0 && (
                          <Typography variant="body2" color="text.secondary" textAlign="center" py={2}>
                            No orders placed yet.
                          </Typography>
                        )}
                      </Stack>
                    )}

                    {drawerTab === 1 && (
                      <Stack spacing={1}>
                        {(detail.holdings || []).map((h) => {
                          const pnl = Number(h.pnl || 0);
                          return (
                            <Box
                              key={h._id}
                              sx={{
                                display: "flex",
                                justifyContent: "space-between",
                                alignItems: "center",
                                p: 1.25,
                                borderRadius: 1.5,
                                bgcolor: "rgba(255, 255, 255, 0.02)",
                                border: "1px solid rgba(148, 163, 184, 0.1)",
                              }}
                            >
                              <Box>
                                <Typography variant="body2" fontWeight={600}>
                                  {h.name || h.instrument}
                                </Typography>
                                <Typography variant="caption" color="text.secondary">
                                  Qty: {h.qty} · Avg: ₹{Number(h.avg || h.avgCost || 0).toFixed(2)} · LTP: ₹
                                  {Number(h.ltp || h.price || 0).toFixed(2)}
                                </Typography>
                              </Box>
                              <Typography
                                variant="body2"
                                fontWeight={600}
                                color={pnl >= 0 ? "secondary.main" : "error.main"}
                              >
                                {pnl >= 0 ? "+" : ""}₹{pnl.toFixed(2)}
                              </Typography>
                            </Box>
                          );
                        })}
                        {(detail.holdings || []).length === 0 && (
                          <Typography variant="body2" color="text.secondary" textAlign="center" py={2}>
                            No demat holdings.
                          </Typography>
                        )}
                      </Stack>
                    )}

                    {drawerTab === 2 && (
                      <Stack spacing={1}>
                        {(detail.positions || []).map((p) => {
                          const pnl = Number(p.pnl || 0);
                          return (
                            <Box
                              key={p._id}
                              sx={{
                                display: "flex",
                                justifyContent: "space-between",
                                alignItems: "center",
                                p: 1.25,
                                borderRadius: 1.5,
                                bgcolor: "rgba(255, 255, 255, 0.02)",
                                border: "1px solid rgba(148, 163, 184, 0.1)",
                              }}
                            >
                              <Box>
                                <Typography variant="body2" fontWeight={600}>
                                  {p.name || p.instrument}{" "}
                                  <Chip label={p.product || "MIS"} size="small" sx={{ ml: 0.5, height: 18 }} />
                                </Typography>
                                <Typography variant="caption" color="text.secondary">
                                  Qty: {p.qty} · Avg: ₹{Number(p.avg || 0).toFixed(2)} · {p.status || "OPEN"}
                                </Typography>
                              </Box>
                              <Typography
                                variant="body2"
                                fontWeight={600}
                                color={pnl >= 0 ? "secondary.main" : "error.main"}
                              >
                                {pnl >= 0 ? "+" : ""}₹{pnl.toFixed(2)}
                              </Typography>
                            </Box>
                          );
                        })}
                        {(detail.positions || []).length === 0 && (
                          <Typography variant="body2" color="text.secondary" textAlign="center" py={2}>
                            No positions recorded.
                          </Typography>
                        )}
                      </Stack>
                    )}

                    {drawerTab === 3 && (
                      <Stack spacing={1}>
                        {(detail.banks || []).map((b) => (
                          <Box
                            key={b._id}
                            sx={{
                              display: "flex",
                              justifyContent: "space-between",
                              alignItems: "center",
                              p: 1.25,
                              borderRadius: 1.5,
                              bgcolor: "rgba(255, 255, 255, 0.02)",
                              border: "1px solid rgba(148, 163, 184, 0.1)",
                            }}
                          >
                            <Stack direction="row" spacing={1.25} alignItems="center">
                              <AccountBalanceIcon fontSize="small" color="primary" />
                              <Box>
                                <Typography variant="body2" fontWeight={600}>
                                  {b.bankName} {b.maskedAccountNumber}
                                </Typography>
                                <Typography variant="caption" color="text.secondary">
                                  IFSC: {b.ifscCode} · {b.accountType || "SAVINGS"}
                                  {b.isPrimary ? " · Primary" : ""}
                                </Typography>
                              </Box>
                            </Stack>
                            <Chip
                              label={b.status}
                              size="small"
                              color={b.status === "VERIFIED" ? "success" : "warning"}
                              variant="outlined"
                            />
                          </Box>
                        ))}
                        {(detail.banks || []).length === 0 && (
                          <Typography variant="body2" color="text.secondary" textAlign="center" py={2}>
                            No linked bank accounts.
                          </Typography>
                        )}
                      </Stack>
                    )}
                  </Box>
                </Paper>
              </Stack>
            </Box>
          </Box>
        )}
      </Drawer>

      <Dialog
        open={fundsModalOpen}
        onClose={() => !fundsSubmitting && setFundsModalOpen(false)}
        maxWidth="xs"
        fullWidth
      >
        <Box component="form" onSubmit={handleQuickFundsSubmit}>
          <DialogTitle>Adjust Funds · {selectedId}</DialogTitle>
          <DialogContent>
            <Stack spacing={2} sx={{ pt: 1 }}>
              <TextField
                select
                size="small"
                label="Direction"
                value={fundsDir}
                onChange={(e) => setFundsDir(e.target.value)}
                fullWidth
              >
                <MenuItem value="CREDIT">CREDIT (+)</MenuItem>
                <MenuItem value="DEBIT">DEBIT (-)</MenuItem>
              </TextField>
              <TextField
                size="small"
                label="Amount (₹)"
                type="number"
                inputProps={{ min: 1, step: "0.01" }}
                value={fundsAmount}
                onChange={(e) => setFundsAmount(e.target.value)}
                required
                fullWidth
              />
              <TextField
                size="small"
                label="Audit Reason"
                value={fundsReason}
                onChange={(e) => setFundsReason(e.target.value)}
                required
                fullWidth
              />
            </Stack>
          </DialogContent>
          <DialogActions>
            <Button onClick={() => setFundsModalOpen(false)} disabled={fundsSubmitting}>
              Cancel
            </Button>
            <Button type="submit" variant="contained" disabled={fundsSubmitting}>
              {fundsSubmitting ? "Processing..." : "Execute"}
            </Button>
          </DialogActions>
        </Box>
      </Dialog>

      <Dialog
        open={Boolean(deleteTarget)}
        onClose={() => !deleting && setDeleteTarget(null)}
        maxWidth="xs"
        fullWidth
      >
        <DialogTitle>Delete User {deleteTarget?.userId}?</DialogTitle>
        <DialogContent>
          <Stack spacing={2} sx={{ pt: 1 }}>
            <Alert severity="warning">
              This permanently removes <strong>{deleteTarget?.fullName || deleteTarget?.userId}</strong> (
              {deleteTarget?.email}) and all associated funds, orders, holdings, positions, and tickets.
            </Alert>
            <TextField
              size="small"
              label={`Type "${deleteTarget?.userId}" to confirm`}
              value={deleteConfirmId}
              onChange={(e) => setDeleteConfirmId(e.target.value)}
              fullWidth
            />
            <TextField
              size="small"
              label="Audit Reason (optional)"
              value={deleteReason}
              onChange={(e) => setDeleteReason(e.target.value)}
              fullWidth
            />
          </Stack>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setDeleteTarget(null)} disabled={deleting}>
            Cancel
          </Button>
          <Button
            color="error"
            variant="contained"
            disabled={deleting || deleteConfirmId.trim() !== deleteTarget?.userId}
            onClick={async () => {
              if (!deleteTarget) return;
              setDeleting(true);
              setError("");
              try {
                await api.delete(`/admin/users/${deleteTarget.userId}`, {
                  data: { reason: deleteReason.trim() || "Deleted from Admin Console" },
                });
                setNotice(`User ${deleteTarget.userId} deleted.`);
                if (selectedId === deleteTarget.userId) {
                  setSelectedId("");
                  setDetail(null);
                }
                setDeleteTarget(null);
                loadUsers();
              } catch (err) {
                setError(err?.response?.data?.message || "Failed to delete user");
              } finally {
                setDeleting(false);
              }
            }}
          >
            {deleting ? "Deleting..." : "Confirm Delete"}
          </Button>
        </DialogActions>
      </Dialog>
    </Stack>
  );
}
