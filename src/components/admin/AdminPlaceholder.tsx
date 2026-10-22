import { Link } from "@tanstack/react-router";
import { Button } from "@/components/ui/button";

export function AdminPlaceholder({ title }: { title: string }) {
  return <section><h1 className="text-3xl font-bold tracking-normal">{title}</h1><p className="mt-6 text-muted-foreground">Segera hadir</p><Button asChild variant="outline" className="mt-6"><Link to="/admin">Kembali ke dasbor</Link></Button></section>;
}