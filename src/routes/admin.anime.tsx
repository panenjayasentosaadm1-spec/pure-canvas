import { createFileRoute, Outlet } from "@tanstack/react-router";
export const Route = createFileRoute("/admin/anime")({ staticData: { sitemap: false }, component: () => <Outlet /> });