import { useEffect, useState } from "react";
import { Link, useSearchParams } from "react-router-dom";
import { api, KIND_LABEL, Person, Song, Video } from "../api";

type Results = { songs: Song[]; videos: Video[]; people: Person[] };

export default function SearchResults() {
  const [params] = useSearchParams();
  const q = params.get("q") ?? "";
  const [results, setResults] = useState<Results | null>(null);

  useEffect(() => {
    if (q) api<Results>(`/search?q=${encodeURIComponent(q)}`).then(setResults).catch(console.error);
  }, [q]);

  if (!results) return null;
  const empty = results.songs.length === 0 && results.videos.length === 0 && results.people.length === 0;

  return (
    <div>
      <h1>「{q}」の検索結果</h1>
      {empty && <p className="muted">見つかりませんでした。</p>}
      {results.videos.length > 0 && (
        <>
          <h2>動画</h2>
          <ul className="card-list">
            {results.videos.map((v) => (
              <li key={v.id}>
                <Link to={`/videos/${v.id}`}>
                  <span className={`badge kind-${v.kind}`}>{KIND_LABEL[v.kind]}</span> {v.title}
                </Link>
              </li>
            ))}
          </ul>
        </>
      )}
      {results.songs.length > 0 && (
        <>
          <h2>曲</h2>
          <ul className="card-list">
            {results.songs.map((s) => (
              <li key={s.id}>
                <Link to={`/songs/${s.id}`}>{s.title}</Link>
                {s.artist && <span className="muted small"> — {s.artist}</span>}
              </li>
            ))}
          </ul>
        </>
      )}
      {results.people.length > 0 && (
        <>
          <h2>担当者</h2>
          <ul className="card-list">
            {results.people.map((p) => (
              <li key={p.id}>
                <Link to={`/people/${p.id}`}>{p.name}</Link>
              </li>
            ))}
          </ul>
        </>
      )}
    </div>
  );
}
