import { useEffect, useState } from "react";
import { NavLink, Outlet, useLocation } from "react-router-dom";
import {
  AppBar,
  Avatar,
  Box,
  Button,
  Chip,
  Divider,
  Drawer,
  IconButton,
  List,
  ListItemButton,
  ListItemIcon,
  ListItemText,
  MenuItem,
  Stack,
  TextField,
  Toolbar,
  Tooltip,
  Typography,
} from "@mui/material";
import MenuIcon from "@mui/icons-material/Menu";
import ChevronLeftIcon from "@mui/icons-material/ChevronLeft";
import ChevronRightIcon from "@mui/icons-material/ChevronRight";
import DashboardIcon from "@mui/icons-material/Dashboard";
import PeopleIcon from "@mui/icons-material/People";
import AccountBalanceWalletIcon from "@mui/icons-material/AccountBalanceWallet";
import ShowChartIcon from "@mui/icons-material/ShowChart";
import BusinessCenterIcon from "@mui/icons-material/BusinessCenter";
import SupportAgentIcon from "@mui/icons-material/SupportAgent";
import HistoryIcon from "@mui/icons-material/History";
import LogoutIcon from "@mui/icons-material/Logout";
import SearchIcon from "@mui/icons-material/Search";
import FiberManualRecordIcon from "@mui/icons-material/FiberManualRecord";
import api from "../config/api";
import { useAdminAuth } from "../context/AdminAuthContext";
import CommandPalette from "./CommandPalette";

const FULL_WIDTH = 250;
const RAIL_WIDTH = 72;

const NAV_ITEMS = [
  { label: "Executive Overview", path: "/", icon: <DashboardIcon /> },
  { label: "Clients & 360°", path: "/users", icon: <PeopleIcon /> },
  { label: "Treasury & Ledger", path: "/treasury", icon: <AccountBalanceWalletIcon /> },
  { label: "Trading & RMS", path: "/trading", icon: <ShowChartIcon /> },
  { label: "Primary Markets", path: "/offerings", icon: <BusinessCenterIcon /> },
  { label: "Support & Broadcast", path: "/support", icon: <SupportAgentIcon /> },
  { label: "Audit Logs", path: "/audit-logs", icon: <HistoryIcon /> },
];

