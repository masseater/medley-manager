import { Hono } from "hono";
import * as q from "../db/queries.js";

export function buildApi(): Hono {
  const api = new Hono();

  api.get("/stats", (c) => c.json(q.getStats()));

  api.get("/search", (c) => {
    const query = c.req.query("q")?.trim();
    if (!query) return c.json({ songs: [], videos: [], people: [] });
    return c.json(q.crossSearch(query));
  });

  api.get("/songs", (c) => c.json(q.listSongs(c.req.query("q")?.trim() || undefined)));

  api.get("/songs/:id", (c) => {
    const id = Number(c.req.param("id"));
    const song = q.getSong(id);
    if (!song) return c.json({ error: "not found" }, 404);
    return c.json({ ...song, usage: q.getSongUsage(id) });
  });

  api.get("/videos", (c) =>
    c.json(q.listVideos(c.req.query("q")?.trim() || undefined, c.req.query("kind")?.trim() || undefined))
  );

  api.get("/videos/:id", (c) => {
    const id = Number(c.req.param("id"));
    const video = q.getVideoRow(id);
    if (!video) return c.json({ error: "not found" }, 404);
    return c.json({
      ...video,
      parts: q.getVideoParts(id),
      referenced_by: q.getReferencingVideos(id),
    });
  });

  // ユーザーメモ（コメント）の更新。UI から直接叩く数少ない書き込み口
  api.patch("/videos/:id/comment", async (c) => {
    const id = Number(c.req.param("id"));
    const { comment } = await c.req.json<{ comment: string | null }>();
    const video = q.updateVideo(id, { comment: comment || null });
    if (!video) return c.json({ error: "not found" }, 404);
    return c.json(video);
  });

  api.patch("/parts/:id/comment", async (c) => {
    const id = Number(c.req.param("id"));
    const { comment } = await c.req.json<{ comment: string | null }>();
    const part = q.updatePart(id, { comment: comment || null });
    if (!part) return c.json({ error: "not found" }, 404);
    return c.json(part);
  });

  api.get("/people", (c) => c.json(q.listPeople(c.req.query("q")?.trim() || undefined)));

  api.get("/people/:id", (c) => {
    const person = q.getPerson(Number(c.req.param("id")));
    if (!person) return c.json({ error: "not found" }, 404);
    return c.json(person);
  });

  return api;
}
