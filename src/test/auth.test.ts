import { beforeEach, describe, expect, it, vi } from "vitest";

const { signInWithPassword, getUser, signOut, rpc } = vi.hoisted(() => ({
  signInWithPassword: vi.fn(),
  getUser: vi.fn(),
  signOut: vi.fn(),
  rpc: vi.fn(),
}));

vi.mock("@/integrations/supabase/client", () => ({
  supabase: {
    auth: { signInWithPassword, getUser, signOut },
    rpc,
  },
}));

import { getSession, login, logout } from "@/api/auth";

const adminUser = { id: "user-1", email: "admin@example.com", last_sign_in_at: "2026-10-21T00:00:00Z" };

beforeEach(() => {
  vi.clearAllMocks();
  signOut.mockResolvedValue({ error: null });
});

describe("login", () => {
  it("returns a session for valid admin credentials", async () => {
    signInWithPassword.mockResolvedValue({ data: { user: adminUser }, error: null });
    rpc.mockResolvedValue({ data: true, error: null });
    const session = await login("admin@example.com", "secret");
    expect(session.username).toBe("admin@example.com");
    expect(rpc).toHaveBeenCalledWith("has_role", { _user_id: "user-1", _role: "admin" });
  });

  it("rejects invalid credentials without checking roles", async () => {
    signInWithPassword.mockResolvedValue({ data: { user: null }, error: new Error("invalid") });
    await expect(login("admin@example.com", "wrong")).rejects.toThrow("Email atau kata sandi salah.");
    expect(rpc).not.toHaveBeenCalled();
  });

  it("denies and signs out a valid non-admin account", async () => {
    signInWithPassword.mockResolvedValue({ data: { user: adminUser }, error: null });
    rpc.mockResolvedValue({ data: false, error: null });
    await expect(login("admin@example.com", "secret")).rejects.toThrow("Akun ini tidak memiliki akses admin.");
    expect(signOut).toHaveBeenCalled();
  });

  it("denies access when the role check itself fails", async () => {
    signInWithPassword.mockResolvedValue({ data: { user: adminUser }, error: null });
    rpc.mockResolvedValue({ data: null, error: new Error("db down") });
    await expect(login("admin@example.com", "secret")).rejects.toThrow("Akun ini tidak memiliki akses admin.");
    expect(signOut).toHaveBeenCalled();
  });
});

describe("getSession", () => {
  it("returns the admin session for a signed-in admin", async () => {
    getUser.mockResolvedValue({ data: { user: adminUser }, error: null });
    rpc.mockResolvedValue({ data: true, error: null });
    const session = await getSession();
    expect(session?.username).toBe("admin@example.com");
    expect(session?.loggedInAt).toBe("2026-10-21T00:00:00Z");
  });

  it("returns null when signed out", async () => {
    getUser.mockResolvedValue({ data: { user: null }, error: null });
    expect(await getSession()).toBeNull();
  });

  it("returns null for a signed-in non-admin", async () => {
    getUser.mockResolvedValue({ data: { user: adminUser }, error: null });
    rpc.mockResolvedValue({ data: false, error: null });
    expect(await getSession()).toBeNull();
  });
});

describe("logout", () => {
  it("signs out through Supabase", async () => {
    await logout();
    expect(signOut).toHaveBeenCalledOnce();
  });
});
