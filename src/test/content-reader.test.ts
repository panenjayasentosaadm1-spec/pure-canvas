import { beforeEach, describe, expect, it, vi } from 'vitest';

const { from, responses, calls } = vi.hoisted(() => ({
  from: vi.fn(), responses: [] as Array<{ data: unknown; error: unknown }>,
  calls: [] as Array<{ table: string; method: string; args: unknown[] }>,
}));
vi.mock('@/integrations/supabase/client', () => ({ supabase: { from } }));
import { readPublishedAnime, readPublishedAnimeBySlug, readPublishedEpisodes, readTags, readSiteSettings } from '@/api/content-reader';
import type { AnimeRow, EpisodeRow } from '@/api/content-mapping';

const anime: AnimeRow = { id: 'a1', title: 'Anime', slug: 'anime', alt_title: 'Alternatif',
  synopsis: null, poster_path: 'posters/a.jpg', studio: 'Studio', rating: 0,
  type: 'tv', status: 'ongoing', season: null, year: 2026, duration_minutes: 24,
  total_episodes: 12, is_published: true, created_at: '2026-01-01', updated_at: '2026-01-02' };
const episode: EpisodeRow = { id: 'e1', anime_id: 'a1', number: 2, title: null,
  embed_url: 'https://video.test/embed', thumbnail_path: 'thumbs/e.jpg', is_published: true,
  published_at: null, created_at: '2026-01-01', updated_at: '2026-01-02' };

beforeEach(() => {
  vi.clearAllMocks(); responses.length = 0; calls.length = 0;
  from.mockImplementation((table: string) => {
    const response = responses.shift();
    if (!response) throw new Error('Missing database response fixture');
    const chain: Record<string, unknown> = {};
    for (const method of ['select', 'eq', 'in', 'order', 'limit', 'maybeSingle']) {
      chain[method] = (...args: unknown[]) => { calls.push({ table, method, args }); return chain; };
    }
    chain["then"] = (resolve: (value: unknown) => unknown) => Promise.resolve(response).then(resolve);
    return chain;
  });
});
function ok(data: unknown) { responses.push({ data, error: null }); }
function fail() { responses.push({ data: null, error: { code: '42501', message: 'permission denied' } }); }

describe('Existing database read checkpoint', () => {
  it('filters unpublished anime even when an admin can read draft rows', async () => {
    ok([anime, { ...anime, id: 'draft', is_published: false }]); ok([]);
    expect((await readPublishedAnime()).map(row => row.id)).toEqual(['a1']);
    expect(calls).toContainEqual({ table: 'anime', method: 'eq', args: ['is_published', true] });
  });
  it('maps existing anime columns including poster_path and metadata', async () => {
    ok([anime]); ok([]);
    expect((await readPublishedAnime())[0]).toMatchObject({ posterUrl: 'posters/a.jpg',
      altTitle: 'Alternatif', studio: 'Studio', rating: 0, durationMinutes: 24, totalEpisodes: 12 });
    expect(calls.find(call => call.table === 'anime' && call.method === 'select')?.args[0]).toContain('poster_path');
  });
  it('reads anime-tag relationships and applies tag filtering', async () => {
    ok([anime]); ok([{ anime_id: 'a1', tag_id: 't1' }, { anime_id: 'other', tag_id: 't2' }]);
    expect((await readPublishedAnime({ tagId: 't1' }))[0]?.tagIds).toEqual(['t1']);
    expect(calls).toContainEqual({ table: 'anime_tags', method: 'in', args: ['anime_id', ['a1']] });
  });
  it('preserves text and status filtering', async () => {
    ok([anime]); ok([]); expect(await readPublishedAnime({ query: 'other' })).toEqual([]);
    ok([anime]); ok([]); expect(await readPublishedAnime({ status: 'completed' })).toEqual([]);
  });
  it('returns empty without mocks and returns null for a missing slug', async () => {
    ok([]); expect(await readPublishedAnime()).toEqual([]);
    ok([]); expect(await readPublishedAnimeBySlug('missing')).toBeNull();
    ok([]); expect(await readTags()).toEqual([]);
  });
  it('propagates database errors rather than replacing them with demo rows', async () => {
    fail(); await expect(readPublishedAnime()).rejects.toThrow('Data anime gagal dimuat.');
  });
  it('propagates relationship permission failures', async () => {
    ok([anime]); fail(); await expect(readPublishedAnime()).rejects.toThrow('Genre anime gagal dimuat.');
  });
  it('never returns episodes for an unpublished parent even if episode is published', async () => {
    ok({ id: 'a1', is_published: false });
    expect(await readPublishedEpisodes('a1')).toEqual([]);
    expect(from).not.toHaveBeenCalledWith('episodes');
  });
  it('returns empty for an absent parent', async () => {
    ok(null); expect(await readPublishedEpisodes('absent')).toEqual([]);
  });
  it('maps number and thumbnail_path, omitting draft and mismatched episodes', async () => {
    ok({ id: 'a1', is_published: true });
    ok([episode, { ...episode, id: 'draft', is_published: false }, { ...episode, anime_id: 'other' }]);
    expect(await readPublishedEpisodes('a1')).toEqual([{ id: 'e1', animeId: 'a1', number: 2,
      title: '', embedUrl: 'https://video.test/embed', thumbnailUrl: 'thumbs/e.jpg',
      isPublished: true, publishedAt: '', updatedAt: '2026-01-02' }]);
    expect(calls).toContainEqual({ table: 'episodes', method: 'eq', args: ['is_published', true] });
    expect(calls).toContainEqual({ table: 'episodes', method: 'order', args: ['number'] });
  });
  it('does not treat a parent permission error as missing content', async () => {
    fail(); await expect(readPublishedEpisodes('a1')).rejects.toThrow('Data anime gagal dimuat.');
  });
  it('propagates episode permission errors', async () => {
    ok({ id: 'a1', is_published: true }); fail();
    await expect(readPublishedEpisodes('a1')).rejects.toThrow('Episode gagal dimuat.');
  });
  it('maps logo_path and nullable settings without demo fallback', async () => {
    ok({ id: 1, site_name: 'UsagiNime', tagline: null, logo_path: 'logo.png', footer_text: null });
    expect(await readSiteSettings()).toEqual({ siteName: 'UsagiNime', tagline: '', logoUrl: 'logo.png', footerText: '' });
  });
  it('reports missing settings explicitly', async () => {
    ok(null); await expect(readSiteSettings()).rejects.toThrow('Pengaturan situs belum tersedia.');
  });
  it('propagates settings and tag permission failures', async () => {
    fail(); await expect(readSiteSettings()).rejects.toThrow('Pengaturan situs gagal dimuat.');
    fail(); await expect(readTags()).rejects.toThrow('Genre gagal dimuat.');
  });
});