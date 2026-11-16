import { createFileRoute, Outlet } from "@tanstack/react-router";

export const Route = createFileRoute("/anime")({
  // Layout tanpa halaman sendiri; URL /anime memakai leaf anime.index.
  staticData: { sitemap: false },
  component: () => <Outlet />,
});
