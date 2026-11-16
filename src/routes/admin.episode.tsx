import { createFileRoute, Outlet } from "@tanstack/react-router";
export const Route = createFileRoute("/admin/episode")({ staticData: { sitemap: false }, component: () => <Outlet /> });