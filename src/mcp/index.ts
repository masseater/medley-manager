import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { z } from "zod";
import * as q from "../db/queries.js";

const server = new McpServer({ name: "medley-manager", version: "0.1.0" });

const ok = (data: unknown) => ({
  content: [{ type: "text" as const, text: JSON.stringify(data, null, 2) }],
});
const err = (message: string) => ({
  content: [{ type: "text" as const, text: `ERROR: ${message}` }],
  isError: true,
});

const partInputShape = {
  song_id: z.number().optional().describe("使用曲の曲ID（既知の場合）"),
  song_title: z
    .string()
    .optional()
    .describe("使用曲の曲名。タイトル/エイリアス完全一致で既存曲に紐付け、無ければ新規作成する。表記ゆれの疑いがあるときは先に search_songs で確認すること"),
  ref_video_id: z.number().optional().describe("このパートが引用している動画（メドレー等）の動画ID"),
  ref_video_title: z
    .string()
    .optional()
    .describe("引用元動画のタイトル。完全一致で紐付け、無ければメドレーとしてスタブを自動作成する"),
  label: z.string().optional().describe("パート名の原文表記（スプシの表記をそのまま残す用）"),
  bpm: z.string().optional().describe("BPM。範囲や複数値もそのまま文字列で（例: '140-230'）"),
  bars: z.string().optional().describe("小節数。複合表記もそのまま文字列で（例: '8+16'）"),
  start_sec: z.number().optional().describe("動画内の開始位置（秒）。任意"),
  end_sec: z.number().optional().describe("動画内の終了位置（秒）。任意"),
  note: z.string().optional().describe("データ由来の備考（スプシの備考欄など）"),
  comment: z.string().nullable().optional().describe("ユーザーのメモ用コメント。null で削除"),
  audio_staff: z.array(z.string()).optional().describe("音声担当者名のリスト。名前/エイリアス完全一致で解決、無ければ新規作成"),
  video_staff: z.array(z.string()).optional().describe("映像担当者名のリスト。同上"),
};

// ---------- 曲 ----------

server.tool(
  "search_songs",
  "曲を曲名・エイリアス・アーティスト名で部分一致検索する。登録前の表記ゆれチェックにも使う",
  { q: z.string().describe("検索キーワード") },
  async ({ q: query }) => ok(q.listSongs(query))
);

server.tool("get_song", "曲の詳細と使用状況（この曲を使っているメドレー・動画の逆引き）を取得する", {
  id: z.number(),
}, async ({ id }) => {
  const song = q.getSong(id);
  if (!song) return err(`song ${id} not found`);
  return ok({ ...song, usage: q.getSongUsage(id) });
});

server.tool(
  "create_song",
  "曲（原曲マスタ）を新規登録する。登録前に search_songs で重複がないか確認すること",
  {
    title: z.string(),
    artist: z.string().optional().describe("作曲者・アーティスト"),
    url: z.string().optional().describe("原曲のニコニコ/YouTubeリンク"),
    genre: z.string().optional().describe("ジャンル（ボカロ/東方/アニソン等）"),
    note: z.string().optional(),
    aliases: z.array(z.string()).optional().describe("別表記のリスト"),
  },
  async (input) => ok(q.createSong(input))
);

server.tool(
  "update_song",
  "曲情報を更新する（指定したフィールドのみ）",
  {
    id: z.number(),
    title: z.string().optional(),
    artist: z.string().nullable().optional(),
    url: z.string().nullable().optional(),
    genre: z.string().nullable().optional(),
    note: z.string().nullable().optional(),
  },
  async ({ id, ...patch }) => {
    const song = q.updateSong(id, patch);
    return song ? ok(song) : err(`song ${id} not found`);
  }
);

server.tool("delete_song", "曲を削除する。パートからの参照は外れる（パート自体は残る）", { id: z.number() }, async ({ id }) =>
  q.deleteSong(id) ? ok({ deleted: id }) : err(`song ${id} not found`)
);

server.tool(
  "add_song_alias",
  "曲にエイリアス（別表記）を追加する。名寄せ用",
  { song_id: z.number(), alias: z.string() },
  async ({ song_id, alias }) => {
    q.addSongAlias(song_id, alias);
    const song = q.getSong(song_id);
    return song ? ok(song) : err(`song ${song_id} not found`);
  }
);

server.tool(
  "remove_song_alias",
  "曲からエイリアスを削除する",
  { song_id: z.number(), alias: z.string() },
  async ({ song_id, alias }) => {
    if (!q.removeSongAlias(song_id, alias)) return err(`alias "${alias}" not found on song ${song_id}`);
    return ok(q.getSong(song_id));
  }
);

server.tool(
  "merge_songs",
  "重複した曲を統合する。source の曲名はエイリアスとして target に残り、パート参照も付け替えられる",
  { source_id: z.number().describe("消す側の曲ID"), target_id: z.number().describe("残す側の曲ID") },
  async ({ source_id, target_id }) => {
    const merged = q.mergeSongs(source_id, target_id);
    return merged ? ok(merged) : err("merge failed (id不正または同一ID)");
  }
);

// ---------- 動画 ----------

