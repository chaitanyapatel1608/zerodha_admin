import { useCallback, useEffect, useState } from "react";
import {
  Alert,
  Box,
  Button,
  Chip,
  CircularProgress,
  Grid,
  MenuItem,
  Paper,
  Stack,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  TextField,
  Typography,
} from "@mui/material";
import api from "../config/api";

const TICKET_STATUSES = ["OPEN", "IN_PROGRESS", "RESOLVED", "CLOSED"];

export default function SupportBroadcastPage() {
  const [tickets, setTickets] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");

  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [targetUserId, setTargetUserId] = useState("");
  const [priority, setPriority] = useState("HIGH");
  const [sending, setSending] = useState(false);

  const loadTickets = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const { data } = await api.get("/admin/tickets");
      setTickets(data.tickets || []);
    } catch (err) {
      setError(err?.response?.data?.message || "Failed to load tickets");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadTickets();
  }, [loadTickets]);

  const updateTicketStatus = async (id, status) => {
    try {
      await api.patch(`/admin/tickets/${id}`, { status });
      setNotice(`Ticket updated to ${status}.`);
      loadTickets();
    } catch (err) {
      setError(err?.response?.data?.message || "Failed to update ticket");
    }
  };

  const sendBroadcast = async (e) => {
    e.preventDefault();
    setError("");
    setNotice("");
    setSending(true);
    try {
      const { data } = await api.post("/admin/notifications/broadcast", {
        title: title.trim(),
        description: description.trim(),
        targetUserId: targetUserId.trim() || undefined,
        priority,
      });
      setNotice(`Notification dispatched to ${data.sentCount} user(s).`);
      setTitle("");
      setDescription("");
      setTargetUserId("");
    } catch (err) {
      setError(err?.response?.data?.message || "Broadcast failed");
    } finally {
      setSending(false);
    }
  };

  return (
    <Stack spacing={3}>
      {error && <Alert severity="error" onClose={() => setError("")}>{error}</Alert>}
      {notice && <Alert severity="success" onClose={() => setNotice("")}>{notice}</Alert>}

      <Paper sx={{ p: 2.5 }} component="form" onSubmit={sendBroadcast}>
        <Typography variant="h6" gutterBottom>
          System Broadcast &amp; Targeted Client Alert
        </Typography>
        <Grid container spacing={2}>
          <Grid size={{ xs: 12, sm: 6, md: 4 }}>
            <TextField
              label="Notification Title"
              size="small"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              required
              fullWidth
            />
          </Grid>
          <Grid size={{ xs: 12, sm: 6, md: 3 }}>
            <TextField
              label="Target User ID (optional = All)"
              size="small"
              value={targetUserId}
              onChange={(e) => setTargetUserId(e.target.value)}
              fullWidth
            />
          </Grid>
          <Grid size={{ xs: 12, sm: 6, md: 2 }}>
            <TextField
              select
              label="Priority"
              size="small"
              value={priority}
              onChange={(e) => setPriority(e.target.value)}
              fullWidth
            >
              <MenuItem value="NORMAL">NORMAL</MenuItem>
              <MenuItem value="HIGH">HIGH</MenuItem>
              <MenuItem value="CRITICAL">CRITICAL</MenuItem>
            </TextField>
          </Grid>
          <Grid size={{ xs: 12, md: 3 }}>
            <Button type="submit" variant="contained" disabled={sending} fullWidth sx={{ height: 40 }}>
              {sending ? "Sending..." : "Dispatch Notification"}
            </Button>
          </Grid>
          <Grid size={{ xs: 12 }}>
            <TextField
              label="Message Body"
              size="small"
              multiline
              rows={2}
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              required
              fullWidth
            />
          </Grid>
        </Grid>
      </Paper>

      <Paper sx={{ p: 2 }}>
        <Typography variant="h6" gutterBottom>
          Support Desk Queue ({tickets.length})
        </Typography>
        {loading ? (
          <Box sx={{ display: "flex", justifyContent: "center", py: 5 }}>
            <CircularProgress />
          </Box>
        ) : (
          <TableContainer>
            <Table size="small">
              <TableHead>
                <TableRow>
                  <TableCell>Ticket ID</TableCell>
                  <TableCell>User</TableCell>
                  <TableCell>Category / Subject</TableCell>
                  <TableCell>Priority</TableCell>
                  <TableCell>Status</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {tickets.map((t) => (
                  <TableRow key={t._id || t.ticketId} hover>
                    <TableCell sx={{ fontWeight: 600 }}>{t.ticketId}</TableCell>
                    <TableCell>
                      <Typography variant="body2">{t.userId}</Typography>
                      <Typography variant="caption" color="text.secondary">{t.userEmail}</Typography>
                    </TableCell>
                    <TableCell>
                      <Typography variant="body2">{t.subject}</Typography>
                      <Typography variant="caption" color="text.secondary">{t.category}</Typography>
                    </TableCell>
                    <TableCell>
                      <Chip
                        label={t.priority}
                        size="small"
                        color={t.priority === "URGENT" ? "error" : t.priority === "HIGH" ? "warning" : "default"}
                      />
                    </TableCell>
                    <TableCell>
                      <TextField
                        select
                        size="small"
                        value={t.status}
                        onChange={(e) => updateTicketStatus(t._id || t.ticketId, e.target.value)}
                        sx={{ minWidth: 140 }}
                      >
                        {TICKET_STATUSES.map((s) => (
                          <MenuItem key={s} value={s}>{s}</MenuItem>
                        ))}
                      </TextField>
                    </TableCell>
                  </TableRow>
                ))}
                {tickets.length === 0 && (
                  <TableRow>
                    <TableCell colSpan={5} align="center" sx={{ py: 4 }}>
                      No support tickets found.
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </TableContainer>
        )}
      </Paper>
    </Stack>
  );
}
