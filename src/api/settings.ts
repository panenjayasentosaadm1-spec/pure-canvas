
import { supabase } from "@/integrations/supabase/client";
import type { Database } from "@/integrations/supabase/types";
import type { SiteSettings } from "./types";

type SettingsRow = Database["public"]["Tables"]["site_settings"]["Row"];

export async function getSettings(): Promise<SiteSettings> {
  const { data, error } = await supabase
    .from("site_settings")
    .select("*")
    .eq("id", 1)
    .maybeSingle();

  if (error) {
    throw new Error(`Failed to load site settings: ${error.message}`);
  }

  if (!data) {
    throw new Error("Site settings have not been configured in Supabase.");
  }

  const settings: SettingsRow = data;

  let logoUrl: string | null = null;

  if (settings.logo_path) {
    if (/^https?:\/\//i.test(settings.logo_path)) {
      logoUrl = settings.logo_path;
    } else {
      const { data: imageData } = supabase.storage
        .from("site")
        .getPublicUrl(settings.logo_path);

      logoUrl = imageData.publicUrl;
    }
  }

  return {
    siteName: settings.site_name,
    tagline: settings.tagline ?? "",
    logoUrl,
    footerText: settings.footer_text ?? "",
  };
}
