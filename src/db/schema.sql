CREATE TABLE IF NOT EXISTS songs (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  title TEXT NOT NULL,
  artist TEXT,
  url TEXT,
  genre TEXT,
  note TEXT,
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS song_aliases (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  song_id INTEGER NOT NULL REFERENCES songs(id) ON DELETE CASCADE,
  alias TEXT NOT NULL,
  UNIQUE(song_id, alias)
);

CREATE TABLE IF NOT EXISTS videos (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  title TEXT NOT NULL,
  kind TEXT NOT NULL DEFAULT 'medley' CHECK (kind IN ('medley', 'collab', 'single', 'other')),
  video_id TEXT,
  url TEXT,
  uploader TEXT,
  published_at TEXT,
  note TEXT,
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS people (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  name TEXT NOT NULL UNIQUE
);

CREATE TABLE IF NOT EXISTS person_aliases (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  person_id INTEGER NOT NULL REFERENCES people(id) ON DELETE CASCADE,
  alias TEXT NOT NULL,
  UNIQUE(person_id, alias)
);

-- パート: 動画1本を構成する1区間。
-- song_id = この区間で使われている曲 / ref_video_id = この区間が引用している別動画（メドレー等）
-- label = 元スプシの表記そのまま（曲が特定できない場合は label だけでも登録できる）
CREATE TABLE IF NOT EXISTS parts (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  video_id INTEGER NOT NULL REFERENCES videos(id) ON DELETE CASCADE,
  position INTEGER NOT NULL,
  song_id INTEGER REFERENCES songs(id) ON DELETE SET NULL,
  ref_video_id INTEGER REFERENCES videos(id) ON DELETE SET NULL,
  label TEXT,
  bpm TEXT,
  bars TEXT,
  start_sec REAL,
  end_sec REAL,
  note TEXT,
  CHECK (song_id IS NOT NULL OR ref_video_id IS NOT NULL OR label IS NOT NULL)
);

CREATE INDEX IF NOT EXISTS idx_parts_video ON parts(video_id, position);
CREATE INDEX IF NOT EXISTS idx_parts_song ON parts(song_id);
CREATE INDEX IF NOT EXISTS idx_parts_ref ON parts(ref_video_id);

CREATE TABLE IF NOT EXISTS part_staff (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  part_id INTEGER NOT NULL REFERENCES parts(id) ON DELETE CASCADE,
  person_id INTEGER NOT NULL REFERENCES people(id) ON DELETE CASCADE,
  role TEXT NOT NULL CHECK (role IN ('audio', 'video', 'other')),
  UNIQUE(part_id, person_id, role)
);

CREATE INDEX IF NOT EXISTS idx_part_staff_person ON part_staff(person_id);
