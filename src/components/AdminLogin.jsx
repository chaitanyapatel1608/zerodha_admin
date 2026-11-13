import { useState } from "react";
import {
  Alert,
  Box,
  Button,
  CircularProgress,
  Paper,
  Stack,
  TextField,
  Typography,
} from "@mui/material";
import SecurityIcon from "@mui/icons-material/Security";
import api from "../config/api";
import { useAdminAuth } from "../context/AdminAuthContext";

export default function AdminLogin() {
  const { login } = useAdminAuth();
  const [mode, setMode] = useState("login"); // "login" | "forgot" | "reset"
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [otp, setOtp] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");

  const handleLoginSubmit = async (e) => {
    e.preventDefault();
    setError("");
    setNotice("");
    setSubmitting(true);
    try {
      await login(email.trim(), password);
    } catch (err) {
      setError(err.message || "Authentication failed");
    } finally {
      setSubmitting(false);
    }
  };

  const handleSendOtp = async (e) => {
    e.preventDefault();
    setError("");
    setNotice("");
    setSubmitting(true);
    try {
      const { data } = await api.post("/admin/auth/forgot-password", { email: email.trim() });
      setNotice(data?.message || "Recovery OTP sent if admin email exists.");
      setMode("reset");
    } catch (err) {
      setError(err?.response?.data?.message || "Failed to send recovery OTP");
    } finally {
      setSubmitting(false);
    }
  };

  const handleResetSubmit = async (e) => {
    e.preventDefault();
    setError("");
    setNotice("");
    setSubmitting(true);
    try {
      const { data } = await api.post("/admin/auth/reset-password", {
        email: email.trim(),
        otp: otp.trim(),
        newPassword,
      });
      setNotice(data?.message || "Password reset successful. Please sign in.");
      setOtp("");
      setNewPassword("");
      setPassword("");
      setMode("login");
    } catch (err) {
      setError(err?.response?.data?.message || "Failed to reset password");
    } finally {
      setSubmitting(false);
    }
  };

  const formSubmitHandler =
    mode === "login"
      ? handleLoginSubmit
      : mode === "forgot"
        ? handleSendOtp
        : handleResetSubmit;

  return (
    <Box
      sx={{
        minHeight: "100vh",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        bgcolor: "background.default",
        p: 2,
      }}
    >
      <Paper sx={{ width: "100%", maxWidth: 420, p: 4 }}>
        <Stack spacing={2.5} component="form" onSubmit={formSubmitHandler}>
          <Stack direction="row" spacing={1.5} alignItems="center">
            <SecurityIcon color="primary" fontSize="large" />
            <Box>
              <Typography variant="h5">Kite Command Center</Typography>
              <Typography variant="caption" color="text.secondary">
                {mode === "login"
                  ? "CTO & Brokerage Operations Console"
                  : "Admin Password Recovery (Email OTP)"}
              </Typography>
            </Box>
          </Stack>

          {error && <Alert severity="error">{error}</Alert>}
          {notice && <Alert severity="success">{notice}</Alert>}

          <TextField
            label="Admin Email"
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
            fullWidth
            autoFocus
            disabled={mode === "reset"}
          />

          {mode === "login" && (
            <TextField
              label="Password"
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              fullWidth
            />
          )}

          {mode === "reset" && (
            <>
              <TextField
                label="6-Digit Recovery OTP"
                value={otp}
                onChange={(e) => setOtp(e.target.value)}
                required
                fullWidth
              />
              <TextField
                label="New Password (min 8 chars)"
                type="password"
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                required
                fullWidth
              />
            </>
          )}

          <Button
            type="submit"
            variant="contained"
            size="large"
            disabled={submitting}
            fullWidth
          >
            {submitting ? (
              <CircularProgress size={22} color="inherit" />
            ) : mode === "login" ? (
              "Sign In to Command Center"
            ) : mode === "forgot" ? (
              "Send Recovery OTP"
            ) : (
              "Reset Password"
            )}
          </Button>

          <Stack direction="row" justifyContent="space-between" alignItems="center">
            {mode === "login" ? (
              <Button
                size="small"
                color="inherit"
                onClick={() => {
                  setError("");
                  setNotice("");
                  setMode("forgot");
                }}
              >
                Forgot password?
              </Button>
            ) : (
              <Button
                size="small"
                color="inherit"
                onClick={() => {
                  setError("");
                  setNotice("");
                  setMode("login");
                }}
              >
                Back to Sign In
              </Button>
            )}
          </Stack>

          <Typography variant="caption" color="text.secondary" textAlign="center">
            All actions are authenticated via HttpOnly session + CSRF and recorded in the immutable audit log.
          </Typography>
        </Stack>
      </Paper>
    </Box>
  );
}
