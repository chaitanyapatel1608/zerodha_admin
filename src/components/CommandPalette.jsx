import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  Chip,
  Dialog,
  DialogContent,
  Divider,
  InputAdornment,
  List,
  ListItemButton,
  ListItemIcon,
  ListItemText,
  Stack,
  TextField,
  Typography,
} from "@mui/material";
import SearchIcon from "@mui/icons-material/Search";
import DashboardIcon from "@mui/icons-material/Dashboard";
import PeopleIcon from "@mui/icons-material/People";
import AccountBalanceWalletIcon from "@mui/icons-material/AccountBalanceWallet";
import ShowChartIcon from "@mui/icons-material/ShowChart";
import BusinessCenterIcon from "@mui/icons-material/BusinessCenter";
import SupportAgentIcon from "@mui/icons-material/SupportAgent";
import HistoryIcon from "@mui/icons-material/History";
import PersonSearchIcon from "@mui/icons-material/PersonSearch";
import api from "../config/api";

const ROUTES = [
  { label: "Executive Overview", path: "/", icon: <DashboardIcon fontSize="small" /> },
  { label: "Clients & 360° Directory", path: "/users", icon: <PeopleIcon fontSize="small" /> },
  { label: "Treasury & Funds Ledger", path: "/treasury", icon: <AccountBalanceWalletIcon fontSize="small" /> },
  { label: "Trading & RMS", path: "/trading", icon: <ShowChartIcon fontSize="small" /> },
  { label: "Primary Markets & IPOs", path: "/offerings", icon: <BusinessCenterIcon fontSize="small" /> },
  { label: "Support & Broadcast", path: "/support", icon: <SupportAgentIcon fontSize="small" /> },
  { label: "Immutable Audit Logs", path: "/audit-logs", icon: <HistoryIcon fontSize="small" /> },
];

export default function CommandPalette({ open, onClose }) {
  const navigate = useNavigate();
  const [query, setQuery] = useState("");
  const [userMatches, setUserMatches] = useState([]);

  useEffect(() => {
    if (!open) {
      setQuery("");
      setUserMatches([]);
      return;
    }
  }, [open]);

  useEffect(() => {
    const q = query.trim();
    if (!open || q.length < 2) {
      setUserMatches([]);
      return;
    }
    const timer = setTimeout(async () => {
      try {
        const { data } = await api.get("/admin/users", { params: { q, limit: 5 } });
        setUserMatches(data.users || []);
      } catch {
        setUserMatches([]);
      }
    }, 220);
    return () => clearTimeout(timer);
  }, [query, open]);

  const filteredRoutes = ROUTES.filter((r) =>
    r.label.toLowerCase().includes(query.trim().toLowerCase())
  );

  const go = (path) => {
    onClose();
    navigate(path);
  };

  return (
    <Dialog
      open={open}
      onClose={onClose}
      maxWidth="sm"
      fullWidth
      slotProps={{
        paper: {
          sx: {
            bgcolor: "background.paper",
            border: "1px solid rgba(56, 126, 209, 0.35)",
          },
        },
      }}
    >
      <DialogContent sx={{ p: 0 }}>
        <TextField
          autoFocus
          fullWidth
          placeholder="Jump to a section or search client by userId / email..."
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          sx={{
            "& .MuiOutlinedInput-notchedOutline": { border: "none" },
            px: 1,
            py: 0.5,
          }}
          slotProps={{
            input: {
              startAdornment: (
                <InputAdornment position="start">
                  <SearchIcon color="primary" />
                </InputAdornment>
              ),
              endAdornment: (
                <InputAdornment position="end">
                  <Chip label="ESC" size="small" variant="outlined" />
                </InputAdornment>
              ),
            },
          }}
        />
        <Divider />

        <List dense sx={{ maxHeight: 340, overflowY: "auto", py: 1 }}>
          {userMatches.length > 0 && (
            <>
              <Typography variant="caption" color="text.secondary" sx={{ px: 2, py: 0.5, display: "block" }}>
                CLIENTS (360° INSPECT)
              </Typography>
              {userMatches.map((u) => (
                <ListItemButton key={u.userId} onClick={() => go(`/users?inspect=${encodeURIComponent(u.userId)}`)}>
                  <ListItemIcon sx={{ minWidth: 34 }}>
                    <PersonSearchIcon fontSize="small" color="secondary" />
                  </ListItemIcon>
                  <ListItemText
                    primary={`${u.userId} · ${u.fullName || "Client"}`}
                    secondary={u.email}
                  />
                  <Chip label={`₹${u.funds?.availableCash ?? "0.00"}`} size="small" variant="outlined" />
                </ListItemButton>
              ))}
              <Divider sx={{ my: 0.75 }} />
            </>
          )}

          <Typography variant="caption" color="text.secondary" sx={{ px: 2, py: 0.5, display: "block" }}>
            NAVIGATION
          </Typography>
          {filteredRoutes.map((item) => (
            <ListItemButton key={item.path} onClick={() => go(item.path)}>
              <ListItemIcon sx={{ minWidth: 34 }}>{item.icon}</ListItemIcon>
              <ListItemText primary={item.label} />
              <Stack direction="row" spacing={0.5}>
                <Typography variant="caption" color="text.disabled">
                  {item.path}
                </Typography>
              </Stack>
            </ListItemButton>
          ))}
        </List>
      </DialogContent>
    </Dialog>
  );
}
