import { useState, type FormEvent } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { MessageSquare, Reply } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Skeleton } from "@/components/ui/skeleton";
import {
  avatarHue, buildThreads, episodeCommentsKey, listEpisodeComments, relativeTime, submitComment,
  type PublicComment, type ThreadItem,
} from "@/api/comments";

const PAGE = 12;

export function EpisodeComments({ episodeId }: { episodeId: string }) {
  const query = useQuery({ queryKey: episodeCommentsKey(episodeId), queryFn: () => listEpisodeComments(episodeId), staleTime: 30_000 });
  const [visible, setVisible] = useState(PAGE);
  const [replyTo, setReplyTo] = useState<string | null>(null);
  const threads = query.data ? buildThreads(query.data) : [];
  const total = query.data?.length ?? 0;

  return (
    <section aria-labelledby="comments-heading" className="min-w-0">
      <h2 id="comments-heading" className="flex items-center gap-2 text-lg font-bold tracking-normal">
        <MessageSquare className="size-5" /> Komentar{query.data ? ` (${total})` : ""}
      </h2>
      <div className="mt-3"><CommentForm episodeId={episodeId} /></div>

      {query.isPending && <div className="mt-5 space-y-4" aria-label="Memuat komentar">{[0, 1, 2].map((i) => (
        <div key={i} className="flex gap-3"><Skeleton className="size-9 rounded-full" /><div className="flex-1 space-y-2"><Skeleton className="h-3 w-32" /><Skeleton className="h-3 w-full" /></div></div>
      ))}</div>}
      {query.isError && <div role="alert" className="mt-5 rounded-md border border-border p-4 text-sm text-muted-foreground">
        {query.error.message} <Button variant="link" className="h-auto p-0" onClick={() => void query.refetch()}>Coba lagi</Button>
      </div>}
      {query.data && threads.length === 0 && <p className="mt-5 text-sm text-muted-foreground">Belum ada komentar. Jadilah yang pertama!</p>}

      <ul className="mt-5 divide-y divide-border/60">
        {threads.slice(0, visible).map(({ root, items }) => (
          <li key={root.id} className="py-4">
            <CommentRow comment={root} depth={0} mention={null} episodeId={episodeId} replyTo={replyTo} setReplyTo={setReplyTo} />
            {items.map((item) => <ItemRow key={item.comment.id} item={item} episodeId={episodeId} replyTo={replyTo} setReplyTo={setReplyTo} />)}
          </li>
        ))}
      </ul>
      {threads.length > visible && (
        <Button variant="outline" className="mt-2 w-full" onClick={() => setVisible((v) => v + PAGE)}>Muat Komentar Lainnya</Button>
      )}
    </section>
  );
}

function ItemRow({ item, ...rest }: { item: ThreadItem; episodeId: string; replyTo: string | null; setReplyTo: (id: string | null) => void }) {
  return <CommentRow comment={item.comment} depth={item.depth} mention={item.mention} {...rest} />;
}

function CommentRow({ comment, depth, mention, episodeId, replyTo, setReplyTo }: {
  comment: PublicComment; depth: 0 | 1 | 2; mention: string | null; episodeId: string; replyTo: string | null; setReplyTo: (id: string | null) => void;
}) {
  const indent = depth === 0 ? "" : depth === 1 ? "ml-6 md:ml-11 mt-3" : "ml-12 md:ml-[5.5rem] mt-3";
  const hue = avatarHue(comment.authorName);
  return (
    <div className={indent}>
      <div className="flex gap-3">
        <span aria-hidden className="grid size-9 shrink-0 place-items-center rounded-full text-sm font-bold text-primary-foreground"
          style={{ backgroundColor: `hsl(${hue} 55% 45%)` }}>
          {comment.authorName.trim().charAt(0).toUpperCase() || "A"}
        </span>
        <div className="min-w-0 flex-1">
          <p className="text-sm"><span className="font-semibold">{comment.authorName}</span>{" "}
            <time dateTime={comment.createdAt} className="text-xs text-muted-foreground" title={new Date(comment.createdAt).toLocaleString("id-ID")}>{relativeTime(comment.createdAt)}</time></p>
          <p className={`mt-1 whitespace-pre-wrap break-words text-sm ${comment.isHidden ? "italic text-muted-foreground" : ""}`}>
            {mention && <span className="font-medium text-primary">@{mention} </span>}{comment.content}
          </p>
          {!comment.isHidden && (
            <Button variant="ghost" size="sm" className="mt-1 h-7 px-2 text-xs text-muted-foreground" onClick={() => setReplyTo(replyTo === comment.id ? null : comment.id)}>
              <Reply className="size-3.5" /> Balas
            </Button>
          )}
          {replyTo === comment.id && (
            <div className="mt-2"><CommentForm episodeId={episodeId} parentId={comment.id} replyingTo={comment.authorName} onDone={() => setReplyTo(null)} /></div>
          )}
        </div>
      </div>
    </div>
  );
}

function CommentForm({ episodeId, parentId = null, replyingTo, onDone }: { episodeId: string; parentId?: string | null; replyingTo?: string; onDone?: () => void }) {
  const qc = useQueryClient();
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [content, setContent] = useState("");
  const [honeypot, setHoneypot] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const idp = parentId ?? "root";

  async function onSubmit(event: FormEvent) {
    event.preventDefault();
    setBusy(true); setError(null);
    try {
      await submitComment({ episodeId, content, authorName: name, email, parentId, honeypot });
      setContent("");
      toast.success(parentId ? "Balasan terkirim." : "Komentar terkirim.");
      await qc.invalidateQueries({ queryKey: episodeCommentsKey(episodeId) });
      onDone?.();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Gagal mengirim komentar.");
    } finally { setBusy(false); }
  }

  return (
    <form onSubmit={onSubmit} className="space-y-2 rounded-md border border-border/60 p-3">
      {replyingTo && <p className="text-xs text-muted-foreground">Membalas <span className="font-medium text-foreground">{replyingTo}</span></p>}
      <div className="grid gap-2 sm:grid-cols-2">
        <Input aria-label="Nama (opsional)" placeholder="Nama (opsional)" maxLength={50} value={name} onChange={(e) => setName(e.target.value)} id={`c-name-${idp}`} />
        <Input aria-label="Email (opsional, tidak ditampilkan)" placeholder="Email (opsional, privat)" type="email" maxLength={254} value={email} onChange={(e) => setEmail(e.target.value)} id={`c-mail-${idp}`} />
      </div>
      <input type="text" name="website" tabIndex={-1} autoComplete="off" aria-hidden className="hidden" value={honeypot} onChange={(e) => setHoneypot(e.target.value)} />
      <Textarea aria-label="Komentar" placeholder="Tulis komentar…" required minLength={2} maxLength={1000} rows={3} value={content} onChange={(e) => setContent(e.target.value)} />
      {error && <p role="alert" className="text-sm text-destructive">{error}</p>}
      <div className="flex items-center justify-between gap-2">
        <span className="text-xs text-muted-foreground">{content.trim().length}/1000</span>
        <div className="flex gap-2">
          {onDone && <Button type="button" variant="ghost" size="sm" onClick={onDone}>Batal</Button>}
          <Button type="submit" size="sm" disabled={busy || content.trim().length < 2}>{busy ? "Mengirim…" : parentId ? "Kirim Balasan" : "Kirim Komentar"}</Button>
        </div>
      </div>
    </form>
  );
}
