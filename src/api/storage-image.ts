import { supabase } from "@/integrations/supabase/client";

/** Only unwrap URLs belonging to this project's existing bucket, never external images. */
export function imageObjectPath(bucket: string, value: string): string {
  if (!/^https?:\/\//i.test(value)) return value;
  const publicUrl = new URL(supabase.storage.from(bucket).getPublicUrl("").data.publicUrl);
  const url = new URL(value);
  if (url.origin !== publicUrl.origin) return value;
  for (const access of ["public", "sign", "authenticated"]) {
    const prefix = `/storage/v1/object/${access}/${bucket}/`;
    if (url.pathname.startsWith(prefix)) return decodeURIComponent(url.pathname.slice(prefix.length));
  }
  return value;
}

/**
 * Posters live in a public bucket, so they are displayed through the public
 * URL helper. Generating signed URLs with the browser's publishable key is
 * rejected by Storage ("Object not found") and must not be used here.
 * This never throws: a missing or inaccessible poster resolves to an empty
 * string and the UI falls back to its placeholder instead of crashing the page.
 */
export async function posterDisplayUrl(path: string | null): Promise<string> {
  if (!path) return "";
  const objectPath = imageObjectPath("posters", path);
  if (/^https?:\/\//i.test(objectPath)) return objectPath;
  const { data } = supabase.storage.from("posters").getPublicUrl(objectPath);
  return data?.publicUrl ?? "";
}
