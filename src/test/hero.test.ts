import { expect, it, vi } from "vitest";
vi.mock("@/integrations/supabase/client", () => ({ supabase: {} }));
import { DEFAULT_HERO, HERO_MAX_ITEMS, isMissingHeroColumn, parseHero, serializeHero } from "@/api/hero";

it("falls back to a disabled hero when stored data is missing or broken", () => {
  expect(parseHero(null)).toEqual(DEFAULT_HERO);
  expect(parseHero("oops")).toEqual(DEFAULT_HERO);
  expect(parseHero({ items: "not-an-array", enabled: "yes" })).toEqual(DEFAULT_HERO);
});

it("keeps a valid saved hero intact", () => {
  expect(parseHero({ enabled: true, items: ["a", "b"] })).toEqual({ enabled: true, items: ["a", "b"] });
});

it("drops empty and duplicate anime entries when parsing", () => {
  expect(parseHero({ enabled: true, items: ["a", "", "a", "b"] }).items).toEqual(["a", "b"]);
});

it("caps the hero at the maximum item count", () => {
  const items = Array.from({ length: HERO_MAX_ITEMS + 3 }, (_, i) => `id-${i}`);
  expect(parseHero({ enabled: true, items }).items).toHaveLength(HERO_MAX_ITEMS);
});

it("serializes to a plain id list and round-trips", () => {
  const serialized = serializeHero({ enabled: true, items: [" x ", "x", "y"] });
  expect(serialized).toEqual({ enabled: true, items: ["x", "y"] });
  expect(parseHero(serialized)).toEqual({ enabled: true, items: ["x", "y"] });
});

it("detects the missing hero column before the migration runs", () => {
  expect(isMissingHeroColumn("Could not find the 'hero' column of 'site_settings' in the schema cache")).toBe(true);
  expect(isMissingHeroColumn("Gagal memuat")).toBe(false);
});
