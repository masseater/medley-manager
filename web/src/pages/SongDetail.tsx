import { useCallback, useEffect, useState } from "react";
import { Link, useParams } from "react-router-dom";
import { api, fmtTime, KIND_LABEL, SongDetail as SD } from "../api";
import PartsTable from "../components/PartsTable";

export default function SongDetail() {
  const { id } = useParams();
  const [song, setSong] = useState<SD | null>(null);
  const [error, setError] = useState("");

  const reload = useCallback(() => {
    api<SD>(`/songs/${id}`).then(setSong).catch((e) => setError(String(e)));
  }, [id]);

  useEffect(reload, [reload]);

  if (error) return <p className="muted">曲が見つかりません。</p>;
  if (!song) return null;

  return (
    <div>
      <p className="breadcrumb">
        <Link to="/songs">曲一覧</Link>
      </p>
      <h1>{song.title}</h1>
      <p className="muted">
        {song.artist && <>アーティスト: {song.artist} / </>}
        {song.genre && <>ジャンル: {song.genre} / </>}
        {song.url && (
          <a href={song.url} target="_blank" rel="noreferrer">
            原曲リンク ↗
          </a>
        )}
      </p>
      {song.aliases.length > 0 && <p className="muted">別表記: {song.aliases.join(" / ")}</p>}
      {song.note && <p className="muted small">{song.note}</p>}

      <h2>この曲を使っている動画（{song.usage.direct.length}）</h2>
      {song.usage.direct.length === 0 ? (
        <p className="muted">まだ使用動画が登録されていません。</p>
      ) : (
        <div>
          {song.usage.direct.map((v) => (
            <details key={v.id} className="usage-details">
              <summary>
                <Link to={`/videos/${v.id}`} onClick={(e) => e.stopPropagation()}>
                  <span className={`badge kind-${v.kind}`}>{KIND_LABEL[v.kind]}</span> {v.title}
                </Link>
                <span className="muted small">
                  {" "}
                  {v.parts
                    .map((p) => (p.start_sec != null ? `${fmtTime(p.start_sec)}〜` : `No.${p.position}`))
                    .join(", ")}
                </span>
              </summary>
              <div className="usage-body">
                <PartsTable video={v} parts={v.parts} onChanged={reload} />
              </div>
            </details>
          ))}
        </div>
      )}

      {song.usage.indirect.length > 0 && (
        <>
          <h2>間接的に使っている動画（メドレー経由）</h2>
          <ul className="card-list">
            {song.usage.indirect.map((v) => (
              <li key={v.id}>
                <Link to={`/videos/${v.id}`}>
                  <span className={`badge kind-${v.kind}`}>{KIND_LABEL[v.kind]}</span> {v.title}
                </Link>
                <span className="muted small"> — {v.via.join(", ")} 経由</span>
              </li>
            ))}
          </ul>
        </>
      )}
    </div>
  );
}