server.tool(
  "search_videos",
  "動画（メドレー・合作等）をタイトル・ニコニコID・投稿者で部分一致検索する",
  {
    q: z.string().optional(),
    kind: z.enum(["medley", "collab", "single", "other"]).optional().describe("種別で絞り込み"),
  },
  async ({ q: query, kind }) => ok(q.listVideos(query, kind))
);

server.tool(
  "get_video",
  "動画の詳細・パート表・この動画を引用している動画一覧を取得する",
  { id: z.number() },
  async ({ id }) => {
    const video = q.getVideoRow(id);
    if (!video) return err(`video ${id} not found`);
    return ok({ ...video, parts: q.getVideoParts(id), referenced_by: q.getReferencingVideos(id) });
  }
);

server.tool(
  "create_video",
  "動画（メドレー・合作・単品）を新規登録する。パート表は set_video_parts で登録する。元動画URLは必須",
  {
    title: z.string(),
    kind: z.enum(["medley", "collab", "single", "other"]).optional().describe("medley=メドレー, collab=合作, single=単品, other=その他。省略時 medley"),
    url: z.string().min(1).describe("元動画のリンク（必須）。ニコニコ https://www.nicovideo.jp/watch/sm12345678 または YouTube https://www.youtube.com/watch?v=XXX の完全URL"),
    video_id: z.string().optional().describe("ニコニコ動画ID（sm12345678）やYouTube ID。省略時は URL から自動抽出"),
    uploader: z.string().optional().describe("投稿者名"),
    published_at: z.string().optional().describe("投稿日（YYYY-MM-DD）"),
    note: z.string().optional(),
  },
  async (input) => {
    try {
      return ok(q.createVideo(input));
    } catch (e) {
      return err(String(e));
    }
  }
);

server.tool(
  "update_video",
  "動画情報を更新する（指定したフィールドのみ）",
  {
    id: z.number(),
    title: z.string().optional(),
    kind: z.enum(["medley", "collab", "single", "other"]).optional(),
    video_id: z.string().nullable().optional(),
    url: z.string().min(1).optional().describe("元動画のリンク（必須項目のため空文字/null にはできない）"),
    uploader: z.string().nullable().optional(),
    published_at: z.string().nullable().optional(),
    note: z.string().nullable().optional(),
    comment: z.string().nullable().optional().describe("ユーザーのメモ用コメント。null で削除"),
  },
  async ({ id, ...patch }) => {
    try {
      const video = q.updateVideo(id, patch);
      return video ? ok(video) : err(`video ${id} not found`);
    } catch (e) {
      return err(String(e));
    }
  }
);

server.tool("delete_video", "動画をパート表ごと削除する", { id: z.number() }, async ({ id }) =>
  q.deleteVideo(id) ? ok({ deleted: id }) : err(`video ${id} not found`)
);

// ---------- パート ----------

server.tool(
  "set_video_parts",
  "動画のパート表を丸ごと差し替える（スプシ取り込みはこれを使う）。既存パートのユーザーコメントも消えるので、登録済み動画の再取り込み時は先に get_video でコメントの有無を確認すること。配列の順番がそのままパート順になる。曲名・担当者名は完全一致で既存レコードに紐付き、無ければ自動作成される。表記ゆれが疑われる曲は先に search_songs で確認し、既存曲の表記に合わせるか add_song_alias でエイリアスを張ること",
  { video_id: z.number(), parts: z.array(z.object(partInputShape)) },
  async ({ video_id, parts }) => {
    try {
      return ok(q.setVideoParts(video_id, parts));
    } catch (e) {
      return err(String(e));
    }
  }
);

server.tool(
  "add_parts",
  "動画のパート表の末尾にパートを追加する（差し替えではなく追記）",
  { video_id: z.number(), parts: z.array(z.object(partInputShape)) },
  async ({ video_id, parts }) => {
    try {
      return ok(q.addParts(video_id, parts));
    } catch (e) {
      return err(String(e));
    }
  }
);

server.tool(
  "update_part",
  "パート1件を部分更新する。part_id は get_video で確認できる",
  { part_id: z.number(), ...partInputShape },
  async ({ part_id, ...patch }) => {
    const part = q.updatePart(part_id, patch);
    return part ? ok(part) : err(`part ${part_id} not found`);
  }
);

server.tool("delete_part", "パート1件を削除する", { part_id: z.number() }, async ({ part_id }) =>
  q.deletePart(part_id) ? ok({ deleted: part_id }) : err(`part ${part_id} not found`)
);

// ---------- 担当者・その他 ----------

server.tool(
  "search_people",
  "担当者を名前・エイリアスで部分一致検索する",
  { q: z.string().optional() },
  async ({ q: query }) => ok(q.listPeople(query))
);

server.tool("get_person", "担当者の詳細と担当パート一覧を取得する", { id: z.number() }, async ({ id }) => {
  const person = q.getPerson(id);
  return person ? ok(person) : err(`person ${id} not found`);
});

server.tool(
  "merge_people",
  "重複した担当者を統合する。source の名前はエイリアスとして target に残る",
  { source_id: z.number(), target_id: z.number() },
  async ({ source_id, target_id }) => {
    const merged = q.mergePeople(source_id, target_id);
    return merged ? ok(merged) : err("merge failed (id不正または同一ID)");
  }
);

server.tool("get_stats", "登録件数（曲・動画・パート・担当者）を取得する", {}, async () => ok(q.getStats()));

const transport = new StdioServerTransport();
await server.connect(transport);
