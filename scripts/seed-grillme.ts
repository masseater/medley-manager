/**
 * 動作確認用シード: にょろにょろ合作3 のスプシ CSV を取り込む。
 * 実運用のデータ入力は AI が MCP 経由で行う想定で、これはその一例。
 *
 *   npx tsx scripts/seed-grillme.ts path/to/grillme.csv
 */
import { readFileSync } from "node:fs";
import * as q from "../src/db/queries.js";

function parseCsv(text: string): string[][] {
  const rows: string[][] = [];
  let row: string[] = [];
  let cell = "";
  let inQuotes = false;
  for (let i = 0; i < text.length; i++) {
    const c = text[i];
    if (inQuotes) {
      if (c === '"') {
        if (text[i + 1] === '"') {
          cell += '"';
          i++;
        } else {
          inQuotes = false;
        }
      } else {
        cell += c;
      }
    } else if (c === '"') {
      inQuotes = true;
    } else if (c === ",") {
      row.push(cell);
      cell = "";
    } else if (c === "\n" || c === "\r") {
      if (c === "\r" && text[i + 1] === "\n") i++;
      row.push(cell);
      cell = "";
      rows.push(row);
      row = [];
    } else {
      cell += c;
    }
  }
  if (cell !== "" || row.length) {
    row.push(cell);
    rows.push(row);
  }
  return rows;
}

const csvPath = process.argv[2];
if (!csvPath) {
  console.error("usage: npx tsx scripts/seed-grillme.ts <csv>");
  process.exit(1);
}

const rows = parseCsv(readFileSync(csvPath, "utf8"));

// 列: [空, No., BPM, 小節数, パート名, 音声担当, 映像担当, メドレー]
const dataRows = rows.filter((r) => (r[4] ?? "").trim() !== "" && (r[4] ?? "").trim() !== "パート名\n파트명");

const splitStaff = (s: string | undefined) =>
  (s ?? "")
    .split("/")
    .map((x) => x.trim())
    .filter((x) => x && x !== "-");

// "A → A & B" のようなマッシュアップ表記から曲名を列挙する
const splitSongs = (label: string) =>
  [...new Set(label.split(/→|↔|&|\n/).map((x) => x.trim()).filter(Boolean))];

const video = q.resolveVideoByTitle("にょろにょろ合作3") ?? q.createVideo({
  title: "にょろにょろ合作3",
  kind: "collab",
  note: "grill-me スプシから取り込み",
});

let currentMedley: string | undefined;
const parts: q.PartInput[] = [];

for (const r of dataRows) {
  const no = (r[1] ?? "").trim();
  const bpm = (r[2] ?? "").trim();
  const bars = (r[3] ?? "").trim();
  const label = (r[4] ?? "").trim();
  const audio = splitStaff(r[5]);
  const videoStaff = splitStaff(r[6]);
  const medley = (r[7] ?? "").trim().replace(/\s*\n\s*/g, " ");
  if (medley) currentMedley = medley;

  const songs = splitSongs(label);
  for (const [i, song] of songs.entries()) {
    parts.push({
      song_title: song,
      label: songs.length > 1 ? label.replace(/\s*\n\s*/g, " ") : undefined,
      ref_video_title: currentMedley,
      bpm: i === 0 && bpm ? bpm : undefined,
      bars: i === 0 && bars ? bars : undefined,
      note: no ? `スプシNo.${no}` : "スプシ続き行",
      audio_staff: i === 0 ? audio : undefined,
      video_staff: i === 0 ? videoStaff : undefined,
    });
  }
}

const result = q.setVideoParts(video.id, parts);
console.log(`registered: ${result.length} parts for video #${video.id} ${video.title}`);
console.log(JSON.stringify(q.getStats(), null, 2));
