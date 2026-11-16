import { beforeEach, expect, it, vi } from "vitest";

const { from } = vi.hoisted(() => ({ from: vi.fn() }));
vi.mock("@/integrations/supabase/client", () => ({ supabase: { from } }));
import { getAdminSnapshot } from "@/api/admin";
import { getEmbedDomains } from "@/api/admin-site";

beforeEach(() => {
  vi.clearAllMocks();
  from.mockImplementation((table: string) => {
    if (table === "allowed_embed_domains") throw new Error("Domain table unavailable");
    const chain: Record<string, unknown> = {};
    for (const method of ["select", "order", "eq", "maybeSingle"]) chain[method] = () => chain;
    chain["then"] = (resolve: (value: unknown) => unknown) => Promise.resolve({ data: table === "site_settings" ? null : [], error: null }).then(resolve);
    return chain;
  });
});

it("loads the episode/admin snapshot even when the domain table cannot be read", async () => {
  const snapshot = await getAdminSnapshot();
  expect(snapshot.episodes).toEqual([]);
  expect(from.mock.calls.map(([table]) => table)).toEqual(["anime", "episodes", "tags", "site_settings"]);
});

it("keeps domain management separate and propagates its own failures", async () => {
  await expect(getEmbedDomains()).rejects.toThrow("Domain table unavailable");
  expect(from).toHaveBeenCalledWith("allowed_embed_domains");
});