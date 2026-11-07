import { SiteLayout, PageTitle } from "./SiteLayout";

export function PlaceholderPage({ title, text }: { title: string; text: string }) {
  return (
    <SiteLayout>
      <PageTitle title={title} />
      <p className="max-w-2xl text-muted-foreground">{text}</p>
    </SiteLayout>
  );
}
