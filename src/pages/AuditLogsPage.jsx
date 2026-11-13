import { useCallback, useEffect, useState } from "react";
import { useOutletContext } from "react-router-dom";
import {
  Alert,
  Box,
  Button,
  Chip,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
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
  Typography,
} from "@mui/material";
import DownloadIcon from "@mui/icons-material/Download";
import CodeIcon from "@mui/icons-material/Code";
import api from "../config/api";
import TableSkeleton from "../components/TableSkeleton";
import { exportToCsv } from "../utils/adminUtils";

export default function AuditLogsPage() {
  const outletCtx = useOutletContext() || {};
  const [logs, setLogs] = useState([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(0);
  const [rowsPerPage, setRowsPerPage] = useState(25);
  const [actionFilter, setActionFilter] = useState("");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [selectedLog, setSelectedLog] = useState(null);

  const loadLogs = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const { data } = await api.get("/admin/audit-logs", {
        params: {
          action: actionFilter.trim() || undefined,
          page: page + 1,
          limit: rowsPerPage,
        },
      });
      setLogs(data.logs || []);
      setTotal(data.pagination?.total ?? (data.logs || []).length);
    } catch (err) {
      setError(err?.response?.data?.message || "Failed to load audit logs");
    } finally {
      setLoading(false);
    }
  }, [actionFilter, page, rowsPerPage]);

  useEffect(() => {
    loadLogs();
  }, [loadLogs, outletCtx.refreshTick]);

  const handleExport = () => {
    exportToCsv(
      `admin-audit-logs-p${page + 1}.csv`,
      ["Timestamp", "Admin ID", "Admin Email", "Action", "Target Type", "Target ID", "Reason", "Details"],
      logs.map((l) => [
        l.createdAt,
        l.adminUserId,
        l.adminEmail,
        l.action,
        l.targetType,
        l.targetId,
        l.reason || "",
        JSON.stringify(l.details || {}),
      ])
    );
  };

  return (
    <Stack spacing={2.5}>
      {error && <Alert severity="error">{error}</Alert>}

      <Paper sx={{ p: 2 }}>
        <Stack direction={{ xs: "column", sm: "row" }} spacing={1.5} alignItems="center">
          <TextField
            size="small"
            placeholder="Filter by exact action (e.g. FUNDS_CREDIT, USER_DELETED)"
            value={actionFilter}
            onChange={(e) => {
              setActionFilter(e.target.value);
              setPage(0);
            }}
            sx={{ flex: 1, width: "100%" }}
          />
          <Button variant="outlined" onClick={loadLogs}>
            Refresh
          </Button>
          <Button
            variant="outlined"
            startIcon={<DownloadIcon />}
            onClick={handleExport}
            disabled={logs.length === 0}
          >
            CSV
          </Button>
        </Stack>
      </Paper>

      <Paper sx={{ overflow: "hidden" }}>
        {loading ? (
          <TableSkeleton rows={6} cols={6} />
        ) : (
          <TableContainer sx={{ maxHeight: 560 }}>
            <Table size="small" stickyHeader>
              <TableHead>
                <TableRow>
                  <TableCell>Timestamp</TableCell>
                  <TableCell>Admin</TableCell>
                  <TableCell>Action</TableCell>
                  <TableCell>Target</TableCell>
                  <TableCell>Reason</TableCell>
                  <TableCell align="right">Payload</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {logs.map((log) => (
                  <TableRow key={log._id} hover>
                    <TableCell sx={{ whiteSpace: "nowrap", fontSize: 12 }}>
                      {new Date(log.createdAt).toLocaleString()}
                    </TableCell>
                    <TableCell>
                      <Typography variant="body2" sx={{ fontFamily: "monospace", fontWeight: 600 }}>
                        {log.adminUserId}
                      </Typography>
                      <Typography variant="caption" color="text.secondary">
                        {log.adminEmail}
                      </Typography>
                    </TableCell>
                    <TableCell>
                      <Chip label={log.action} size="small" color="primary" variant="outlined" />
                    </TableCell>
                    <TableCell sx={{ fontFamily: "monospace", fontSize: 12 }}>
                      {log.targetType}: {log.targetId}
                    </TableCell>
                    <TableCell>{log.reason || "—"}</TableCell>
                    <TableCell align="right">
                      <Button
                        size="small"
                        startIcon={<CodeIcon fontSize="small" />}
                        onClick={() => setSelectedLog(log)}
                      >
                        JSON
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
                {logs.length === 0 && (
                  <TableRow>
                    <TableCell colSpan={6} align="center" sx={{ py: 4 }}>
                      No audit entries recorded yet.
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

      <Dialog open={Boolean(selectedLog)} onClose={() => setSelectedLog(null)} maxWidth="sm" fullWidth>
        <DialogTitle>Audit Payload · {selectedLog?.action}</DialogTitle>
        <DialogContent>
          <Box
            component="pre"
            sx={{
              p: 2,
              borderRadius: 1.5,
              bgcolor: "#070B14",
              border: "1px solid rgba(148, 163, 184, 0.16)",
              overflowX: "auto",
              fontSize: 12,
              fontFamily: "monospace",
              m: 0,
            }}
          >
            {JSON.stringify(selectedLog || {}, null, 2)}
          </Box>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setSelectedLog(null)}>Close</Button>
        </DialogActions>
      </Dialog>
    </Stack>
  );
}
