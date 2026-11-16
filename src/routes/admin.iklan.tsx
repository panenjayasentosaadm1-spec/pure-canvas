import { createFileRoute } from "@tanstack/react-router";
import { useSuspenseQuery } from "@tanstack/react-query";
import { AD_SLOTS, adminAdSlotsQuery } from "@/api/ad-slots";
import { AdSlotForm } from "@/components/admin/AdSlotForm";
import { ResourceError } from "@/components/ResourceState";
import { adminHead } from "@/lib/admin-head";

export const Route = createFileRoute("/admin/iklan")({ staticData: { sitemap: false },
  head: () => adminHead("Pengelolaan Iklan", "Kelola banner beranda, Social Bar, dan Popunder UsagiNime."),
  loader: ({ context }) => context.queryClient.fetchQuery(adminAdSlotsQuery),
  errorComponent: ResourceError,
  component: AdManagement,
});
function AdManagement() {
  const { data } = useSuspenseQuery(adminAdSlotsQuery);
  return <section className="min-w-0"><h1 className="text-3xl font-bold">Pengelolaan Iklan</h1>
    {AD_SLOTS.map((slot) => <AdSlotForm key={slot.id} slot={slot} saved={data[slot.id]} />)}
  </section>;
}