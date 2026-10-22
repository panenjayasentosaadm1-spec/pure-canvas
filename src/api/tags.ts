
import { supabase } from "@/integrations/supabase/client";
import type { Database } from "@/integrations/supabase/types";
import type { Tag } from "./types";

type TagRow = Database["public"]["Tables"]["tags"]["Row"];

function mapTag(row: TagRow): Tag {
  return {
    id: row.id,
    name: row.name,
    slug: row.slug,
  };
}

export async function listTags(): Promise<Tag[]> {
  const { data, error } = await supabase
    .from("tags")
    .select("*")
    .order("name", { ascending: true });

  if (error) {
    throw new Error(`Failed to load genres: ${error.message}`);
  }

  return (data ?? []).map(mapTag);
}

export async function getTagBySlug(
  slug: string,
): Promise<Tag | null> {
  const { data, error } = await supabase
    .from("tags")
    .select("*")
    .eq("slug", slug)
    .maybeSingle();

  if (error) {
    throw new Error(`Failed to load genre: ${error.message}`);
  }

  return data ? mapTag(data) : null;
}
