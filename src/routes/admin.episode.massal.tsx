import { createFileRoute, Outlet } from "@tanstack/react-router";
export const Route = createFileRoute("/admin/episode/massal")({ staticData: { sitemap: false }, component: () => <Outlet /> });
