/**
 * 「【音MADメドレー】おとめっど」(sm36147088) をニコニコ大百科の曲リストから登録する。
 * https://dic.nicovideo.jp/v/sm36147088
 *
 *   npx tsx scripts/seed-otomedo.ts
 */
import * as q from "../src/db/queries.js";

const TRACKS: { title: string; source: string }[] = [
  { title: "チルミルチルノ", source: "東方Project アレンジ楽曲" },
  { title: "FEVER", source: "ゲーム『Dr.マリオ』BGM" },
  { title: "ロキ", source: "みきとP ボーカロイド楽曲（鏡音リン）" },
  { title: "B.B.K.K.B.K.K.", source: "BMSオリジナル楽曲" },
  { title: "ダダダダ天使", source: "ナナヲアカリ・ナユタン星人 オリジナル曲" },
  { title: "U.N.オーエンは彼女なのか？", source: "『東方紅魔郷』BGM" },
  { title: "ヤマダ電機の唄", source: "ヤマダ電機 CMソング" },
  { title: "コネクト", source: "アニメ『魔法少女まどか☆マギカ』OP" },
  { title: "BEAT-NEW-WORLD", source: "BEMANI連動企画楽曲" },
  { title: "ナイト・オブ・ナイツ", source: "東方Project アレンジ楽曲" },
  { title: "MEGALOVANIA", source: "ゲーム『Undertale』BGM" },
  { title: "柴又", source: "2号 オリジナル楽曲" },
  {
    title: "非実在系女子達はどうすりゃいいですか？",
    source: "『抜きゲーみたいな島に住んでる貧乳はどうすりゃいいですか？』OP",
  },
  { title: "Trash", source: "Candy House" },
  { title: "アスノヨゾラ哨戒班", source: "OrangeStar ボーカロイド楽曲（IA）" },
  { title: "銀河にねがいを：凱旋のテーマ", source: "ゲーム『星のカービィ スーパーデラックス』BGM" },
];

const video =
  q.resolveVideoByTitle("sm36147088") ??
  q.createVideo({
    title: "【音MADメドレー】おとめっど",
    kind: "medley",
    video_id: "sm36147088",
    url: "https://www.nicovideo.jp/watch/sm36147088",
    uploader: "りゅん",
    note: "曲リスト出典: ニコニコ大百科 https://dic.nicovideo.jp/v/sm36147088",
  });

const parts = q.setVideoParts(
  video.id,
  TRACKS.map((t) => ({ song_title: t.title }))
);

for (const t of TRACKS) {
  const song = q.resolveSongByTitle(t.title);
  if (song && !song.note) q.updateSong(song.id, { note: `出典: ${t.source}` });
}

console.log(`registered: ${parts.length} parts for video #${video.id} ${video.title}`);
console.log(JSON.stringify(q.getStats(), null, 2));
