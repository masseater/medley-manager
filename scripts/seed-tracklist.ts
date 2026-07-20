/**
 * メドレーの曲目リストCSV（曲番号,BPM,小節,使用楽曲名,出典,備考 形式）を取り込む。
 *
 *   npx tsx scripts/seed-tracklist.ts <csv> <メドレータイトル> [シートURL]
 *
 * 実運用のデータ入力は AI が MCP 経由で行う想定で、これはその一例。
 */
import { readFileSync } from "node:fs";
import * as q from "../src/db/queries.js";
import { parseCsv } from "./lib/csv.js";

const [csvPath, medleyTitle, sheetUrl] = process.argv.slice(2);
if (!csvPath || !medleyTitle) {
  console.error("usage: npx tsx scripts/seed-tracklist.ts <csv> <メドレータイトル> [シートURL]");
  process.exit(1);
}

const rows = parseCsv(readFileSync(csvPath, "utf8"));
const multiline = (s: string | undefined) => (s ?? "").trim().replace(/\s*\n\s*/g, " / ");

const video =
  q.resolveVideoByTitle(medleyTitle) ?? q.createVideo({ title: medleyTitle, kind: "medley" });
if (sheetUrl) q.updateVideo(video.id, { note: `曲目リスト: ${sheetUrl}` });

type Entry = { song_title: string; bpm?: string; bars?: string; note?: string; source?: string };
const entries: Entry[] = [];

for (const r of rows) {
  const title = (r[3] ?? "").trim();
  if (!title || title === "使用楽曲名") continue;
  entries.push({
    song_title: title,
    bpm: multiline(r[1]) || undefined,
    bars: multiline(r[2]) || undefined,
    note: (r[5] ?? "").trim() || undefined,
    source: (r[4] ?? "").trim() || undefined,
  });
}

const parts = q.setVideoParts(
  video.id,
  entries.map(({ source, ...part }) => part)
);

// 出典（原曲情報）は曲マスタ側に持たせる。既に note がある曲は上書きしない
for (const e of entries) {
  if (!e.source) continue;
  const song = q.resolveSongByTitle(e.song_title);
  if (song && !song.note) q.updateSong(song.id, { note: `出典: ${e.source}` });
}

console.log(`registered: ${parts.length} parts for video #${video.id} ${video.title}`);
console.log(JSON.stringify(q.getStats(), null, 2));
