import { useCallback, useEffect, useState } from "react";
import { Link, useParams } from "react-router-dom";
import { Base, Heading, TextLink } from "smarthr-ui";
import { api, fmtTime, SongDetail as SD } from "../api";
import KindLabel from "../components/KindLabel";
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
      <Heading type="screenTitle" tag="h1" className="page-title">
        {song.title}
      </Heading>
      <p className="muted">
        {song.artist && <>アーティスト: {song.artist} / </>}
        {song.genre && <>ジャンル: {song.genre} / </>}
        {song.url && (
          <TextLink href={song.url} target="_blank">
            原曲リンク
          </TextLink>
        )}
      </p>
      {song.aliases.length > 0 && <p className="muted">別表記: {song.aliases.join(" / ")}</p>}
      {song.note && <p className="muted small">{song.note}</p>}

      <Heading type="sectionTitle" tag="h2" className="section-title">
        この曲を使っている動画（{song.usage.direct.length}）
      </Heading>
      {song.usage.direct.length === 0 ? (
        <p className="muted">まだ使用動画が登録されていません。</p>
      ) : (
        <div>
          {song.usage.direct.map((v) => (
            <details key={v.id} className="usage-details">
              <summary>
                <Link to={`/videos/${v.id}`} onClick={(e) => e.stopPropagation()}>
                  <KindLabel kind={v.kind} /> {v.title}
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
          <Heading type="sectionTitle" tag="h2" className="section-title">
            間接的に使っている動画（メドレー経由）
          </Heading>
          <div className="card-list">
            {song.usage.indirect.map((v) => (
              <Base key={v.id} padding={0.75} className="card-item">
                <KindLabel kind={v.kind} />
                <Link to={`/videos/${v.id}`}>{v.title}</Link>
                <span className="muted small"> — {v.via.join(", ")} 経由</span>
              </Base>
            ))}
          </div>
        </>
      )}
    </div>
  );
}
