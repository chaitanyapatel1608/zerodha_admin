import { describe, it, expect, vi, beforeEach } from "vitest";
import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import api, { readCookie } from "../config/api";
import { parseINR } from "../utils/adminUtils";
import App from "../App";

describe("Admin API & Utils", () => {
  beforeEach(() => {
    document.cookie = "zerodha_csrf=test_csrf_xyz; path=/";
  });

  it("reads zerodha_csrf cookie cleanly", () => {
    expect(readCookie("zerodha_csrf")).toBe("test_csrf_xyz");
  });

  it("parses formatted INR strings accurately", () => {
    expect(parseINR("11,21,458.70")).toBe(1121458.7);
    expect(parseINR("₹1,250.50")).toBe(1250.5);
  });

  it("injects X-CSRF-Token on mutating requests and omits on GET", async () => {
    const handlers = api.interceptors.request.handlers;
    expect(handlers.length).toBeGreaterThan(0);
    const fn = handlers[0].fulfilled;

    const postCfg = await fn({ method: "post", headers: {} });
    expect(postCfg.headers["X-CSRF-Token"]).toBe("test_csrf_xyz");

    const getCfg = await fn({ method: "get", headers: {} });
    expect(getCfg.headers["X-CSRF-Token"]).toBeUndefined();
  });
});

describe("Admin App RBAC Gate & Command Palette", () => {
  it("renders AdminLogin when /admin/me returns 401", async () => {
    vi.spyOn(api, "get").mockRejectedValueOnce({ response: { status: 401 } });
    render(<App />);

    await waitFor(() => {
      expect(screen.getByText(/Kite Command Center/i)).toBeInTheDocument();
    });
    expect(screen.getByRole("button", { name: /Sign In to Command Center/i })).toBeInTheDocument();
    vi.restoreAllMocks();
  });

  it("renders Executive Overview shell and opens Ctrl+K Command Palette", async () => {
    vi.spyOn(api, "get").mockImplementation((url) => {
      if (url === "/admin/me") {
        return Promise.resolve({
          data: {
            success: true,
            admin: { userId: "ADM001", email: "cto@kite.local", fullName: "CTO", role: "admin" },
          },
        });
      }
      if (url === "/admin/overview") {
        return Promise.resolve({
          data: {
            success: true,
            kpis: {
              users: { total: 12, admins: 1, cdslLocked: 1 },
              treasury: { totalAvailableCash: "10,000.00", totalAvailableMargin: "10,000.00", totalUsedMargin: "2,000.00", totalCollateral: "1,000.00" },
              trading: { totalOrders: 4, ordersToday: 1, openPositionsCount: 0, openPositionsPnl: 0, pledgedCollateralCount: 0, pledgedCollateralValue: 0 },
              operations: { openTickets: 0, urgentTickets: 0, activeIpos: 2, activeSseIpos: 1, openAuctions: 1, totalIpoApplications: 0 },
            },
            systemHealth: { dbState: "CONNECTED", uptimeSeconds: 42, memoryRssMb: 90, nodeVersion: "v24.0.0", timestamp: "2026-11-12T00:00:00Z" },
          },
        });
      }
      return Promise.resolve({ data: {} });
    });

    render(<App />);

    await waitFor(() => {
      expect(screen.getByText(/Brokerage Command Center/i)).toBeInTheDocument();
    });
    expect(screen.getByText(/Treasury Capital Allocation/i)).toBeInTheDocument();

    fireEvent.keyDown(window, { key: "k", ctrlKey: true });
    await waitFor(() => {
      expect(screen.getByPlaceholderText(/Jump to a section or search client/i)).toBeInTheDocument();
    });
    vi.restoreAllMocks();
  });
});
