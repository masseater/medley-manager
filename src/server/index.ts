import { serve } from "@hono/node-server";
import { serveStatic } from "@hono/node-server/serve-static";
import { Hono } from "hono";
import { readFileSync, existsSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import * as q from "../db/queries.js";
import { DB_PATH } from "../db/db.js";

const here = dirname(fileURLToPath(import.meta.url));
const repoRoot = join(here, "..", "..");
const webDist = join(repoRoot, "web", "dist");

const app = new Hono();

// ---------- API ----------

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

api.get("/people", (c) => c.json(q.listPeople(c.req.query("q")?.trim() || undefined)));

api.get("/people/:id", (c) => {
  const person = q.getPerson(Number(c.req.param("id")));
  if (!person) return c.json({ error: "not found" }, 404);
  return c.json(person);
});

app.route("/api", api);

// ---------- 静的ファイル（ビルド済みフロントエンド） ----------

app.use("/assets/*", serveStatic({ root: "./web/dist" }));
app.get("*", (c) => {
  const index = join(webDist, "index.html");
  if (!existsSync(index)) {
    return c.text("フロントエンドが未ビルドです。`npm run build` を実行してください。", 503);
  }
  return c.html(readFileSync(index, "utf8"));
});

const port = Number(process.env.PORT ?? 8765);
serve({ fetch: app.fetch, port }, () => {
  console.log(`medley-manager: http://localhost:${port}`);
  console.log(`DB: ${DB_PATH}`);
});
