import { expect, it, vi } from "vitest";
vi.mock("@/integrations/supabase/client", () => ({ supabase: {} }));
import { AD_SLOTS, isAdActive, parseAdSlots } from "@/api/ad-slots";
import { AdLoadRegistry } from "@/lib/ad-runtime";

it("keeps the four requested independent slots", () => {
  expect(AD_SLOTS.map((slot) => slot.id)).toEqual(["homepage_banner_1", "homepage_banner_2", "social_bar", "popunder"]);
});
it("never loads disabled slots even when a full script is saved", () => {
  expect(isAdActive({ enabled: false, code: "<script></script>" })).toBe(false);
});
it("never loads empty enabled slots", () => {
  expect(isAdActive({ enabled: true, code: " \n " })).toBe(false);
});
it("preserves complete administrator-entered script tags", () => {
  const code = "<script>var config = { key: 'manual' };</script>";
  expect(parseAdSlots({ social_bar: { code, enabled: true } }).social_bar).toEqual({ code, enabled: true });
});
it("does not reload Popunder across route or episode transitions", () => {
  const registry = new AdLoadRegistry();
  const setting = { enabled: true, code: "<script></script>" };
  expect(registry.claim("popunder", setting)).toBe(true);
  expect(registry.claim("popunder", setting)).toBe(false);
  expect(registry.claim("popunder", { ...setting, code: "<script>/* edited */</script>" })).toBe(false);
});
it("deduplicates Social Bar independently of Popunder", () => {
  const registry = new AdLoadRegistry();
  const setting = { enabled: true, code: "<script></script>" };
  expect(registry.claim("social_bar", setting)).toBe(true);
  expect(registry.claim("social_bar", setting)).toBe(false);
  expect(registry.claim("popunder", setting)).toBe(true);
});
it("does not reserve a disabled slot before it is enabled", () => {
  const registry = new AdLoadRegistry();
  expect(registry.claim("social_bar", { enabled: false, code: "<script></script>" })).toBe(false);
  expect(registry.claim("social_bar", { enabled: true, code: "<script></script>" })).toBe(true);
});