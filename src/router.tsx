import {
  QueryClient,
  dehydrate,
  hydrate,
  type DehydratedState,
} from "@tanstack/react-query";
import { createRouter, type RouterOptions } from "@tanstack/react-router";
import { ResourceError } from "./components/ResourceState";
import { routeTree } from "./routeTree.gen";

/**
 * Bentuk hasil dehydrate yang diharapkan router, diambil dari tipe opsi
 * router itu sendiri. Hanya query sukses berisi data JSON polos yang
 * dikirim di bawah, tetapi tipe `DehydratedState` React Query tidak
 * menjamin aturan serialisasi router, jadi dipetakan sekali melalui
 * validator router alih-alih di-cast ke tipe arbitrer.
 */
type DehydratedForRouter = Awaited<
  ReturnType<
    NonNullable<RouterOptions<any, any, any, any, DehydratedState>["dehydrate"]>
  >
>;

export const getRouter = () => {
  const queryClient = new QueryClient();

  const router = createRouter({
    routeTree,
    defaultErrorComponent: ResourceError,
    context: { queryClient },
    scrollRestoration: true,
    // Preload halaman saat kursor di atas tautan agar navigasi terasa instan.
    defaultPreload: "intent",
    defaultPreloadDelay: 50,
    defaultPreloadStaleTime: 0,
    // Kirim cache Query yang diisi loader saat SSR ke browser, agar render
    // pertama klien memakai data yang sama dengan HTML dari server.
    dehydrate: (): DehydratedForRouter =>
      dehydrate(queryClient, {
        shouldDehydrateQuery: (query) => query.state.status === "success",
      }) as DehydratedForRouter,
    hydrate: (dehydrated) => {
      hydrate(queryClient, dehydrated);
    },
  });

  return router;
};
