/**
 * 「【音MADニコニコメドレー】OTOMAD CAPRICCIOSO」(sm40312425) を登録する。
 * 曲リストと BPM 情報: 音MAD Wiki (fandom) の記事から。
 *   https://otomad.fandom.com/ja/wiki/【音MADニコニコメドレー】OTOMAD_CAPRICCIOSO(sm40312425)
 *
 *   npx tsx scripts/seed-capriccioso.ts
 */
import * as q from "../src/db/queries.js";

type Track = {
  no: string;
  title: string;
  bpm?: string;
  /** マッシュアップの追加曲（同じ節に重ねられている曲） */
  extra?: string[];
};

const TRACKS: Track[] = [
  { no: "01", title: "MAKE IT FUNKY NOW", bpm: "140" },
  { no: "02", title: "ゴー・トゥ・大都会" },
  { no: "03", title: "不革命前夜", extra: ["シャルル"] },
  { no: "04", title: "YONA YONA DANCE" },
  { no: "05", title: "MAD RAT HEART", extra: ["MAD DEAD HEART RAP"] },
  { no: "06", title: "MAD RAT HEART", extra: ["MAD DEAD HEART RAP", "残酷な天使のテーゼ"] },
  { no: "07", title: "アルティメットセンパイ" },
  { no: "08", title: "Baqeela" },
  { no: "09", title: "神っぽいな" },
  { no: "09'", title: "マーシャル・マキシマイザー", bpm: "155→170→185→195→200" },
  { no: "10", title: "マーシャル・マキシマイザー", bpm: "200" },
  { no: "11", title: "猫祭り", extra: ["WONDER_WOBBLER"] },
  { no: "12", title: "トキメキ☆ボムラッシュ", extra: ["Oshama Scramble!"] },
  { no: "13", title: "Panic! Pop'n! Picnic!" },
  { no: "14", title: "ダブルラリアット" },
  { no: "15", title: "Big Daddy", bpm: "210" },
  { no: "16", title: "メンタルチェンソー" },
  { no: "17", title: "フォニイ" },
  { no: "18", title: "MEGALOVANIA", bpm: "230" },
  { no: "19", title: "THE WORLD REVOLVING" },
  { no: "20", title: "MEGALOVANIA (Camellia Remix)" },
  { no: "21", title: "I" },
  { no: "22", title: "Sayonara Planet Wars" },
];

const url = "https://www.nicovideo.jp/watch/sm40312425";
const existing = q.resolveVideoByTitle("OTOMAD CAPRICCIOSO");
const video =
  existing ??
  q.createVideo({
    title: "【音MADニコニコメドレー】OTOMAD CAPRICCIOSO",
    kind: "medley",
    url,
    uploader: "絶望",
    published_at: "2022-04-01",
    note: "曲リスト出典: 音MAD Wiki https://otomad.fandom.com/ja/wiki/【音MADニコニコメドレー】OTOMAD_CAPRICCIOSO(sm40312425)",
  });

// スタブ("OTOMAD CAPRICCIOSO"のプレースホルダ)を昇格
if (existing) {
  q.updateVideo(video.id, {
    title: "【音MADニコニコメドレー】OTOMAD CAPRICCIOSO",
    url,
    uploader: "絶望",
    published_at: "2022-04-01",
    note: "曲リスト出典: 音MAD Wiki https://otomad.fandom.com/ja/wiki/【音MADニコニコメドレー】OTOMAD_CAPRICCIOSO(sm40312425)",
  });
}

const parts: q.PartInput[] = [];
for (const t of TRACKS) {
  const songs = [t.title, ...(t.extra ?? [])];
  const labelText = songs.length > 1 ? songs.join(" & ") : undefined;
  songs.forEach((song, i) => {
    parts.push({
      song_title: song,
      label: labelText,
      bpm: i === 0 ? t.bpm : undefined,
      note: `スプシNo.${t.no}`,
    });
  });
}

const result = q.setVideoParts(video.id, parts);
console.log(`registered: ${result.length} parts for video #${video.id} ${video.title}`);
console.log(JSON.stringify(q.getStats(), null, 2));
