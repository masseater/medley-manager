# medley-manager

ニコメド（ニコニコメドレー）・合作動画の素材管理アプリ。

曲 → メドレー → 合作動画 の使用関係を正規化して管理し、

- **この曲を使ってるメドレー・動画はどれ？**（間接引用も再帰的に辿る）
- **このメドレーを引用してる動画はどれ？**

を逆引きできる。データ入力は AI が MCP 経由で行う前提で、Web UI は閲覧・検索専用。

## 構成

- **サーバー**: Hono + better-sqlite3（`src/server/`、`http://localhost:8765`）
- **フロントエンド**: React + Vite（`web/`、ビルド済みをサーバーが配信）
- **MCPサーバー**: stdio、同じ SQLite を直接読み書き（`src/mcp/`）
- **DB**: `data/medley.db`（SQLite 1ファイル。バックアップはコピーするだけ。環境変数 `MEDLEY_DB` で変更可）

## 使い方

```powershell
npm install
npm --prefix web install
npm run build   # フロントエンドのビルド
npm start       # http://localhost:8765 で起動
```

開発時は `npm run dev`（サーバー watch + Vite dev server :5173)。

```powershell
npm test           # ユニットテスト（vitest、インメモリDB）
npm run knip       # 未使用コード・依存の検出（root + web）
npm run typecheck  # 型チェック（root + web）
```

## MCP

リポジトリ直下の `.mcp.json` でプロジェクトスコープ登録済み。このディレクトリで Claude Code を開けばそのまま使える。

どこからでも使えるようにするならユーザースコープで登録:

```powershell
claude mcp add --scope user medley-manager -- npx tsx C:/Users/u1/medley-manager/src/mcp/index.ts
```

### ツール一覧

| ツール | 用途 |
| --- | --- |
| `search_songs` / `get_song` | 曲の検索・詳細（使用動画の逆引き付き） |
| `create_song` / `update_song` / `delete_song` | 曲マスタの管理 |
| `add_song_alias` / `remove_song_alias` / `merge_songs` | 表記ゆれの名寄せ（エイリアス追加・削除・重複統合） |
| `search_videos` / `get_video` | 動画の検索・詳細（パート表 + 被引用一覧） |
| `create_video` / `update_video` / `delete_video` | 動画（メドレー/合作/単品）の管理 |
| `set_video_parts` / `add_parts` | パート表の一括登録（スプシ取り込みはこれ） |
| `update_part` / `delete_part` | パート単位の修正 |
| `search_people` / `get_person` / `merge_people` | 担当者の検索・名寄せ |
| `get_stats` | 登録件数 |

### スプシ取り込みの流れ

1. `create_video` で合作動画を登録（kind: `collab`）
2. スプシを読み取り、`set_video_parts` にパート配列を渡す
   - `song_title` は完全一致で既存曲に紐付き、無ければ自動作成。表記ゆれが疑われる場合は先に `search_songs` で確認し、既存表記に合わせるか `add_song_alias` でエイリアスを張る
   - パートがメドレーを引用している場合は `ref_video_title` にメドレー名（未登録ならメドレーのスタブ動画が自動作成される）
   - マッシュアップ（「A & B」等）は曲ごとにパートを分け、`label` に原文表記を残す
   - タイムスタンプが分かる場合は `start_sec` / `end_sec`（任意）

取り込み実装の例: `scripts/seed-grillme.ts`（合作パート表）、`scripts/seed-tracklist.ts`（メドレー曲目リストCSVの汎用取り込み）、`scripts/seed-otomedo.ts`（大百科の曲リストから）。

## コメント（ユーザーメモ）

動画とパートには `comment`（ユーザーのメモ）を付けられる。Web UI から直接編集でき（💬ボタン）、MCP の `update_video` / `update_part` / `set_video_parts` でも読み書きできる。`note` はスプシ等データ由来の備考、`comment` はユーザーのメモ、と使い分ける。UI の書き込みは `PATCH /api/videos/:id/comment` と `PATCH /api/parts/:id/comment` のみ。

注意: `set_video_parts` はパート表を丸ごと差し替えるため、既存パートのコメントは消える。再取り込み時は先に `get_video` で確認すること。

## データモデル

```
songs（曲マスタ）── song_aliases（別表記）
videos（動画: medley / collab / single / other）
parts（動画のパート、順番つき）
  ├ song_id      … このパートで使われている曲
  ├ ref_video_id … このパートが引用している別動画（メドレー等）
  ├ label        … 原文表記
  ├ bpm / bars   … 文字列（範囲・複合表記をそのまま保持、無くてもよい）
  ├ note / comment … データ由来の備考 / ユーザーメモ
  └ start_sec / end_sec … 再生位置（任意）

  ※ 曲/引用元/表記(label)のどれか1つがあればよく、BPM・小節・担当者・時間はすべて任意
part_staff ── people（担当者）── person_aliases
```

曲の逆引きは `parts.song_id` で直接使用を、`parts.ref_video_id` を再帰的に辿って間接使用（メドレー経由）を求める。
