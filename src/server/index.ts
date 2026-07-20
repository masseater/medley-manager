import { serve } from "@hono/node-server";
import { serveStatic } from "@hono/node-server/serve-static";
import { Hono } from "hono";
import { readFileSync, existsSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { buildApi } from "./app.js";
import { getDbPath } from "../db/db.js";

const here = dirname(fileURLToPath(import.meta.url));
const repoRoot = join(here, "..", "..");
const webDist = join(repoRoot, "web", "dist");

const app = new Hono();
app.route("/api", buildApi());

// 静的ファイル（ビルド済みフロントエンド）
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
  console.log(`DB: ${getDbPath()}`);
});
