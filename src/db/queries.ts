import { getDb } from "./db.js";

// ---------- 型 ----------

export type Song = {
  id: number;
  title: string;
  artist: string | null;
  url: string | null;
  genre: string | null;
  note: string | null;
  aliases: string[];
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

export type PartInput = {
  song_id?: number;
  song_title?: string;
  ref_video_id?: number;
  ref_video_title?: string;
  label?: string;
  bpm?: string;
  bars?: string;
  start_sec?: number;
  end_sec?: number;
  note?: string;
  comment?: string | null;
  audio_staff?: string[];
  video_staff?: string[];
};

const like = (q: string) => `%${q.replace(/[%_]/g, (m) => "\\" + m)}%`;

// ---------- 曲 ----------

function songRow(row: any): Song {
  const db = getDb();
  const aliases = db
    .prepare("SELECT alias FROM song_aliases WHERE song_id = ? ORDER BY id")
    .all(row.id)
    .map((r: any) => r.alias);
  return { ...row, aliases };
}

export function getSong(id: number): Song | null {
  const row = getDb().prepare("SELECT id, title, artist, url, genre, note FROM songs WHERE id = ?").get(id);
  return row ? songRow(row) : null;
}

export function listSongs(q?: string): (Song & { use_count: number })[] {
  const db = getDb();
  const where = q
    ? `WHERE s.title LIKE ? ESCAPE '\\' OR s.artist LIKE ? ESCAPE '\\'
       OR s.id IN (SELECT song_id FROM song_aliases WHERE alias LIKE ? ESCAPE '\\')`
    : "";
  const params = q ? [like(q), like(q), like(q)] : [];
  const rows = db
    .prepare(
      `SELECT s.id, s.title, s.artist, s.url, s.genre, s.note,
        (SELECT COUNT(DISTINCT p.video_id) FROM parts p WHERE p.song_id = s.id) AS use_count
       FROM songs s ${where} ORDER BY use_count DESC, s.title`
    )
    .all(...params);
  return rows.map((r: any) => ({ ...songRow(r), use_count: r.use_count }));
}

/** 完全一致（タイトル or エイリアス）で曲を探す */
export function resolveSongByTitle(title: string): Song | null {
  const t = title.trim();
  const db = getDb();
  const row = db
    .prepare(
      `SELECT s.id FROM songs s WHERE s.title = ?
       UNION SELECT song_id FROM song_aliases WHERE alias = ? LIMIT 1`
    )
    .get(t, t) as any;
  return row ? getSong(row.id) : null;
}

export function createSong(input: {
  title: string;
  artist?: string;
  url?: string;
  genre?: string;
  note?: string;
  aliases?: string[];
}): Song {
  const db = getDb();
  const info = db
    .prepare("INSERT INTO songs (title, artist, url, genre, note) VALUES (?, ?, ?, ?, ?)")
    .run(input.title.trim(), input.artist ?? null, input.url ?? null, input.genre ?? null, input.note ?? null);
  const id = Number(info.lastInsertRowid);
  for (const a of input.aliases ?? []) addSongAlias(id, a);
  return getSong(id)!;
}

export function updateSong(
  id: number,
  patch: Partial<{ title: string; artist: string | null; url: string | null; genre: string | null; note: string | null }>
): Song | null {
  const db = getDb();
  const fields = Object.entries(patch).filter(([k]) => ["title", "artist", "url", "genre", "note"].includes(k));
  if (fields.length) {
    const sets = fields.map(([k]) => `${k} = ?`).join(", ");
    db.prepare(`UPDATE songs SET ${sets}, updated_at = datetime('now') WHERE id = ?`).run(
      ...fields.map(([, v]) => v),
      id
    );
  }
  return getSong(id);
}

export function deleteSong(id: number): boolean {
  return getDb().prepare("DELETE FROM songs WHERE id = ?").run(id).changes > 0;
}

export function addSongAlias(songId: number, alias: string): void {
  getDb().prepare("INSERT OR IGNORE INTO song_aliases (song_id, alias) VALUES (?, ?)").run(songId, alias.trim());
}

export function removeSongAlias(songId: number, alias: string): boolean {
  return getDb().prepare("DELETE FROM song_aliases WHERE song_id = ? AND alias = ?").run(songId, alias).changes > 0;
}

/** 重複曲の名寄せ: source を target に統合する */
export function mergeSongs(sourceId: number, targetId: number): Song | null {
  const db = getDb();
  const source = getSong(sourceId);
  const target = getSong(targetId);
  if (!source || !target || sourceId === targetId) return null;
  const tx = db.transaction(() => {
    db.prepare("UPDATE parts SET song_id = ? WHERE song_id = ?").run(targetId, sourceId);
    addSongAlias(targetId, source.title);
    for (const a of source.aliases) addSongAlias(targetId, a);
    db.prepare("DELETE FROM songs WHERE id = ?").run(sourceId);
  });
  tx();
  return getSong(targetId);
}

// ---------- 曲の使用状況（逆引き） ----------

export type SongUsage = {
  direct: (Video & { parts: Part[] })[];
  /** 直接使用している動画（メドレー等）をさらに引用している動画 */
  indirect: (Video & { via: string[] })[];
};

export function getSongUsage(songId: number): SongUsage {
  const db = getDb();
  const directRows = db
    .prepare(
      `SELECT v.id, v.title, v.kind, v.video_id, v.url, v.uploader, v.published_at, v.note, v.comment
       FROM videos v WHERE v.id IN (SELECT DISTINCT video_id FROM parts WHERE song_id = ?)
       ORDER BY v.title`
    )
    .all(songId) as any[];
  const direct = directRows.map((v) => ({
    ...v,
    parts: getVideoParts(v.id).filter((p) => p.song_id === songId),
  }));

  const directIds = new Set(direct.map((v) => v.id));
  const indirectRows = db
    .prepare(
      `WITH RECURSIVE reach(video_id, via_id, depth) AS (
         SELECT p.video_id, p.ref_video_id, 1
         FROM parts p WHERE p.ref_video_id IN (SELECT DISTINCT video_id FROM parts WHERE song_id = ?)
         UNION
         SELECT p.video_id, r.via_id, r.depth + 1
         FROM parts p JOIN reach r ON p.ref_video_id = r.video_id
         WHERE r.depth < 10
       )
       SELECT v.id, v.title, v.kind, v.video_id, v.url, v.uploader, v.published_at, v.note, v.comment,
              group_concat(DISTINCT vv.title) AS via
       FROM reach r
       JOIN videos v ON v.id = r.video_id
       JOIN videos vv ON vv.id = r.via_id
       GROUP BY v.id ORDER BY v.title`
    )
    .all(songId) as any[];
  const indirect = indirectRows
    .filter((v) => !directIds.has(v.id))
    .map((v) => ({ ...v, via: String(v.via ?? "").split(",").filter(Boolean) }));
  return { direct, indirect };
}

// ---------- 動画 ----------

export function getVideoRow(id: number): Video | null {
  return (
    (getDb()
      .prepare("SELECT id, title, kind, video_id, url, uploader, published_at, note, comment FROM videos WHERE id = ?")
      .get(id) as Video | undefined) ?? null
  );
}

export function listVideos(q?: string, kind?: string): (Video & { part_count: number })[] {
  const conds: string[] = [];
  const params: any[] = [];
  if (q) {
    conds.push("(v.title LIKE ? ESCAPE '\\' OR v.video_id LIKE ? ESCAPE '\\' OR v.uploader LIKE ? ESCAPE '\\')");
    params.push(like(q), like(q), like(q));
  }
  if (kind) {
    conds.push("v.kind = ?");
    params.push(kind);
  }
  const where = conds.length ? `WHERE ${conds.join(" AND ")}` : "";
  return getDb()
    .prepare(
      `SELECT v.id, v.title, v.kind, v.video_id, v.url, v.uploader, v.published_at, v.note, v.comment,
        (SELECT COUNT(*) FROM parts p WHERE p.video_id = v.id) AS part_count
       FROM videos v ${where} ORDER BY v.title`
    )
    .all(...params) as any[];
}

export function resolveVideoByTitle(titleOrVideoId: string): Video | null {
  const t = titleOrVideoId.trim();
  const row = getDb().prepare("SELECT id FROM videos WHERE title = ? OR video_id = ? LIMIT 1").get(t, t) as any;
  return row ? getVideoRow(row.id) : null;
}

export function createVideo(input: {
  title: string;
  kind?: Video["kind"];
  video_id?: string;
  url?: string;
  uploader?: string;
  published_at?: string;
  note?: string;
}): Video {
  const info = getDb()
    .prepare("INSERT INTO videos (title, kind, video_id, url, uploader, published_at, note) VALUES (?, ?, ?, ?, ?, ?, ?)")
    .run(
      input.title.trim(),
      input.kind ?? "medley",
      input.video_id ?? null,
      input.url ?? null,
      input.uploader ?? null,
      input.published_at ?? null,
      input.note ?? null
    );
  return getVideoRow(Number(info.lastInsertRowid))!;
}

export function updateVideo(
  id: number,
  patch: Partial<{
    title: string;
    kind: Video["kind"];
    video_id: string | null;
    url: string | null;
    uploader: string | null;
    published_at: string | null;
    note: string | null;
    comment: string | null;
  }>
): Video | null {
  const db = getDb();
  const allowed = ["title", "kind", "video_id", "url", "uploader", "published_at", "note", "comment"];
  const fields = Object.entries(patch).filter(([k]) => allowed.includes(k));
  if (fields.length) {
    const sets = fields.map(([k]) => `${k} = ?`).join(", ");
    db.prepare(`UPDATE videos SET ${sets}, updated_at = datetime('now') WHERE id = ?`).run(
      ...fields.map(([, v]) => v),
      id
    );
  }
  return getVideoRow(id);
}

export function deleteVideo(id: number): boolean {
  const db = getDb();
  const tx = db.transaction(() => {
    db.prepare("UPDATE parts SET ref_video_id = NULL WHERE ref_video_id = ? AND (song_id IS NOT NULL OR label IS NOT NULL)").run(id);
    db.prepare("DELETE FROM parts WHERE ref_video_id = ?").run(id);
    return db.prepare("DELETE FROM videos WHERE id = ?").run(id).changes > 0;
  });
  return tx();
}

export function getVideoParts(videoId: number): Part[] {
  const db = getDb();
  const rows = db
    .prepare(
      `SELECT p.id, p.video_id, p.position, p.song_id, s.title AS song_title,
              p.ref_video_id, rv.title AS ref_video_title,
              p.label, p.bpm, p.bars, p.start_sec, p.end_sec, p.note, p.comment
       FROM parts p
       LEFT JOIN songs s ON s.id = p.song_id
       LEFT JOIN videos rv ON rv.id = p.ref_video_id
       WHERE p.video_id = ? ORDER BY p.position`
    )
    .all(videoId) as any[];
  const staff = db
    .prepare(
      `SELECT ps.part_id, ps.person_id, pe.name, ps.role
       FROM part_staff ps JOIN people pe ON pe.id = ps.person_id
       JOIN parts p ON p.id = ps.part_id WHERE p.video_id = ?`
    )
    .all(videoId) as any[];
  const byPart = new Map<number, PartStaff[]>();
  for (const s of staff) {
    if (!byPart.has(s.part_id)) byPart.set(s.part_id, []);
    byPart.get(s.part_id)!.push({ person_id: s.person_id, name: s.name, role: s.role });
  }
  return rows.map((r) => ({ ...r, staff: byPart.get(r.id) ?? [] }));
}

/** この動画を引用している動画一覧 */
export function getReferencingVideos(videoId: number): Video[] {
  return getDb()
    .prepare(
      `SELECT DISTINCT v.id, v.title, v.kind, v.video_id, v.url, v.uploader, v.published_at, v.note, v.comment
       FROM parts p JOIN videos v ON v.id = p.video_id WHERE p.ref_video_id = ? ORDER BY v.title`
    )
    .all(videoId) as Video[];
}

// ---------- 担当者 ----------

export function resolvePersonByName(name: string, createIfMissing = true): { id: number; name: string } | null {
  const n = name.trim();
  if (!n) return null;
  const db = getDb();
  const row = db
    .prepare(
      `SELECT p.id, p.name FROM people p WHERE p.name = ?
       UNION SELECT p.id, p.name FROM people p JOIN person_aliases a ON a.person_id = p.id WHERE a.alias = ?
       LIMIT 1`
    )
    .get(n, n) as any;
  if (row) return row;
  if (!createIfMissing) return null;
  const info = db.prepare("INSERT INTO people (name) VALUES (?)").run(n);
  return { id: Number(info.lastInsertRowid), name: n };
}

export function listPeople(q?: string): { id: number; name: string; part_count: number }[] {
  const where = q
    ? `WHERE p.name LIKE ? ESCAPE '\\' OR p.id IN (SELECT person_id FROM person_aliases WHERE alias LIKE ? ESCAPE '\\')`
    : "";
  const params = q ? [like(q), like(q)] : [];
  return getDb()
    .prepare(
      `SELECT p.id, p.name, (SELECT COUNT(*) FROM part_staff ps WHERE ps.person_id = p.id) AS part_count
       FROM people p ${where} ORDER BY part_count DESC, p.name`
    )
    .all(...params) as any[];
}

export function getPerson(id: number) {
  const db = getDb();
  const person = db.prepare("SELECT id, name FROM people WHERE id = ?").get(id) as any;
  if (!person) return null;
  const aliases = db
    .prepare("SELECT alias FROM person_aliases WHERE person_id = ? ORDER BY id")
    .all(id)
    .map((r: any) => r.alias);
  const works = db
    .prepare(
      `SELECT ps.role, p.position, p.label, s.title AS song_title, s.id AS song_id,
              v.id AS video_id_pk, v.title AS video_title
       FROM part_staff ps
       JOIN parts p ON p.id = ps.part_id
       JOIN videos v ON v.id = p.video_id
       LEFT JOIN songs s ON s.id = p.song_id
       WHERE ps.person_id = ? ORDER BY v.title, p.position`
    )
    .all(id) as any[];
  return { ...person, aliases, works };
}

export function mergePeople(sourceId: number, targetId: number) {
  const db = getDb();
  const source = db.prepare("SELECT id, name FROM people WHERE id = ?").get(sourceId) as any;
  const target = db.prepare("SELECT id, name FROM people WHERE id = ?").get(targetId) as any;
  if (!source || !target || sourceId === targetId) return null;
  const tx = db.transaction(() => {
    db.prepare("UPDATE OR IGNORE part_staff SET person_id = ? WHERE person_id = ?").run(targetId, sourceId);
    db.prepare("DELETE FROM part_staff WHERE person_id = ?").run(sourceId);
    db.prepare("INSERT OR IGNORE INTO person_aliases (person_id, alias) VALUES (?, ?)").run(targetId, source.name);
    db.prepare("UPDATE OR IGNORE person_aliases SET person_id = ? WHERE person_id = ?").run(targetId, sourceId);
    db.prepare("DELETE FROM people WHERE id = ?").run(sourceId);
  });
  tx();
  return getPerson(targetId);
}

// ---------- パート ----------

/** 動画のパート表を丸ごと差し替える（スプシ取り込み用）。曲・担当者は名前で解決し、無ければ作成する。 */
export function setVideoParts(videoId: number, parts: PartInput[]): Part[] {
  const db = getDb();
  const video = getVideoRow(videoId);
  if (!video) throw new Error(`video ${videoId} not found`);
  const tx = db.transaction(() => {
    db.prepare("DELETE FROM parts WHERE video_id = ?").run(videoId);
    parts.forEach((input, i) => insertPart(videoId, i + 1, input));
  });
  tx();
  return getVideoParts(videoId);
}

export function addParts(videoId: number, parts: PartInput[]): Part[] {
  const db = getDb();
  const video = getVideoRow(videoId);
  if (!video) throw new Error(`video ${videoId} not found`);
  const base =
    (db.prepare("SELECT COALESCE(MAX(position), 0) AS m FROM parts WHERE video_id = ?").get(videoId) as any).m ?? 0;
  const tx = db.transaction(() => {
    parts.forEach((input, i) => insertPart(videoId, base + i + 1, input));
  });
  tx();
  return getVideoParts(videoId);
}

function insertPart(videoId: number, position: number, input: PartInput): number {
  const db = getDb();
  let songId = input.song_id ?? null;
  if (!songId && input.song_title) {
    const resolved = resolveSongByTitle(input.song_title);
    songId = resolved ? resolved.id : createSong({ title: input.song_title }).id;
  }
  let refVideoId = input.ref_video_id ?? null;
  if (!refVideoId && input.ref_video_title) {
    const resolved = resolveVideoByTitle(input.ref_video_title);
    refVideoId = resolved
      ? resolved.id
      : createVideo({ title: input.ref_video_title, kind: "medley", note: "パート登録時に自動作成" }).id;
  }
  if (!songId && !refVideoId && !input.label) {
    throw new Error(`part ${position}: song / ref_video / label のいずれかが必要です`);
  }
  const info = db
    .prepare(
      `INSERT INTO parts (video_id, position, song_id, ref_video_id, label, bpm, bars, start_sec, end_sec, note, comment)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`
    )
    .run(
      videoId,
      position,
      songId,
      refVideoId,
      input.label ?? null,
      input.bpm ?? null,
      input.bars ?? null,
      input.start_sec ?? null,
      input.end_sec ?? null,
      input.note ?? null,
      input.comment ?? null
    );
  const partId = Number(info.lastInsertRowid);
  const addStaff = (names: string[] | undefined, role: string) => {
    for (const name of names ?? []) {
      const person = resolvePersonByName(name);
      if (person) {
        db.prepare("INSERT OR IGNORE INTO part_staff (part_id, person_id, role) VALUES (?, ?, ?)").run(
          partId,
          person.id,
          role
        );
      }
    }
  };
  addStaff(input.audio_staff, "audio");
  addStaff(input.video_staff, "video");
  return partId;
}

export function updatePart(partId: number, patch: PartInput): Part | null {
  const db = getDb();
  const row = db.prepare("SELECT video_id, position FROM parts WHERE id = ?").get(partId) as any;
  if (!row) return null;
  const cols: string[] = [];
  const vals: any[] = [];
  if (patch.song_id !== undefined || patch.song_title !== undefined) {
    let songId = patch.song_id ?? null;
    if (!songId && patch.song_title) {
      const resolved = resolveSongByTitle(patch.song_title);
      songId = resolved ? resolved.id : createSong({ title: patch.song_title }).id;
    }
    cols.push("song_id = ?");
    vals.push(songId);
  }
  if (patch.ref_video_id !== undefined || patch.ref_video_title !== undefined) {
    let refId = patch.ref_video_id ?? null;
    if (!refId && patch.ref_video_title) {
      const resolved = resolveVideoByTitle(patch.ref_video_title);
      refId = resolved ? resolved.id : createVideo({ title: patch.ref_video_title, kind: "medley" }).id;
    }
    cols.push("ref_video_id = ?");
    vals.push(refId);
  }
  for (const k of ["label", "bpm", "bars", "start_sec", "end_sec", "note", "comment"] as const) {
    if (patch[k] !== undefined) {
      cols.push(`${k} = ?`);
      vals.push(patch[k]);
    }
  }
  if (cols.length) db.prepare(`UPDATE parts SET ${cols.join(", ")} WHERE id = ?`).run(...vals, partId);
  if (patch.audio_staff !== undefined || patch.video_staff !== undefined) {
    const resetStaff = (names: string[] | undefined, role: string) => {
      if (names === undefined) return;
      db.prepare("DELETE FROM part_staff WHERE part_id = ? AND role = ?").run(partId, role);
      for (const name of names) {
        const person = resolvePersonByName(name);
        if (person)
          db.prepare("INSERT OR IGNORE INTO part_staff (part_id, person_id, role) VALUES (?, ?, ?)").run(
            partId,
            person.id,
            role
          );
      }
    };
    resetStaff(patch.audio_staff, "audio");
    resetStaff(patch.video_staff, "video");
  }
  return getVideoParts(row.video_id).find((p) => p.id === partId) ?? null;
}

export function deletePart(partId: number): boolean {
  return getDb().prepare("DELETE FROM parts WHERE id = ?").run(partId).changes > 0;
}

// ---------- 横断検索・統計 ----------

export function crossSearch(q: string) {
  return {
    songs: listSongs(q).slice(0, 20),
    videos: listVideos(q).slice(0, 20),
    people: listPeople(q).slice(0, 20),
  };
}

export function getStats() {
  const db = getDb();
  const one = (sql: string) => (db.prepare(sql).get() as any).c as number;
  return {
    songs: one("SELECT COUNT(*) AS c FROM songs"),
    videos: one("SELECT COUNT(*) AS c FROM videos"),
    parts: one("SELECT COUNT(*) AS c FROM parts"),
    people: one("SELECT COUNT(*) AS c FROM people"),
  };
}
