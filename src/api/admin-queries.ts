import { queryOptions } from "@tanstack/react-query";
import { getAdminSnapshot } from "./admin";
export const adminSnapshotQuery = queryOptions({ queryKey: ["admin", "snapshot"], queryFn: getAdminSnapshot });