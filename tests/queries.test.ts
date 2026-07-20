import { beforeEach, describe, expect, it } from "vitest";
import { getDb } from "../src/db/db.js";
import * as q from "../src/db/queries.js";

beforeEach(() => {
  const db = getDb();
  db.exec("DELETE FROM part_staff; DELETE FROM parts; DELETE FROM videos;");
  db.exec("DELETE FROM song_aliases; DELETE FROM songs;");
  db.exec("DELETE FROM person_aliases; DELETE FROM people;");
});

describe("曲マスタ", () => {
  it("作成・タイトル/エイリアスでの完全一致解決", () => {
    const song = q.createSong({ title: "グッバイ宣言", artist: "Chinozo", aliases: ["goodbye sengen"] });
    expect(q.resolveSongByTitle("グッバイ宣言")?.id).toBe(song.id);
    expect(q.resolveSongByTitle("goodbye sengen")?.id).toBe(song.id);
    expect(q.resolveSongByTitle("存在しない曲")).toBeNull();
  });

  it("部分一致検索はタイトル・エイリアス・アーティストに効く", () => {
    q.createSong({ title: "フォニイ", artist: "ツミキ", aliases: ["phony"] });
    expect(q.listSongs("フォニ")).toHaveLength(1);
    expect(q.listSongs("phon")).toHaveLength(1);
    expect(q.listSongs("ツミキ")).toHaveLength(1);
    expect(q.listSongs("100%")).toHaveLength(0); // LIKE特殊文字がエスケープされる
  });

  it("merge_songs で参照が付け替わり、旧タイトルがエイリアスとして残る", () => {
    const a = q.createSong({ title: "テレキャスタービーボーイ" });
    const b = q.createSong({ title: "テレキャスタービーボーイ(long ver.)" });
    const video = q.createVideo({ title: "テスト動画" });
    q.setVideoParts(video.id, [{ song_id: b.id }]);

    const merged = q.mergeSongs(b.id, a.id)!;
    expect(merged.id).toBe(a.id);
    expect(merged.aliases).toContain("テレキャスタービーボーイ(long ver.)");
    expect(q.getSong(b.id)).toBeNull();
    expect(q.getVideoParts(video.id)[0].song_id).toBe(a.id);
  });
});

describe("パート登録", () => {
  it("song_title は既存曲に解決され、無ければ自動作成される", () => {
    const existing = q.createSong({ title: "ナイト・オブ・ナイツ" });
    const video = q.createVideo({ title: "メドレーA" });
    const parts = q.setVideoParts(video.id, [
      { song_title: "ナイト・オブ・ナイツ" },
      { song_title: "新規曲X", bpm: "140-180", bars: "8+16" },
    ]);
    expect(parts[0].song_id).toBe(existing.id);
    expect(parts[1].song_title).toBe("新規曲X");
    expect(parts[1].bpm).toBe("140-180"); // BPM・小節は任意の文字列
    expect(q.resolveSongByTitle("新規曲X")).not.toBeNull();
  });

  it("BPM・小節・担当者なしでも登録できる（全項目任意）", () => {
    const video = q.createVideo({ title: "シンプル動画" });
    const parts = q.setVideoParts(video.id, [{ song_title: "曲だけ" }, { label: "曲名不明パート" }]);
    expect(parts).toHaveLength(2);
    expect(parts[0].bpm).toBeNull();
    expect(parts[0].staff).toEqual([]);
    expect(parts[1].song_id).toBeNull();
    expect(parts[1].label).toBe("曲名不明パート");
  });

  it("曲もref動画もlabelも無いパートはエラー", () => {
    const video = q.createVideo({ title: "動画" });
    expect(() => q.setVideoParts(video.id, [{ bpm: "150" }])).toThrow();
  });

  it("担当者は名前で解決・自動作成され、逆引きできる", () => {
    const video = q.createVideo({ title: "合作B", kind: "collab" });
    q.setVideoParts(video.id, [
      { song_title: "曲1", audio_staff: ["たっぴ"], video_staff: ["たっぴ", "わっつー"] },
    ]);
    const people = q.listPeople();
    expect(people.map((p) => p.name).sort()).toEqual(["たっぴ", "わっつー"]);
    const tappi = q.getPerson(people.find((p) => p.name === "たっぴ")!.id)!;
    expect(tappi.works).toHaveLength(2); // audio + video
  });

  it("ref_video_title は未登録ならメドレーとしてスタブ作成される", () => {
    const video = q.createVideo({ title: "合作C", kind: "collab" });
    q.setVideoParts(video.id, [{ song_title: "曲1", ref_video_title: "引用元メドレーZ" }]);
    const stub = q.resolveVideoByTitle("引用元メドレーZ")!;
    expect(stub.kind).toBe("medley");
    expect(q.getReferencingVideos(stub.id).map((v) => v.id)).toEqual([video.id]);
  });

  it("add_parts は末尾に追記する", () => {
    const video = q.createVideo({ title: "動画D" });
    q.setVideoParts(video.id, [{ song_title: "曲1" }]);
    const parts = q.addParts(video.id, [{ song_title: "曲2" }]);
    expect(parts.map((p) => [p.position, p.song_title])).toEqual([
      [1, "曲1"],
      [2, "曲2"],
    ]);
  });
});

