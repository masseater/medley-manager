/**
 * ニコニコメドレー黎明期の 2 本を登録する:
 *   - 組曲『ニコニコ動画』(sm500873) by しも, 2007-06-23
 *   - ニコニコ動画中毒の方へ贈る一曲 (sm405303) by しも, 2007-05-27（組曲の前身）
 *
 * 曲リスト出典: ニコニコ大百科
 *   https://dic.nicovideo.jp/a/組曲『ニコニコ動画』
 *   https://dic.nicovideo.jp/v/sm405303
 *
 *   npx tsx scripts/seed-kumikyoku.ts
 */
import * as q from "../src/db/queries.js";

const KUMIKYOKU: string[] = [
  "エージェント夜を往く",
  "ハレ晴レユカイ",
  "患部で止まってすぐ溶ける～狂気の優曇華院",
  "Help me, ERINNNNNN!!",
  "nowhere",
  "クリティウスの牙",
  "GONG",
  "森のキノコにご用心",
  "Butter-Fly",
  "真赤な誓い",
  "エアーマンが倒せない",
  "勇気VS意地",
  "アンインストール",
  "鳥の詩",
  "you",
  "魔理沙は大変なものを盗んでいきました",
  "Dr.WILY STAGE 1",
  "God knows...",
  "もってけ！セーラーふく",
  "ガチャガチャへるつ・ふぃぎゅ＠ラジオ",
  "創聖のアクエリオン",
  "ふたりのもじぴったん",
  "つるぺったん",
  "Here we go!",
  "true my heart",
  "kiss my lips",
  "RODEO MACHINE",
  "序曲（ドラゴンクエスト）",
  "FINAL FANTASY メインテーマ",
  "ガチャガチャきゅ～と・ふぃぎゅ＠メイト",
  "あいつこそがテニスの王子様",
  "レッツゴー！陰陽師",
  "さくら",
];

const PROTOTYPE: string[] = [
  "レッツゴー！陰陽師",
  "魔理沙は大変なものを盗んでいきました",
  "Dr.WILY STAGE 1",
  "God knows...",
  "もってけ！セーラーふく",
  "創聖のアクエリオン",
  "ふたりのもじぴったん",
  "つるぺったん",
  "true my heart",
  "kiss my lips",
  "RODEO MACHINE",
  "序曲（ドラゴンクエスト）",
  "FINAL FANTASY メインテーマ",
  "ガチャガチャきゅ～と・ふぃぎゅ＠メイト",
  "あいつこそがテニスの王子様",
];

function seed(
  title: string,
  videoId: string,
  uploader: string,
  publishedAt: string,
  note: string,
  tracks: string[]
) {
  const url = `https://www.nicovideo.jp/watch/${videoId}`;
  const existing = q.resolveVideoByTitle(title);
  const video = existing ?? q.createVideo({ title, kind: "medley", url, uploader, published_at: publishedAt, note });
  if (existing) q.updateVideo(video.id, { url, uploader, published_at: publishedAt, note });
  const parts = q.setVideoParts(
    video.id,
    tracks.map((song) => ({ song_title: song }))
  );
  console.log(`registered: ${parts.length} parts for video #${video.id} ${title}`);
}

seed(
  "組曲『ニコニコ動画』",
  "sm500873",
  "しも",
  "2007-06-23",
  "曲リスト出典: ニコニコ大百科 https://dic.nicovideo.jp/a/組曲『ニコニコ動画』",
  KUMIKYOKU
);

seed(
  "ニコニコ動画中毒の方へ贈る一曲",
  "sm405303",
  "しも",
  "2008-05-27",
  "組曲『ニコニコ動画』の前身。曲リスト出典: ニコニコ大百科 https://dic.nicovideo.jp/v/sm405303",
  PROTOTYPE
);

console.log(JSON.stringify(q.getStats(), null, 2));
