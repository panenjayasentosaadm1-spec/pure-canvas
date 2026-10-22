import { createFileRoute, redirect } from "@tanstack/react-router";
import { getSession } from "@/api/auth";
import { AdminShell } from "@/components/admin/AdminShell";

export const Route = createFileRoute("/admin")({
  ssr: false,
  beforeLoad: async () => {
    const session = await getSession();
    if (!session) throw redirect({ to: "/admin/login" });
    return { session };
  },
  pendingComponent: () => <div className="flex min-h-screen items-center justify-center text-muted-foreground">Memeriksa akses…</div>,
  component: AdminShell,
});
