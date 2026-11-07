import { useQuery } from "@tanstack/react-query";
import { settingsQuery } from "@/api/queries";

export { settingsQuery };

export function useSiteSettings() {
  return useQuery(settingsQuery);
}
