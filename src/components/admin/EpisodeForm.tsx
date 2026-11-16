import { useRef, useState, type FormEvent } from "react";
import { SafeImage } from "@/components/SafeImage";
import { Link, useBlocker, useNavigate } from "@tanstack/react-router";
import { useQueryClient } from "@tanstack/react-query";
import { Save, Play } from "lucide-react";
import { toast } from "sonner";
import type { Anime, Episode, SpecialEpisodeLabel } from "@/api/types";
import { saveEpisode } from "@/api/admin-episodes";
import {
  episodeInputSchema,
  nextEpisodeNumber,
  videoLinkError,
  type EpisodeInput,
} from "@/api/episode-validation";
import { cropThumbnail, THUMBNAIL_HINT } from "@/lib/thumbnail-upload";
import { describeCrop } from "@/lib/image-crop";
import { LIST_CARD_ASPECT } from "@/components/PosterCard";
import { ImageUploadField } from "@/components/admin/ImageUploadField";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { UniversalPlayer } from "@/components/player/UniversalPlayer";

const SPECIAL_LABEL_OPTIONS: {
  value: SpecialEpisodeLabel | "regular";
  label: string;
}[] = [
  { value: "regular", label: "Episode biasa" },
  { value: "ova", label: "OVA" },
  { value: "ona", label: "ONA" },
  { value: "special", label: "Special" },
  { value: "extra", label: "Extra" },
  { value: "final", label: "Final" },
];

function toFormValues(
  anime: Anime,
  episode?: Episode,
  episodes: Episode[] = [],
): EpisodeInput {
  const specialLabel = episode?.specialLabel ?? null;

  return {
    animeId: anime.id,
    number:
      specialLabel !== null
        ? null
        : episode?.number ?? nextEpisodeNumber(episodes, anime.id),
    specialLabel,
    title: episode?.title ?? "",
    embedUrl: episode?.embedUrl ?? "",
    thumbnailUrl: episode?.thumbnailUrl ?? "",
    isPublished: episode?.isPublished ?? false,
  };
}