export default function AdminLayout() {
  const { admin, logout } = useAdminAuth();
  const [mobileOpen, setMobileOpen] = useState(false);
  const [collapsed, setCollapsed] = useState(false);
  const [paletteOpen, setPaletteOpen] = useState(false);
  const [autoRefreshSec, setAutoRefreshSec] = useState(0);
  const [refreshTick, setRefreshTick] = useState(0);
  const [dbOnline, setDbOnline] = useState(true);
  const location = useLocation();

  const drawerWidth = collapsed ? RAIL_WIDTH : FULL_WIDTH;

  const activeItem =
    NAV_ITEMS.find((n) => (n.path === "/" ? location.pathname === "/" : location.pathname.startsWith(n.path))) ||
    NAV_ITEMS[0];

  useEffect(() => {
    const onKeyDown = (e) => {
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === "k") {
        e.preventDefault();
        setPaletteOpen((prev) => !prev);
      }
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, []);

  useEffect(() => {
    let mounted = true;
    const ping = async () => {
      try {
        await api.get("/admin/me");
        if (mounted) setDbOnline(true);
      } catch {
        if (mounted) setDbOnline(false);
      }
    };
    const timer = setInterval(ping, 30000);
    return () => {
      mounted = false;
      clearInterval(timer);
    };
  }, []);

  useEffect(() => {
    if (!autoRefreshSec) return undefined;
    const timer = setInterval(() => {
      setRefreshTick((t) => t + 1);
    }, autoRefreshSec * 1000);
    return () => clearInterval(timer);
  }, [autoRefreshSec]);

  const initials = (admin?.fullName || admin?.userId || "AD").slice(0, 2).toUpperCase();

  const drawerContent = (isMobile = false) => {
    const isRail = collapsed && !isMobile;
    return (
      <Box sx={{ display: "flex", flexDirection: "column", height: "100%", overflowX: "hidden" }}>
        <Stack
          direction="row"
          alignItems="center"
          justifyContent={isRail ? "center" : "space-between"}
          sx={{ px: isRail ? 1 : 2, py: 2, minHeight: 64 }}
        >
          {!isRail && (
            <Box sx={{ minWidth: 0 }}>
              <Typography variant="h6" color="primary.light" noWrap>
                Kite Command
              </Typography>
              <Typography variant="caption" color="text.secondary" noWrap display="block">
                CTO / MD Operations Desk
              </Typography>
            </Box>
          )}
          {!isMobile && (
            <Tooltip title={isRail ? "Expand Sidebar" : "Collapse Sidebar"}>
              <IconButton size="small" onClick={() => setCollapsed((c) => !c)}>
                {isRail ? <ChevronRightIcon fontSize="small" /> : <ChevronLeftIcon fontSize="small" />}
              </IconButton>
            </Tooltip>
          )}
        </Stack>
        <Divider />

        <List sx={{ flex: 1, px: 1, py: 1.5, overflowY: "auto", overflowX: "hidden" }}>
          {NAV_ITEMS.map((item) => {
            const btn = (
              <ListItemButton
                key={item.path}
                component={NavLink}
                to={item.path}
                end={item.path === "/"}
                onClick={() => setMobileOpen(false)}
                sx={{
                  borderRadius: 1.5,
                  mb: 0.5,
                  justifyContent: isRail ? "center" : "flex-start",
                  px: isRail ? 1.5 : 2,
                  "&.active": {
                    bgcolor: "rgba(56, 126, 209, 0.18)",
                    color: "primary.light",
                    "& .MuiListItemIcon-root": { color: "primary.light" },
                  },
                }}
              >
                <ListItemIcon sx={{ minWidth: isRail ? 0 : 36, justifyContent: "center" }}>
                  {item.icon}
                </ListItemIcon>
                {!isRail && (
                  <ListItemText
                    primary={item.label}
                    primaryTypographyProps={{ fontSize: 13.5, fontWeight: 500, noWrap: true }}
                  />
                )}
              </ListItemButton>
            );
            return isRail ? (
              <Tooltip key={item.path} title={item.label} placement="right">
                {btn}
              </Tooltip>
            ) : (
              btn
            );
          })}
        </List>

        <Divider />
        <Box sx={{ p: 1.5, overflow: "hidden" }}>
          <Stack
            direction="row"
            spacing={1.25}
            alignItems="center"
            justifyContent={isRail ? "center" : "flex-start"}
            sx={{
              p: isRail ? 0.5 : 1,
              borderRadius: 1.5,
              bgcolor: "rgba(255, 255, 255, 0.03)",
            }}
          >
            <Avatar sx={{ width: 32, height: 32, fontSize: 12, fontWeight: 700, bgcolor: "primary.main" }}>
              {initials}
            </Avatar>
            {!isRail && (
              <Box sx={{ minWidth: 0, flex: 1 }}>
                <Typography variant="body2" fontWeight={600} noWrap>
                  {admin?.fullName || admin?.userId}
                </Typography>
                <Typography variant="caption" color="text.secondary" noWrap display="block">
                  {admin?.email}
                </Typography>
              </Box>
            )}
          </Stack>
        </Box>
      </Box>
    );
  };

  return (
    <Box sx={{ display: "flex", minHeight: "100vh", bgcolor: "background.default" }}>
      <AppBar
        position="fixed"
        color="default"
        elevation={0}
        sx={{
          width: { md: `calc(100% - ${drawerWidth}px)` },
          ml: { md: `${drawerWidth}px` },
          bgcolor: "background.paper",
          borderBottom: "1px solid rgba(148, 163, 184, 0.14)",
          transition: "width 0.18s ease, margin-left 0.18s ease",
        }}
      >
        <Toolbar sx={{ justifyContent: "space-between", gap: 1.5 }}>
          <Stack direction="row" alignItems="center" spacing={1.5} sx={{ minWidth: 0 }}>
            <IconButton
              color="inherit"
              edge="start"
              onClick={() => setMobileOpen(!mobileOpen)}
              sx={{ display: { md: "none" } }}
            >
              <MenuIcon />
            </IconButton>
            <Typography variant="h6" noWrap>
              {activeItem.label}
            </Typography>
          </Stack>

          <Stack direction="row" alignItems="center" spacing={1.25}>
            <Button
              size="small"
              variant="outlined"
              startIcon={<SearchIcon fontSize="small" />}
              onClick={() => setPaletteOpen(true)}
              sx={{
                display: { xs: "none", sm: "inline-flex" },
                color: "text.secondary",
                borderColor: "rgba(148, 163, 184, 0.25)",
                textTransform: "none",
                px: 1.5,
              }}
            >
              Command… <Chip label="Ctrl+K" size="small" sx={{ ml: 1, height: 18, fontSize: 10 }} />
            </Button>

            <TextField
              select
              size="small"
              value={autoRefreshSec}
              onChange={(e) => setAutoRefreshSec(Number(e.target.value))}
              sx={{ width: 106, display: { xs: "none", sm: "inline-flex" } }}
            >
              <MenuItem value={0}>Live: Off</MenuItem>
              <MenuItem value={15}>15s</MenuItem>
              <MenuItem value={30}>30s</MenuItem>
            </TextField>

            <Chip
              icon={
                <FiberManualRecordIcon
                  sx={{
                    fontSize: "10px !important",
                    color: dbOnline ? "#10B981 !important" : "#EF4444 !important",
                  }}
                />
              }
              label={dbOnline ? `ADMIN · ${admin?.userId || ""}` : "RECONNECTING"}
              size="small"
              color={dbOnline ? "primary" : "error"}
              variant="outlined"
            />
            <Button size="small" color="inherit" startIcon={<LogoutIcon />} onClick={logout}>
              Logout
            </Button>
          </Stack>
        </Toolbar>
      </AppBar>

      <Box
        component="nav"
        sx={{
          width: { md: drawerWidth },
          flexShrink: { md: 0 },
          transition: "width 0.18s ease",
        }}
      >
        <Drawer
          variant="temporary"
          open={mobileOpen}
          onClose={() => setMobileOpen(false)}
          ModalProps={{ keepMounted: true }}
          sx={{
            display: { xs: "block", md: "none" },
            "& .MuiDrawer-paper": { width: FULL_WIDTH, boxSizing: "border-box" },
          }}
        >
          {drawerContent(true)}
        </Drawer>
        <Drawer
          variant="permanent"
          sx={{
            display: { xs: "none", md: "block" },
            "& .MuiDrawer-paper": {
              width: drawerWidth,
              boxSizing: "border-box",
              transition: "width 0.18s ease",
              overflowX: "hidden",
            },
          }}
          open
        >
          {drawerContent(false)}
        </Drawer>
      </Box>

      <Box
        component="main"
        sx={{
          flexGrow: 1,
          p: 3,
          width: { md: `calc(100% - ${drawerWidth}px)` },
          mt: 8,
          minWidth: 0,
        }}
      >
        <Outlet context={{ refreshTick }} />
      </Box>

      <CommandPalette open={paletteOpen} onClose={() => setPaletteOpen(false)} />
    </Box>
  );
}
