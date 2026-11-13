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
  Tab,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Tabs,
  TextField,
  Typography,
} from "@mui/material";
import api from "../config/api";

const IPO_STATUSES = ["Upcoming", "Pre-apply", "Apply", "Closed"];

export default function OfferingsPage() {
  const [tab, setTab] = useState(0);
  const [ipos, setIpos] = useState([]);
  const [sseIpos, setSseIpos] = useState([]);
  const [auctions, setAuctions] = useState([]);
  const [ipoApps, setIpoApps] = useState([]);
  const [sseApps, setSseApps] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");

  const [symbol, setSymbol] = useState("");
  const [name, setName] = useState("");
  const [priceRange, setPriceRange] = useState("");
  const [dates, setDates] = useState("");
  const [minQty, setMinQty] = useState(15);
  const [status, setStatus] = useState("Upcoming");

  const loadData = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const [offRes, appRes] = await Promise.all([
        api.get("/admin/offerings"),
        api.get("/admin/applications"),
      ]);
      setIpos(offRes.data.ipos || []);
      setSseIpos(offRes.data.sseIpos || []);
      setAuctions(offRes.data.auctions || []);
      setIpoApps(appRes.data.ipoApplications || []);
      setSseApps(appRes.data.sseApplications || []);
    } catch (err) {
      setError(err?.response?.data?.message || "Failed to load primary market data");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const handleCreateIpo = async (e) => {
    e.preventDefault();
    setError("");
    setNotice("");
    try {
      await api.post("/admin/offerings/ipo", {
        symbol,
        name,
        priceRange,
        dates,
        minQty: Number(minQty),
        status,
      });
      setNotice(`IPO ${symbol.toUpperCase()} created.`);
      setSymbol("");
      setName("");
      setPriceRange("");
      setDates("");
      loadData();
    } catch (err) {
      setError(err?.response?.data?.message || "Failed to create IPO");
    }
  };

  const handleStatusChange = async (id, nextStatus) => {
    setError("");
    setNotice("");
    try {
      await api.patch(`/admin/offerings/ipo/${id}/status`, { status: nextStatus });
      setNotice(`IPO status updated to ${nextStatus}.`);
      loadData();
    } catch (err) {
      setError(err?.response?.data?.message || "Failed to update status");
    }
  };

  return (
    <Stack spacing={2.5}>
      {error && <Alert severity="error" onClose={() => setError("")}>{error}</Alert>}
      {notice && <Alert severity="success" onClose={() => setNotice("")}>{notice}</Alert>}

      <Paper sx={{ px: 2, pt: 1 }}>
        <Tabs value={tab} onChange={(_, v) => setTab(v)}>
          <Tab label={`Mainboard IPOs (${ipos.length})`} />
          <Tab label={`SSE & Auctions (${sseIpos.length + auctions.length})`} />
          <Tab label={`Applications (${ipoApps.length + sseApps.length})`} />
        </Tabs>
      </Paper>

      {loading ? (
        <Box sx={{ display: "flex", justifyContent: "center", py: 6 }}>
          <CircularProgress />
        </Box>
      ) : (
        <>
          {tab === 0 && (
            <Stack spacing={2.5}>
              <Paper sx={{ p: 2.5 }} component="form" onSubmit={handleCreateIpo}>
                <Typography variant="h6" gutterBottom>
                  Launch New IPO Offering
                </Typography>
                <Grid container spacing={2} alignItems="center">
                  <Grid size={{ xs: 12, sm: 6, md: 2 }}>
                    <TextField label="Symbol" size="small" value={symbol} onChange={(e) => setSymbol(e.target.value)} required fullWidth />
                  </Grid>
                  <Grid size={{ xs: 12, sm: 6, md: 3 }}>
                    <TextField label="Company Name" size="small" value={name} onChange={(e) => setName(e.target.value)} required fullWidth />
                  </Grid>
                  <Grid size={{ xs: 12, sm: 6, md: 2 }}>
                    <TextField label="Price Band" size="small" placeholder="₹320 - ₹340" value={priceRange} onChange={(e) => setPriceRange(e.target.value)} required fullWidth />
                  </Grid>
                  <Grid size={{ xs: 12, sm: 6, md: 2 }}>
                    <TextField label="Dates" size="small" placeholder="14 - 16 Nov" value={dates} onChange={(e) => setDates(e.target.value)} fullWidth />
                  </Grid>
                  <Grid size={{ xs: 6, md: 1 }}>
                    <TextField label="Lot" type="number" size="small" value={minQty} onChange={(e) => setMinQty(e.target.value)} fullWidth />
                  </Grid>
                  <Grid size={{ xs: 6, md: 2 }}>
                    <Stack direction="row" spacing={1}>
                      <TextField select size="small" value={status} onChange={(e) => setStatus(e.target.value)} fullWidth>
                        {IPO_STATUSES.map((s) => (
                          <MenuItem key={s} value={s}>{s}</MenuItem>
                        ))}
                      </TextField>
                      <Button type="submit" variant="contained">
                        Add
                      </Button>
                    </Stack>
                  </Grid>
                </Grid>
              </Paper>

              <TableContainer component={Paper}>
                <Table size="small">
                  <TableHead>
                    <TableRow>
                      <TableCell>Symbol</TableCell>
                      <TableCell>Company</TableCell>
                      <TableCell>Price Range</TableCell>
                      <TableCell>Dates</TableCell>
                      <TableCell>Issue Size</TableCell>
                      <TableCell>Status</TableCell>
                    </TableRow>
                  </TableHead>
                  <TableBody>
                    {ipos.map((ipo) => (
                      <TableRow key={ipo._id} hover>
                        <TableCell sx={{ fontWeight: 600 }}>{ipo.symbol}</TableCell>
                        <TableCell>{ipo.name}</TableCell>
                        <TableCell>{ipo.priceRange}</TableCell>
                        <TableCell>{ipo.dates}</TableCell>
                        <TableCell>{ipo.issueSize}</TableCell>
                        <TableCell>
                          <TextField
                            select
                            size="small"
                            value={ipo.status}
                            onChange={(e) => handleStatusChange(ipo._id, e.target.value)}
                            sx={{ minWidth: 130 }}
                          >
                            {IPO_STATUSES.map((s) => (
                              <MenuItem key={s} value={s}>{s}</MenuItem>
                            ))}
                          </TextField>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </TableContainer>
            </Stack>
          )}

          {tab === 1 && (
            <Stack spacing={2.5}>
              <TableContainer component={Paper}>
                <Table size="small">
                  <TableHead>
                    <TableRow>
                      <TableCell>SSE Symbol</TableCell>
                      <TableCell>Organization</TableCell>
                      <TableCell>Focus Area</TableCell>
                      <TableCell>Target</TableCell>
                      <TableCell>Status</TableCell>
                    </TableRow>
                  </TableHead>
                  <TableBody>
                    {sseIpos.map((s) => (
                      <TableRow key={s._id}>
                        <TableCell sx={{ fontWeight: 600 }}>{s.symbol}</TableCell>
                        <TableCell>{s.orgName}</TableCell>
                        <TableCell>{s.focusArea}</TableCell>
                        <TableCell>{s.targetAmount}</TableCell>
                        <TableCell><Chip label={s.status} size="small" /></TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </TableContainer>

              <TableContainer component={Paper}>
                <Table size="small">
                  <TableHead>
                    <TableRow>
                      <TableCell>Auction Symbol</TableCell>
                      <TableCell>Name</TableCell>
                      <TableCell align="right">Short Qty</TableCell>
                      <TableCell align="right">Base / Max Price</TableCell>
                      <TableCell>Status</TableCell>
                    </TableRow>
                  </TableHead>
                  <TableBody>
                    {auctions.map((a) => (
                      <TableRow key={a._id}>
                        <TableCell sx={{ fontWeight: 600 }}>{a.symbol}</TableCell>
                        <TableCell>{a.name}</TableCell>
                        <TableCell align="right">{a.shortQtyRequired}</TableCell>
                        <TableCell align="right">₹{a.basePrice} / ₹{a.maxAllowedPrice}</TableCell>
                        <TableCell><Chip label={a.status} size="small" /></TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </TableContainer>
            </Stack>
          )}

          {tab === 2 && (
            <TableContainer component={Paper}>
              <Table size="small">
                <TableHead>
                  <TableRow>
                    <TableCell>App #</TableCell>
                    <TableCell>User ID</TableCell>
                    <TableCell>Symbol</TableCell>
                    <TableCell>Category</TableCell>
                    <TableCell align="right">Amount (₹)</TableCell>
                    <TableCell>PAN (Masked)</TableCell>
                    <TableCell>Status</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {ipoApps.map((a) => (
                    <TableRow key={a._id}>
                      <TableCell>{a.applicationNumber}</TableCell>
                      <TableCell>{a.userId}</TableCell>
                      <TableCell sx={{ fontWeight: 600 }}>{a.ipoSymbol}</TableCell>
                      <TableCell>{a.investorCategory}</TableCell>
                      <TableCell align="right">₹{Number(a.totalAmount || 0).toFixed(2)}</TableCell>
                      <TableCell>{a.pan}</TableCell>
                      <TableCell>{a.status || "SUBMITTED"}</TableCell>
                    </TableRow>
                  ))}
                  {ipoApps.length === 0 && (
                    <TableRow>
                      <TableCell colSpan={7} align="center" sx={{ py: 4 }}>
                        No IPO applications yet.
                      </TableCell>
                    </TableRow>
                  )}
                </TableBody>
              </Table>
            </TableContainer>
          )}
        </>
      )}
    </Stack>
  );
}
