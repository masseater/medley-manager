export type Song = {
  id: number;
  title: string;
  artist: string | null;
  url: string | null;
  genre: string | null;
  note: string | null;
  aliases: string[];
  use_count?: number;
};

export type Video = {
  id: number;
  title: string;
  kind: "medley" | "collab" | "single" | "other";
  video_id: string | null;
  url: string | null;
  uploader: string | null;
  published_at: string | null;
  note: string | null;
  comment: string | null;
  part_count?: number;
};

type PartStaff = { person_id: number; name: string; role: "audio" | "video" | "other" };

export type Part = {
  id: number;
  video_id: number;
  position: number;
  song_id: number | null;
  song_title: string | null;
  ref_video_id: number | null;
  ref_video_title: string | null;
  label: string | null;
  bpm: string | null;
  bars: string | null;
  start_sec: number | null;
  end_sec: number | null;
  note: string | null;
  comment: string | null;
  staff: PartStaff[];
};

export type SongDetail = Song & {
  usage: {
    direct: (Video & { parts: Part[] })[];
    indirect: (Video & { via: string[] })[];
  };
};

export type VideoDetail = Video & { parts: Part[]; referenced_by: Video[] };

export type Person = { id: number; name: string; part_count?: number };

export type PersonDetail = Person & {
  aliases: string[];
  works: {
    role: string;
    position: number;
    label: string | null;
    song_title: string | null;
    song_id: number | null;
    video_id_pk: number;
    video_title: string;
  }[];
};

export type Stats = { songs: number; videos: number; parts: number; people: number };

export async function api<T>(path: string): Promise<T> {
  const res = await fetch(`/api${path}`);
  if (!res.ok) throw new Error(`${res.status} ${res.statusText}`);
  return res.json();
}

export async function saveComment(
  target: "videos" | "parts",
  id: number,
  comment: string
): Promise<void> {
  const res = await fetch(`/api/${target}/${id}/comment`, {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ comment: comment.trim() || null }),
  });
  if (!res.ok) throw new Error(`${res.status} ${res.statusText}`);
}

export const KIND_LABEL: Record<Video["kind"], string> = {
  medley: "メドレー",
  collab: "合作",
  single: "単品",
  other: "その他",
};

export function fmtTime(sec: number): string {
  const m = Math.floor(sec / 60);
  const s = Math.floor(sec % 60);
  return `${m}:${String(s).padStart(2, "0")}`;
}

/** 動画の視聴URL（start_sec があれば時刻付き） */
export function watchUrl(v: { video_id: string | null; url: string | null }, startSec?: number | null): string | null {
  if (v.video_id && /^(sm|nm|so)\d+$/.test(v.video_id)) {
    const base = `https://www.nicovideo.jp/watch/${v.video_id}`;
    return startSec != null ? `${base}?from=${Math.floor(startSec)}` : base;
  }
  if (v.video_id && /^[\w-]{11}$/.test(v.video_id) && (v.url ?? "").includes("youtu")) {
    const base = `https://www.youtube.com/watch?v=${v.video_id}`;
    return startSec != null ? `${base}&t=${Math.floor(startSec)}s` : base;
  }
  return v.url;
}
