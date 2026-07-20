/**
 * 既存動画に元動画URLを埋める。過去に URL 必須化前に登録されたレコード用。
 * また、fandom で名前だけ持っていた「OTOMAD CAPRICCIOSO」スタブや、
 * FavOtoMædⅣ Amethyst/Topaz の URL・投稿者を確定させる。
 *
 *   npx tsx scripts/backfill-urls.ts
 */
import * as q from "../src/db/queries.js";

const BACKFILL: Array<{
  title: string;
  url: string;
  uploader?: string;
  published_at?: string;
}> = [
  { title: "にょろにょろ合作3", url: "https://www.youtube.com/watch?v=EFv9KuB0i_M" },
  {
    title: "FavOtoMædⅣ Amethyst",
    url: "https://www.nicovideo.jp/watch/sm40179242",
    uploader: "蓑虫",
  },
  {
    title: "FavOtoMædⅣ Topaz",
    url: "https://www.nicovideo.jp/watch/sm40179371",
    uploader: "蓑虫",
  },
];

for (const b of BACKFILL) {
  const v = q.resolveVideoByTitle(b.title);
  if (!v) {
    console.warn(`skip: ${b.title} は未登録`);
    continue;
  }
  const patch: Parameters<typeof q.updateVideo>[1] = { url: b.url };
  if (b.uploader && !v.uploader) patch.uploader = b.uploader;
  if (b.published_at && !v.published_at) patch.published_at = b.published_at;
  q.updateVideo(v.id, patch);
  console.log(`updated #${v.id} ${v.title} → ${b.url}`);
}

console.log(JSON.stringify(q.getStats(), null, 2));
