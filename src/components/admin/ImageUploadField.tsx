import { useRef } from "react";
import { ImageOff, Trash2, Upload } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

type Props = {
  id: string;
  label: string;
  value: string | null | undefined;
  hint: string;
  info?: string | undefined;
  error?: string | undefined;
  busy?: boolean;
  previewClassName: string;
  imageClassName?: string;
  buttonsClassName?: string;
  onFile: (file: File) => void;
  onRemove: () => void;
};

/** Image field: preview, "Ganti gambar"/"Hapus gambar" actions, hint and processed-file info. */
export function ImageUploadField({ id, label, value, hint, info, error, busy, previewClassName, imageClassName = "object-cover", buttonsClassName, onFile, onRemove }: Props) {
  const input = useRef<HTMLInputElement>(null);
  const hintId = `${id}-hint`;
  return (
    <div className="space-y-3">
      <div className={cn("flex items-center justify-center overflow-hidden rounded-md border border-border bg-card", previewClassName)}>
        {value ? <img src={value} alt={`Pratinjau ${label.toLocaleLowerCase("id")}`} loading="lazy" className={cn("h-full w-full object-center", imageClassName)} /> : <ImageOff className="size-10 text-muted-foreground" aria-hidden />}
      </div>
      <input ref={input} id={id} type="file" accept="image/jpeg,image/png,image/webp" aria-label={label} aria-describedby={hintId} className="sr-only" onChange={(event) => { const file = event.target.files?.[0]; if (file) onFile(file); event.target.value = ""; }} />
      <div className={cn("flex flex-wrap gap-2", buttonsClassName)}>
        <Button type="button" variant="outline" disabled={busy} onClick={() => input.current?.click()}><Upload />{busy ? "Memproses gambar…" : value ? "Ganti gambar" : "Unggah gambar"}</Button>
        {value && <Button type="button" variant="ghost" disabled={busy} onClick={onRemove}><Trash2 />Hapus gambar</Button>}
      </div>
      <p id={hintId} className="text-sm text-muted-foreground">{hint}</p>
      {info && <p className="break-words text-sm text-foreground" aria-live="polite">{info}</p>}
      {error && <p className="text-sm text-destructive">{error}</p>}
    </div>
  );
}
