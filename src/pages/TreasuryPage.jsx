import { useCallback, useEffect, useState } from "react";
import { useOutletContext } from "react-router-dom";
import {
  Alert,
  Button,
  Chip,
  Grid,
  IconButton,
  MenuItem,
  Paper,
  Stack,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TablePagination,
  TableRow,
  TextField,
  Tooltip,
  Typography,
} from "@mui/material";
import ContentCopyIcon from "@mui/icons-material/ContentCopy";
import DownloadIcon from "@mui/icons-material/Download";
import api from "../config/api";
import TableSkeleton from "../components/TableSkeleton";
import { copyToClipboard, exportToCsv } from "../utils/adminUtils";

export default function TreasuryPage() {
  const outletCtx = useOutletContext() || {};
  const [transactions, setTransactions] = useState([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(0);
  const [rowsPerPage, setRowsPerPage] = useState(25);
  const [loading, setLoading] = useState(true);
  const [typeFilter, setTypeFilter] = useState("");
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");

  const [userId, setUserId] = useState("");
  const [direction, setDirection] = useState("CREDIT");
  const [amount, setAmount] = useState("");
  const [reason, setReason] = useState("");
  const [submitting, setSubmitting] = useState(false);

  const loadLedger = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const { data } = await api.get("/admin/transactions", {
        params: {
          type: typeFilter || undefined,
          page: page + 1,
          limit: rowsPerPage,
        },
      });
      setTransactions(data.transactions || []);
      setTotal(data.pagination?.total ?? (data.transactions || []).length);
    } catch (err) {
      setError(err?.response?.data?.message || "Failed to load treasury ledger");
    } finally {
      setLoading(false);
    }
  }, [typeFilter, page, rowsPerPage]);

  useEffect(() => {
    loadLedger();
  }, [loadLedger, outletCtx.refreshTick]);

  const handleAdjust = async (e) => {
    e.preventDefault();
    setError("");
    setNotice("");
    setSubmitting(true);
    try {
      const { data } = await api.post("/admin/funds/adjust", {
        userId: userId.trim(),
        direction,
        amount: Number(amount),
        reason: reason.trim(),
      });
      setNotice(
        `Adjustment ${data.referenceId} completed. New Available Cash: ₹${data.balances?.availableCash}`
      );
      setAmount("");
      setReason("");
      loadLedger();
    } catch (err) {
      setError(err?.response?.data?.message || "Adjustment failed");
    } finally {
      setSubmitting(false);
    }
  };

  const handleExport = () => {
    exportToCsv(
      `treasury-ledger-p${page + 1}.csv`,
      ["Reference ID", "User ID", "Type", "Amount (INR)", "Method", "Status", "Remarks", "Created At"],
      transactions.map((t) => [
        t.referenceId,
        t.userId,
        t.type,
        Number(t.amount || 0).toFixed(2),
        t.paymentMethod,
        t.status,
        t.remarks || "",
        t.createdAt || "",
      ])
    );
  };

  return (
    <Stack spacing={3}>
      {error && <Alert severity="error" onClose={() => setError("")}>{error}</Alert>}
      {notice && <Alert severity="success" onClose={() => setNotice("")}>{notice}</Alert>}

      <Paper sx={{ p: 2.5 }} component="form" onSubmit={handleAdjust}>
        <Typography variant="h6" gutterBottom>
          Audited Treasury Adjustment (Integer Paise)
        </Typography>
        <Grid container spacing={2} alignItems="center">
          <Grid size={{ xs: 12, sm: 6, md: 2.5 }}>
            <TextField
              label="User ID"
              size="small"
              value={userId}
              onChange={(e) => setUserId(e.target.value)}
              required
              fullWidth
            />
          </Grid>
          <Grid size={{ xs: 12, sm: 6, md: 2 }}>
            <TextField
              select
              label="Direction"
              size="small"
              value={direction}
              onChange={(e) => setDirection(e.target.value)}
              fullWidth
            >
              <MenuItem value="CREDIT">CREDIT (+)</MenuItem>
              <MenuItem value="DEBIT">DEBIT (-)</MenuItem>
            </TextField>
          </Grid>
          <Grid size={{ xs: 12, sm: 6, md: 2 }}>
            <TextField
              label="Amount (₹)"
              type="number"
              size="small"
              inputProps={{ min: 1, step: "0.01" }}
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
              required
              fullWidth
            />
          </Grid>
          <Grid size={{ xs: 12, sm: 6, md: 3.5 }}>
            <TextField
              label="Audit Reason"
              size="small"
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              required
              fullWidth
            />
          </Grid>
          <Grid size={{ xs: 12, md: 2 }}>
            <Button type="submit" variant="contained" disabled={submitting} fullWidth>
              {submitting ? "Processing..." : "Execute"}
            </Button>
          </Grid>
        </Grid>
      </Paper>

      <Paper sx={{ overflow: "hidden" }}>
        <Stack
          direction={{ xs: "column", sm: "row" }}
          justifyContent="space-between"
          alignItems={{ sm: "center" }}
          spacing={1.5}
          sx={{ p: 2 }}
        >
          <Typography variant="h6">Funds Transaction Ledger</Typography>
          <Stack direction="row" spacing={1.5} alignItems="center">
            <TextField
              select
              size="small"
              label="Type"
              value={typeFilter}
              onChange={(e) => {
                setTypeFilter(e.target.value);
                setPage(0);
              }}
              sx={{ width: 180 }}
            >
              <MenuItem value="">All Types</MenuItem>
              <MenuItem value="PAYIN">PAYIN</MenuItem>
              <MenuItem value="PAYOUT">PAYOUT</MenuItem>
              <MenuItem value="PLEDGE_MARGIN">PLEDGE_MARGIN</MenuItem>
              <MenuItem value="UNPLEDGE_MARGIN">UNPLEDGE_MARGIN</MenuItem>
            </TextField>
            <Button
              size="small"
              variant="outlined"
              startIcon={<DownloadIcon />}
              onClick={handleExport}
              disabled={transactions.length === 0}
            >
              CSV
            </Button>
          </Stack>
        </Stack>

        {loading ? (
          <TableSkeleton rows={6} cols={7} />
        ) : (
          <TableContainer sx={{ maxHeight: 540 }}>
            <Table size="small" stickyHeader>
              <TableHead>
                <TableRow>
                  <TableCell>Ref ID</TableCell>
                  <TableCell>User ID</TableCell>
                  <TableCell>Type</TableCell>
                  <TableCell align="right">Amount (₹)</TableCell>
                  <TableCell>Method</TableCell>
                  <TableCell>Status</TableCell>
                  <TableCell>Remarks</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {transactions.map((t) => (
                  <TableRow key={t._id || t.referenceId} hover>
                    <TableCell sx={{ fontFamily: "monospace", fontSize: 12 }}>
                      <Stack direction="row" spacing={0.5} alignItems="center">
                        <span>{t.referenceId}</span>
                        <Tooltip title="Copy Ref ID">
                          <IconButton
                            size="small"
                            onClick={async () => {
                              if (await copyToClipboard(t.referenceId)) {
                                setNotice(`Copied ${t.referenceId}`);
                              }
                            }}
                          >
                            <ContentCopyIcon sx={{ fontSize: 13 }} />
                          </IconButton>
                        </Tooltip>
                      </Stack>
                    </TableCell>
                    <TableCell sx={{ fontFamily: "monospace", fontWeight: 600 }}>{t.userId}</TableCell>
                    <TableCell>
                      <Chip
                        label={t.type}
                        size="small"
                        color={t.type === "PAYIN" ? "success" : "warning"}
                        variant="outlined"
                      />
                    </TableCell>
                    <TableCell align="right">₹{Number(t.amount || 0).toFixed(2)}</TableCell>
                    <TableCell>{t.paymentMethod}</TableCell>
                    <TableCell>
                      <Chip
                        label={t.status}
                        size="small"
                        color={t.status === "COMPLETED" ? "success" : "default"}
                        variant="outlined"
                      />
                    </TableCell>
                    <TableCell>{t.remarks || "—"}</TableCell>
                  </TableRow>
                ))}
                {transactions.length === 0 && (
                  <TableRow>
                    <TableCell colSpan={7} align="center" sx={{ py: 4 }}>
                      No transactions found.
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
    </Stack>
  );
}
