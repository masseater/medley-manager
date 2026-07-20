import { beforeAll, describe, expect, it } from "vitest";
import { Hono } from "hono";
import { buildApi } from "../src/server/app.js";
import * as q from "../src/db/queries.js";

const app = new Hono().route("/api", buildApi());
const get = async (path: string) => {
  const res = await app.request(`/api${path}`);
  return { status: res.status, body: await res.json() };
};

let videoId = 0;
let songId = 0;
let partId = 0;

beforeAll(() => {
  const video = q.createVideo({ title: "APIテスト合作", kind: "collab", video_id: "sm99999999" });
  videoId = video.id;
  const parts = q.setVideoParts(video.id, [
    { song_title: "API曲1", bpm: "180", audio_staff: ["てすたー"], ref_video_title: "APIメドレー" },
    { song_title: "API曲2", start_sec: 123.5 },
  ]);
  partId = parts[0].id;
  songId = parts[0].song_id!;
});

describe("GET API", () => {
  it("/stats", async () => {
    const { status, body } = await get("/stats");
    expect(status).toBe(200);
    expect(body.videos).toBe(2); // 合作 + 自動作成メドレー
    expect(body.parts).toBe(2);
  });

  it("/videos と kind フィルタ", async () => {
    expect((await get("/videos")).body).toHaveLength(2);
    const collabs = (await get("/videos?kind=collab")).body;
    expect(collabs).toHaveLength(1);
    expect(collabs[0].title).toBe("APIテスト合作");
  });

  it("/videos/:id はパートと被引用を返す", async () => {
    const { body } = await get(`/videos/${videoId}`);
    expect(body.parts).toHaveLength(2);
    expect(body.parts[0].staff[0].name).toBe("てすたー");
    const medley = (await get("/videos?kind=medley")).body[0];
    const ref = await get(`/videos/${medley.id}`);
    expect(ref.body.referenced_by[0].id).toBe(videoId);
  });

  it("/songs/:id は使用状況つき", async () => {
    const { body } = await get(`/songs/${songId}`);
    expect(body.title).toBe("API曲1");
    expect(body.usage.direct[0].id).toBe(videoId);
    expect(body.usage.direct[0].parts[0].bpm).toBe("180");
  });

  it("/search は横断検索", async () => {
    const { body } = await get("/search?q=API");
    expect(body.songs.length).toBeGreaterThanOrEqual(2);
    expect(body.videos.length).toBeGreaterThanOrEqual(2);
  });

  it("存在しないIDは404", async () => {
    expect((await get("/videos/9999")).status).toBe(404);
    expect((await get("/songs/9999")).status).toBe(404);
    expect((await get("/people/9999")).status).toBe(404);
  });
});

describe("コメント PATCH API", () => {
  const patch = async (path: string, comment: string | null) => {
    const res = await app.request(`/api${path}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ comment }),
    });
    return { status: res.status, body: await res.json() };
  };

  it("動画コメントを保存・削除できる", async () => {
    const saved = await patch(`/videos/${videoId}/comment`, "お気に入り");
    expect(saved.status).toBe(200);
    expect(saved.body.comment).toBe("お気に入り");
    const cleared = await patch(`/videos/${videoId}/comment`, null);
    expect(cleared.body.comment).toBeNull();
  });

  it("パートコメントを保存できる", async () => {
    const saved = await patch(`/parts/${partId}/comment`, "繋ぎが良い");
    expect(saved.status).toBe(200);
    expect(saved.body.comment).toBe("繋ぎが良い");
    expect((await get(`/videos/${videoId}`)).body.parts[0].comment).toBe("繋ぎが良い");
  });

  it("存在しないIDは404", async () => {
    expect((await patch("/videos/9999/comment", "x")).status).toBe(404);
    expect((await patch("/parts/9999/comment", "x")).status).toBe(404);
  });
});
