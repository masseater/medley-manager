import { useEffect, useState } from "react";
import { Link, useSearchParams } from "react-router-dom";
import { Base, Heading } from "smarthr-ui";
import { api, Person, Song, Video } from "../api";
import KindLabel from "../components/KindLabel";

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
      <Heading type="screenTitle" tag="h1" className="page-title">
        「{q}」の検索結果
      </Heading>
      {empty && <p className="muted">見つかりませんでした。</p>}
      {results.videos.length > 0 && (
        <>
          <Heading type="sectionTitle" tag="h2" className="section-title">
            動画
          </Heading>
          <div className="card-list">
            {results.videos.map((v) => (
              <Base key={v.id} padding={0.75} className="card-item">
                <KindLabel kind={v.kind} />
                <Link to={`/videos/${v.id}`}>{v.title}</Link>
              </Base>
            ))}
          </div>
        </>
      )}
      {results.songs.length > 0 && (
        <>
          <Heading type="sectionTitle" tag="h2" className="section-title">
            曲
          </Heading>
          <div className="card-list">
            {results.songs.map((s) => (
              <Base key={s.id} padding={0.75} className="card-item">
                <Link to={`/songs/${s.id}`}>{s.title}</Link>
                {s.artist && <span className="muted small"> — {s.artist}</span>}
              </Base>
            ))}
          </div>
        </>
      )}
      {results.people.length > 0 && (
        <>
          <Heading type="sectionTitle" tag="h2" className="section-title">
            担当者
          </Heading>
          <div className="card-list">
            {results.people.map((p) => (
              <Base key={p.id} padding={0.75} className="card-item">
                <Link to={`/people/${p.id}`}>{p.name}</Link>
              </Base>
            ))}
          </div>
        </>
      )}
    </div>
  );
}
