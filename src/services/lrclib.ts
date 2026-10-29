// LRCLIB (https://lrclib.net) public lyrics search client. Real network calls only.
export interface LrclibTrack {
  id: number;
  trackName: string;
  artistName: string;
  albumName: string;
  duration: number;
  instrumental: boolean;
  plainLyrics: string | null;
  syncedLyrics: string | null;
}

export interface LrclibSearchQuery {
  q?: string;
  trackName?: string;
  artistName?: string;
}

const BASE = "https://lrclib.net/api";

export class LrclibError extends Error {
  constructor(
    message: string,
    readonly status?: number,
  ) {
    super(message);
  }
}

export async function searchLrclib(
  query: LrclibSearchQuery,
  signal?: AbortSignal,
): Promise<LrclibTrack[]> {
  const params = new URLSearchParams();
  if (query.q) params.set("q", query.q);
  if (query.trackName) params.set("track_name", query.trackName);
  if (query.artistName) params.set("artist_name", query.artistName);
  if (![...params.keys()].length) throw new LrclibError("请输入歌名或歌手");
  const res = await fetch(`${BASE}/search?${params}`, { signal: signal ?? null });
  if (!res.ok) throw new LrclibError(`LRCLIB 检索失败 (${res.status})`, res.status);
  return (await res.json()) as LrclibTrack[];
}

export async function getLrclibTrack(id: number, signal?: AbortSignal): Promise<LrclibTrack> {
  const res = await fetch(`${BASE}/get/${id}`, { signal: signal ?? null });
  if (!res.ok) throw new LrclibError(`LRCLIB 获取失败 (${res.status})`, res.status);
  return (await res.json()) as LrclibTrack;
}
