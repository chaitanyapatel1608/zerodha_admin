import { useCallback, useEffect, useState } from "react";
import { useOutletContext } from "react-router-dom";
import {
  Alert,
  Button,
  Chip,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  IconButton,
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
} from "@mui/material";
import ContentCopyIcon from "@mui/icons-material/ContentCopy";
import DownloadIcon from "@mui/icons-material/Download";
import api from "../config/api";
import TableSkeleton from "../components/TableSkeleton";
import { copyToClipboard, exportToCsv } from "../utils/adminUtils";

export default function TradingRiskPage() {
  const outletCtx = useOutletContext() || {};
  const [tab, setTab] = useState(0);
  const [orders, setOrders] = useState([]);
  const [ordersTotal, setOrdersTotal] = useState(0);
  const [page, setPage] = useState(0);
  const [rowsPerPage, setRowsPerPage] = useState(25);
  const [positions, setPositions] = useState([]);
  const [pledges, setPledges] = useState([]);
  const [q, setQ] = useState("");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");

  const [squareOffTarget, setSquareOffTarget] = useState(null);
  const [squareOffReason, setSquareOffReason] = useState("");
  const [squaringOff, setSquaringOff] = useState(false);

  const loadData = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const [ordersRes, posRes] = await Promise.all([
        api.get("/admin/orders", {
          params: { q: q.trim() || undefined, page: page + 1, limit: rowsPerPage },
        }),
        api.get("/admin/positions"),
      ]);
      setOrders(ordersRes.data.orders || []);
      setOrdersTotal(ordersRes.data.pagination?.total ?? (ordersRes.data.orders || []).length);
      setPositions(posRes.data.positions || []);
      setPledges(posRes.data.pledges || []);
    } catch (err) {
      setError(err?.response?.data?.message || "Failed to load trading & risk data");
    } finally {
      setLoading(false);
    }
  }, [q, page, rowsPerPage]);

  useEffect(() => {
    loadData();
  }, [loadData, outletCtx.refreshTick]);

  const confirmSquareOff = async () => {
    if (!squareOffTarget) return;
    setSquaringOff(true);
    setError("");
    setNotice("");
    try {
      await api.post(`/admin/positions/${squareOffTarget._id}/square-off`, {
        reason: squareOffReason.trim() || "CTO/RMS manual force square-off",
      });
      setNotice(`Squared off position ${squareOffTarget.name || squareOffTarget.instrument}.`);
      setSquareOffTarget(null);
      setSquareOffReason("");
      loadData();
    } catch (err) {
      setError(err?.response?.data?.message || "Failed to square off position");
    } finally {
      setSquaringOff(false);
    }
  };

  const exportOrdersCsv = () => {
    exportToCsv(
      `orders-blotter-p${page + 1}.csv`,
      ["Order ID", "User ID", "Symbol", "Side", "Product", "Qty", "Price (INR)", "Status"],
      orders.map((o) => [
        o.orderId || o._id,
        o.userId,
        o.name,
        o.mode,
        o.product || "CNC",
        o.qty,
        Number(o.price || 0).toFixed(2),
        o.status,
      ])
    );
  };

  return (
    <Stack spacing={2.5}>
      {error && <Alert severity="error" onClose={() => setError("")}>{error}</Alert>}
      {notice && <Alert severity="success" onClose={() => setNotice("")}>{notice}</Alert>}

      <Paper sx={{ px: 2, pt: 1 }}>
        <Tabs value={tab} onChange={(_, v) => setTab(v)}>
          <Tab label={`Order Blotter (${ordersTotal})`} />
          <Tab label={`Positions & RMS (${positions.length})`} />
          <Tab label={`Pledged Collateral (${pledges.length})`} />
        </Tabs>
      </Paper>

      {loading ? (
        <Paper sx={{ overflow: "hidden" }}>
          <TableSkeleton rows={6} cols={7} />
        </Paper>
      ) : (
        <>
          {tab === 0 && (
            <Paper sx={{ overflow: "hidden" }}>
              <Stack direction="row" spacing={1.5} p={2} justifyContent="space-between" flexWrap="wrap" useFlexGap>
                <Stack direction="row" spacing={1.5}>
                  <TextField
                    size="small"
                    placeholder="Filter symbol, orderId, userId..."
                    value={q}
                    onChange={(e) => {
                      setQ(e.target.value);
                      setPage(0);
                    }}
                    sx={{ width: { xs: "100%", sm: 320 } }}
                  />
                  <Button variant="outlined" onClick={loadData}>
                    Refresh
                  </Button>
                </Stack>
                <Button
                  size="small"
                  variant="outlined"
                  startIcon={<DownloadIcon />}
                  onClick={exportOrdersCsv}
                  disabled={orders.length === 0}
                >
                  CSV
                </Button>
              </Stack>

              <TableContainer sx={{ maxHeight: 540 }}>
                <Table size="small" stickyHeader>
                  <TableHead>
                    <TableRow>
                      <TableCell>Order ID</TableCell>
                      <TableCell>User ID</TableCell>
                      <TableCell>Symbol</TableCell>
                      <TableCell>Side / Product</TableCell>
                      <TableCell align="right">Qty</TableCell>
                      <TableCell align="right">Price (₹)</TableCell>
                      <TableCell>Status</TableCell>
                    </TableRow>
                  </TableHead>
                  <TableBody>
                    {orders.map((o) => {
                      const oid = o.orderId || o._id;
                      return (
                        <TableRow key={o._id} hover>
                          <TableCell sx={{ fontFamily: "monospace", fontSize: 12 }}>
                            <Stack direction="row" spacing={0.5} alignItems="center">
                              <span>{oid}</span>
                              <Tooltip title="Copy Order ID">
                                <IconButton
                                  size="small"
                                  onClick={async () => {
                                    if (await copyToClipboard(oid)) setNotice(`Copied ${oid}`);
                                  }}
                                >
                                  <ContentCopyIcon sx={{ fontSize: 13 }} />
                                </IconButton>
                              </Tooltip>
                            </Stack>
                          </TableCell>
                          <TableCell sx={{ fontFamily: "monospace", fontWeight: 600 }}>{o.userId}</TableCell>
                          <TableCell sx={{ fontWeight: 600 }}>{o.name}</TableCell>
                          <TableCell>
                            <Chip
                              label={`${o.mode} · ${o.product || "CNC"}`}
                              size="small"
                              color={o.mode === "BUY" ? "primary" : "error"}
                              variant="outlined"
                            />
                          </TableCell>
                          <TableCell align="right">{o.qty}</TableCell>
                          <TableCell align="right">₹{Number(o.price || 0).toFixed(2)}</TableCell>
                          <TableCell>
                            <Chip label={o.status} size="small" variant="outlined" />
                          </TableCell>
                        </TableRow>
                      );
                    })}
                    {orders.length === 0 && (
                      <TableRow>
                        <TableCell colSpan={7} align="center" sx={{ py: 4 }}>
                          No orders matched your filter.
                        </TableCell>
                      </TableRow>
                    )}
                  </TableBody>
                </Table>
              </TableContainer>

              <TablePagination
                component="div"
                count={ordersTotal}
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
          )}

          {tab === 1 && (
            <TableContainer component={Paper} sx={{ maxHeight: 580 }}>
              <Table size="small" stickyHeader>
                <TableHead>
                  <TableRow>
                    <TableCell>User ID</TableCell>
                    <TableCell>Instrument</TableCell>
                    <TableCell>Product</TableCell>
                    <TableCell align="right">Qty</TableCell>
                    <TableCell align="right">Avg / LTP</TableCell>
                    <TableCell align="right">PnL (₹)</TableCell>
                    <TableCell>Status</TableCell>
                    <TableCell align="right">RMS Action</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {positions.map((p) => (
                    <TableRow key={p._id} hover>
                      <TableCell sx={{ fontFamily: "monospace", fontWeight: 600 }}>{p.userId}</TableCell>
                      <TableCell sx={{ fontWeight: 600 }}>{p.name || p.instrument}</TableCell>
                      <TableCell>{p.product}</TableCell>
                      <TableCell align="right">{p.qty}</TableCell>
                      <TableCell align="right">
                        ₹{Number(p.avg || 0).toFixed(2)} / ₹{Number(p.ltp || p.price || 0).toFixed(2)}
                      </TableCell>
                      <TableCell
                        align="right"
                        sx={{ color: Number(p.pnl || 0) >= 0 ? "secondary.main" : "error.main", fontWeight: 600 }}
                      >
                        ₹{Number(p.pnl || 0).toFixed(2)}
                      </TableCell>
                      <TableCell>
                        <Chip
                          label={p.status || "OPEN"}
                          size="small"
                          color={p.status === "CLOSED" ? "default" : "warning"}
                        />
                      </TableCell>
                      <TableCell align="right">
                        {p.status !== "CLOSED" && (
                          <Button
                            size="small"
                            color="error"
                            variant="outlined"
                            onClick={() => {
                              setSquareOffTarget(p);
                              setSquareOffReason("");
                            }}
                          >
                            Force Square-Off
                          </Button>
                        )}
                      </TableCell>
                    </TableRow>
                  ))}
                  {positions.length === 0 && (
                    <TableRow>
                      <TableCell colSpan={8} align="center" sx={{ py: 4 }}>
                        No positions recorded.
                      </TableCell>
                    </TableRow>
                  )}
                </TableBody>
              </Table>
            </TableContainer>
          )}

          {tab === 2 && (
            <TableContainer component={Paper} sx={{ maxHeight: 580 }}>
              <Table size="small" stickyHeader>
                <TableHead>
                  <TableRow>
                    <TableCell>Ref</TableCell>
                    <TableCell>User ID</TableCell>
                    <TableCell>Symbol</TableCell>
                    <TableCell align="right">Qty</TableCell>
                    <TableCell align="right">Haircut %</TableCell>
                    <TableCell align="right">Collateral Value (₹)</TableCell>
                    <TableCell>Status</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {pledges.map((pl) => (
                    <TableRow key={pl._id} hover>
                      <TableCell sx={{ fontFamily: "monospace", fontSize: 12 }}>{pl.pledgeRef}</TableCell>
                      <TableCell sx={{ fontFamily: "monospace", fontWeight: 600 }}>{pl.userId}</TableCell>
                      <TableCell sx={{ fontWeight: 600 }}>{pl.symbol}</TableCell>
                      <TableCell align="right">{pl.pledgedQty}</TableCell>
                      <TableCell align="right">{pl.haircutPercent}%</TableCell>
                      <TableCell align="right">₹{Number(pl.collateralValue || 0).toFixed(2)}</TableCell>
                      <TableCell>{pl.status}</TableCell>
                    </TableRow>
                  ))}
                  {pledges.length === 0 && (
                    <TableRow>
                      <TableCell colSpan={7} align="center" sx={{ py: 4 }}>
                        No active pledged collateral.
                      </TableCell>
                    </TableRow>
                  )}
                </TableBody>
              </Table>
            </TableContainer>
          )}
        </>
      )}

      <Dialog
        open={Boolean(squareOffTarget)}
        onClose={() => !squaringOff && setSquareOffTarget(null)}
        maxWidth="xs"
        fullWidth
      >
        <DialogTitle>Confirm RMS Force Square-Off</DialogTitle>
        <DialogContent>
          <Stack spacing={2} sx={{ pt: 1 }}>
            <Alert severity="warning">
              Force-closing <strong>{squareOffTarget?.name || squareOffTarget?.instrument}</strong> (
              {squareOffTarget?.qty} qty) for client <strong>{squareOffTarget?.userId}</strong>.
            </Alert>
            <TextField
              size="small"
              label="Audit Reason (required)"
              value={squareOffReason}
              onChange={(e) => setSquareOffReason(e.target.value)}
              required
              fullWidth
            />
          </Stack>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setSquareOffTarget(null)} disabled={squaringOff}>
            Cancel
          </Button>
          <Button
            color="error"
            variant="contained"
            disabled={squaringOff || squareOffReason.trim().length < 3}
            onClick={confirmSquareOff}
          >
            {squaringOff ? "Squaring Off..." : "Execute Square-Off"}
          </Button>
        </DialogActions>
      </Dialog>
    </Stack>
  );
}