export function EpisodeForm({
  anime,
  episode,
  episodes,
}: {
  anime: Anime;
  episode?: Episode;
  episodes: Episode[];
}) {
  const [values, setValues] = useState<EpisodeInput>(() =>
    toFormValues(anime, episode, episodes),
  );
  const [mode, setMode] = useState(
    episode?.thumbnailUrl && episode.thumbnailUrl !== anime.posterUrl
      ? "upload"
      : "poster",
  );
  const [dirty, setDirty] = useState(false);
  const [busy, setBusy] = useState(false);
  const [imageBusy, setImageBusy] = useState(false);
  const [errors, setErrors] = useState<
    Partial<Record<keyof EpisodeInput, string>>
  >({});
  const [error, setError] = useState("");
  const [preview, setPreview] = useState("");
  const [imageInfo, setImageInfo] = useState("");
  const skipWarning = useRef(false);
  const navigate = useNavigate();
  const queryClient = useQueryClient();

  useBlocker({
    shouldBlockFn: () =>
      dirty &&
      !skipWarning.current &&
      !window.confirm("Perubahan belum disimpan. Tinggalkan halaman ini?"),
    enableBeforeUnload: dirty,
  });

  function change<K extends keyof EpisodeInput>(
    key: K,
    value: EpisodeInput[K],
  ) {
    setValues((previous) => ({ ...previous, [key]: value }));
    setDirty(true);
    skipWarning.current = false;
    setErrors((previous) => ({ ...previous, [key]: "" }));

    if (key === "embedUrl") {
      setPreview("");
    }
  }

  function changeEpisodeKind(value: SpecialEpisodeLabel | "regular") {
    const specialLabel = value === "regular" ? null : value;

    setValues((previous) => ({
      ...previous,
      specialLabel,
      number:
        specialLabel === null
          ? previous.number ?? nextEpisodeNumber(episodes, anime.id)
          : null,
    }));

    setDirty(true);
    skipWarning.current = false;
    setErrors((previous) => ({ ...previous, number: "", specialLabel: "" }));
    setError("");
  }

  async function upload(file: File) {
    setImageBusy(true);
    setError("");

    try {
      const image = await cropThumbnail(file);
      change("thumbnailUrl", image.dataUrl);
      setImageInfo(describeCrop(image));
    } catch (cause) {
      setError(
        cause instanceof Error ? cause.message : "Gambar gagal diproses.",
      );
    } finally {
      setImageBusy(false);
    }
  }

  function testVideo() {
    const link = values.embedUrl.trim();
    const message = videoLinkError(link);

    setErrors((previous) => ({
      ...previous,
      embedUrl: message ?? "",
    }));

    setPreview(message ? "" : link);
  }

  async function submit(published: boolean) {
    const candidate: EpisodeInput = {
      ...values,
      number: values.specialLabel === null ? values.number : null,
      specialLabel: values.specialLabel ?? null,
      thumbnailUrl: mode === "poster" ? "" : values.thumbnailUrl,
      isPublished: published,
    };

    const validation = episodeInputSchema.safeParse(candidate);

    const issues: Partial<Record<keyof EpisodeInput, string>> =
      validation.success
        ? {}
        : Object.fromEntries(
            validation.error.issues.map((issue) => [
              String(issue.path[0]),
              issue.message,
            ]),
          );

    const linkError = videoLinkError(candidate.embedUrl.trim());

    if (linkError) {
      issues.embedUrl = linkError;
    }

    if (
      candidate.specialLabel === null &&
      candidate.number !== null &&
      episodes.some(
        (item) =>
          item.animeId === anime.id &&
          item.number === candidate.number &&
          item.id !== episode?.id,
      )
    ) {
      issues.number = "Nomor episode sudah digunakan untuk anime ini.";
    }

    if (mode === "upload" && !candidate.thumbnailUrl) {
      issues.thumbnailUrl = "Unggah gambar thumbnail terlebih dahulu.";
    }

    setErrors(issues);

    if (Object.keys(issues).length > 0) {
      setError("Periksa kembali kolom yang ditandai.");
      return;
    }

    setBusy(true);
    setError("");

    try {
      const saved = await saveEpisode(candidate, episode?.id);

      skipWarning.current = true;
      setDirty(false);
      setValues({
        animeId: saved.animeId,
        number: saved.number,
        specialLabel: saved.specialLabel ?? null,
        title: saved.title,
        embedUrl: saved.embedUrl,
        thumbnailUrl: saved.thumbnailUrl ?? "",
        isPublished: saved.isPublished,
      });

      await queryClient.invalidateQueries();

      toast.success(
        published
          ? "Episode berhasil disimpan dan diterbitkan."
          : "Draf episode berhasil disimpan.",
        {
          duration: 12000,
          action: {
            label: "Tambah episode berikutnya",
            onClick: () => {
              void navigate({
                to: "/admin/episode/baru/$animeId",
                params: { animeId: anime.id },
              });
            },
          },
          cancel: {
            label: "Lihat di situs",
            onClick: () => {
              if (!saved.isPublished || !anime.isPublished) {
                toast.info(
                  "Episode belum tampil di situs. Terbitkan anime dan episode terlebih dahulu.",
                );
                return;
              }

              if (saved.specialLabel) {
                void navigate({
                  to: "/anime/$slug/episode-khusus/$episodeId",
                  params: {
                    slug: anime.slug,
                    episodeId: saved.id,
                  },
                });
                return;
              }

              if (saved.number === null) {
                toast.error("Nomor episode tidak tersedia.");
                return;
              }

              void navigate({
                to: "/anime/$slug/episode/$number",
                params: {
                  slug: anime.slug,
                  number: String(saved.number),
                },
              });
            },
          },
        },
      );

      await navigate({
        to: "/admin/episode/$id",
        params: { id: saved.id },
      });
    } catch (cause) {
      const message =
        cause instanceof Error ? cause.message : "Episode gagal disimpan.";

      setError(message);
      toast.error(message);
    } finally {
      setBusy(false);
    }
  }

  function onSubmit(event: FormEvent) {
    event.preventDefault();
    void submit(true);
  }

  return (
    <section className="max-w-4xl">
      <h1 className="text-3xl font-bold tracking-normal">
        {episode ? "Edit episode" : "Tambah episode"}
      </h1>

      <div className="my-6 flex items-center gap-4">
        <SafeImage
          src={anime.posterUrl}
          alt={anime.title}
          className="h-20 w-14 shrink-0 rounded-sm object-cover"
        />

        <div className="min-w-0">
          <h2 className="break-words text-lg font-semibold">{anime.title}</h2>

          {!episode && (
            <Button asChild variant="link" className="h-auto px-0">
              <Link to="/admin/episode/baru">Ganti anime</Link>
            </Button>
          )}
        </div>
      </div>

      <form onSubmit={onSubmit} noValidate className="space-y-6">
        <fieldset disabled={busy} className="space-y-6">
          <div className="space-y-2">
            <Label htmlFor="episode-kind">Jenis episode</Label>

            <select
              id="episode-kind"
              className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
              value={values.specialLabel ?? "regular"}
              onChange={(event) =>
                changeEpisodeKind(
                  event.target.value as SpecialEpisodeLabel | "regular",
                )
              }
            >
              {SPECIAL_LABEL_OPTIONS.map((option) => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </select>
          </div>

          <div className="grid gap-5 sm:grid-cols-[160px_minmax(0,1fr)]">
            {values.specialLabel === null ? (
              <div className="space-y-2">
                <Label htmlFor="episode-number">Nomor episode *</Label>

                <Input
                  id="episode-number"
                  type="number"
                  min={0}
                  step={1}
                  value={
                    values.number === null || Number.isNaN(values.number)
                      ? ""
                      : values.number
                  }
                  aria-invalid={Boolean(errors.number)}
                  onChange={(event) =>
                    change(
                      "number",
                      event.target.value === ""
                        ? null
                        : Number(event.target.value),
                    )
                  }
                />

                {errors.number && (
                  <p className="text-sm text-destructive">{errors.number}</p>
                )}
              </div>
            ) : (
              <div className="flex items-center rounded-md border border-dashed border-border p-3 text-sm text-muted-foreground">
                Jenis {values.specialLabel.toUpperCase()} tidak menggunakan
                nomor episode.
              </div>
            )}

            <div className="space-y-2">
              <Label htmlFor="episode-title">Judul episode (opsional)</Label>
              <Input
                id="episode-title"
                value={values.title}
                onChange={(event) => change("title", event.target.value)}
              />
            </div>
          </div>

          <div className="space-y-3">
            <Label>Gambar thumbnail</Label>

            <RadioGroup
              value={mode}
              aria-label="Gambar thumbnail"
              onValueChange={(value) => {
                setMode(value);
                change("thumbnailUrl", values.thumbnailUrl ?? "");
              }}
            >
              <div className="flex items-center gap-2">
                <RadioGroupItem id="anime-poster" value="poster" />
                <Label htmlFor="anime-poster">Gunakan poster anime</Label>
              </div>

              <div className="flex items-center gap-2">
                <RadioGroupItem id="upload-thumbnail" value="upload" />
                <Label htmlFor="upload-thumbnail">Unggah gambar</Label>
              </div>
            </RadioGroup>

            {mode === "poster" ? (
              <div className="flex items-center gap-3">
                <SafeImage
                  src={anime.posterUrl}
                  alt={`Poster ${anime.title}`}
                  className="aspect-[2/3] w-16 shrink-0 rounded-sm border border-border object-cover object-center"
                />
                <p className="text-sm text-muted-foreground">
                  Gambar kartu akan memakai poster anime
                </p>
              </div>
            ) : (
              <ImageUploadField
                id="episode-thumbnail"
                label="Gambar thumbnail"
                value={values.thumbnailUrl ?? ""}
                hint={THUMBNAIL_HINT}
                info={imageInfo}
                error={errors.thumbnailUrl}
                busy={imageBusy}
                previewClassName={`${LIST_CARD_ASPECT} w-full max-w-xl`}
                onFile={(file) => void upload(file)}
                onRemove={() => {
                  change("thumbnailUrl", "");
                  setImageInfo("");
                  setMode("poster");
                }}
              />
            )}
          </div>

          <div className="space-y-2">
            <Label htmlFor="episode-video">Link sumber video</Label>

            <div className="flex flex-wrap gap-2">
              <Input
                id="episode-video"
                type="url"
                value={values.embedUrl}
                className="min-w-0 flex-1"
                aria-invalid={Boolean(errors.embedUrl)}
                onChange={(event) => change("embedUrl", event.target.value)}
              />

              <Button type="button" variant="outline" onClick={testVideo}>
                <Play />
                Tes video
              </Button>
            </div>

            {errors.embedUrl && (
              <p className="text-sm text-destructive">{errors.embedUrl}</p>
            )}
          </div>

          {preview && (
            <UniversalPlayer
              key={preview}
              embedUrl={preview}
              title="Pratinjau video episode"
            />
          )}
        </fieldset>

        {error && (
          <p
            role="alert"
            className="rounded-md border border-destructive/40 bg-destructive/10 p-3 text-sm text-destructive"
          >
            {error}
          </p>
        )}

        <div className="flex flex-wrap gap-3 border-t border-border pt-6">
          <Button
            type="button"
            variant="outline"
            disabled={busy || imageBusy}
            onClick={() => void submit(false)}
          >
            <Save />
            Simpan sebagai draf
          </Button>

          <Button type="submit" disabled={busy || imageBusy}>
            {busy
              ? "Menyimpan…"
              : episode?.isPublished
                ? "Perbarui"
                : "Terbitkan"}
          </Button>
        </div>
      </form>
    </section>
  );
}