describe("逆引き", () => {
  it("直接使用と間接使用（メドレー経由の再帰）", () => {
    const medley = q.createVideo({ title: "メドレーM", kind: "medley" });
    q.setVideoParts(medley.id, [{ song_title: "共通曲" }]);
    const collab = q.createVideo({ title: "合作G", kind: "collab" });
    q.setVideoParts(collab.id, [{ song_title: "別の曲", ref_video_title: "メドレーM" }]);

    const song = q.resolveSongByTitle("共通曲")!;
    const usage = q.getSongUsage(song.id);
    expect(usage.direct.map((v) => v.title)).toEqual(["メドレーM"]);
    expect(usage.indirect.map((v) => v.title)).toEqual(["合作G"]);
    expect(usage.indirect[0].via).toContain("メドレーM");
  });

  it("直接使用のパート詳細（展開表示用）が含まれる", () => {
    const video = q.createVideo({ title: "動画H" });
    q.setVideoParts(video.id, [
      { song_title: "曲A", bpm: "180", start_sec: 90, audio_staff: ["ns"] },
      { song_title: "曲B" },
    ]);
    const song = q.resolveSongByTitle("曲A")!;
    const usage = q.getSongUsage(song.id);
    expect(usage.direct[0].parts).toHaveLength(1);
    const part = usage.direct[0].parts[0];
    expect(part.bpm).toBe("180");
    expect(part.start_sec).toBe(90);
    expect(part.staff[0].name).toBe("ns");
  });

  it("循環引用があっても無限ループしない", () => {
    const a = q.createVideo({ title: "動画α" });
    const b = q.createVideo({ title: "動画β" });
    q.setVideoParts(a.id, [{ song_title: "循環曲", ref_video_id: b.id }]);
    q.setVideoParts(b.id, [{ label: "αを引用", ref_video_id: a.id }]);
    const song = q.resolveSongByTitle("循環曲")!;
    const usage = q.getSongUsage(song.id);
    expect(usage.direct.map((v) => v.title)).toEqual(["動画α"]);
    expect(usage.indirect.map((v) => v.title)).toEqual(["動画β"]);
  });
});

describe("コメント（ユーザーメモ）", () => {
  it("動画コメントの設定と削除", () => {
    const video = q.createVideo({ title: "動画I" });
    expect(q.updateVideo(video.id, { comment: "神メドレー" })!.comment).toBe("神メドレー");
    expect(q.updateVideo(video.id, { comment: null })!.comment).toBeNull();
  });

  it("パートコメントの設定と削除", () => {
    const video = q.createVideo({ title: "動画J" });
    const [part] = q.setVideoParts(video.id, [{ song_title: "曲C" }]);
    expect(q.updatePart(part.id, { comment: "ここの繋ぎが好き" })!.comment).toBe("ここの繋ぎが好き");
    expect(q.updatePart(part.id, { comment: null })!.comment).toBeNull();
  });
});

describe("削除・統合", () => {
  it("動画削除でパートも消え、他動画からの引用参照は安全に外れる", () => {
    const medley = q.createVideo({ title: "メドレーN", kind: "medley" });
    q.setVideoParts(medley.id, [{ song_title: "曲D" }]);
    const collab = q.createVideo({ title: "合作O", kind: "collab" });
    q.setVideoParts(collab.id, [
      { song_title: "曲E", ref_video_id: medley.id },
      { label: "ref のみのパート", ref_video_id: medley.id },
    ]);

    expect(q.deleteVideo(medley.id)).toBe(true);
    const parts = q.getVideoParts(collab.id);
    expect(parts).toHaveLength(2);
    expect(parts.every((p) => p.ref_video_id === null)).toBe(true);
  });

  it("merge_people で担当が付け替わる", () => {
    const video = q.createVideo({ title: "動画P" });
    q.setVideoParts(video.id, [{ song_title: "曲F", audio_staff: ["KP"], video_staff: [" KP "] }]);
    q.addParts(video.id, [{ song_title: "曲G", audio_staff: ["けーぴー"] }]);
    const kp = q.resolvePersonByName("KP", false)!;
    const kp2 = q.resolvePersonByName("けーぴー", false)!;
    const merged = q.mergePeople(kp2.id, kp.id)!;
    expect(merged.aliases).toContain("けーぴー");
    expect(merged.works).toHaveLength(3);
  });
});
