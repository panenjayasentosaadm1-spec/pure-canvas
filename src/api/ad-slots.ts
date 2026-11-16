import { queryOptions } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

export const AD_SLOTS = [
  {
    id: "homepage_banner_1",
    name: "Banner Beranda 1",
    placement: "Di bawah karusel rekomendasi, sebelum Episode Terbaru.",
  },
  {
    id: "homepage_banner_2",
    name: "Banner Beranda 2",
    placement: "Di antara Episode Terbaru dan Anime Terbaru.",
  },
  {
    id: "social_bar",
    name: "Social Bar",
    placement: "Seluruh halaman publik.",
  },
  {
    id: "popunder",
    name: "Popunder",
    placement: "Seluruh halaman publik, dimuat sekali per kunjungan.",
  },
] as const;

export type AdSlotId = (typeof AD_SLOTS)[number]["id"];

export interface AdSlotSetting {
  code: string;
  enabled: boolean;
}

export type AdSlotSettings = Record<AdSlotId, AdSlotSetting>;

export function parseAdSlots(value: unknown): AdSlotSettings {
  const source =
    value && typeof value === "object"
      ? (value as Record<string, unknown>)
      : {};

  return Object.fromEntries(
    AD_SLOTS.map(({ id }) => {
      const raw = source[id];
      const slot =
        raw && typeof raw === "object"
          ? (raw as Record<string, unknown>)
          : {};

      return [
        id,
        {
          code: typeof slot["code"] === "string" ? slot["code"] : "",
          enabled: slot["enabled"] === true,
        },
      ];
    }),
  ) as AdSlotSettings;
}

export function isAdActive(slot: AdSlotSetting): boolean {
  return slot.enabled && slot.code.trim().length > 0;
}

export async function getAdSlots(): Promise<AdSlotSettings> {
  const { data, error } = await supabase
    .from("site_settings")
    .select("ad_slots")
    .eq("id", 1)
    .maybeSingle();

  if (error) {
    throw new Error(`Gagal memuat pengaturan iklan: ${error.message}`);
  }

  if (!data) {
    throw new Error("Pengaturan situs tidak ditemukan.");
  }

  return parseAdSlots(data.ad_slots);
}

export async function saveAdSlot(
  id: AdSlotId,
  setting: AdSlotSetting,
): Promise<void> {
  const { error } = await supabase.rpc("save_ad_slot", {
    _slot: id,
    _code: setting.code,
    _enabled: setting.enabled,
  });

  if (error) {
    throw new Error(`Gagal menyimpan pengaturan iklan: ${error.message}`);
  }
}

export const publicAdSlotsQuery = queryOptions({
  queryKey: ["public-ad-slots"],
  queryFn: getAdSlots,
  staleTime: 60_000,
});

export const adminAdSlotsQuery = queryOptions({
  queryKey: ["admin-ad-slots"],
  queryFn: getAdSlots,
  staleTime: 0,
});
