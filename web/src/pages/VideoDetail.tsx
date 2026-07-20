import { useEffect, useState } from "react";
import { Link, useParams } from "react-router-dom";
import { api, fmtTime, KIND_LABEL, VideoDetail as VD, watchUrl } from "../api";

export default function VideoDetail() {
  const { id } = useParams();
  const [video, setVideo] = useState<VD | null>(null);
  const [error, setError] = useState("");

  useEffect(() => {
    api<VD>(`/videos/${id}`).then(setVideo).catch((e) => setError(String(e)));
  }, [id]);

  if (error) return <p className="muted">動画が見つかりません。</p>;
  if (!video) return null;

  const url = watchUrl(video);
  const hasTimestamps = video.parts.some((p) => p.start_sec != null);
  const hasBpm = video.parts.some((p) => p.bpm);
  const hasBars = video.parts.some((p) => p.bars);
  const hasStaff = video.parts.some((p) => p.staff.length > 0);

  const staffOf = (p: VD["parts"][number], role: string) =>
    p.staff
      .filter((s) => s.role === role)
      .map((s, i) => (
        <span key={s.person_id}>
          {i > 0 && ", "}
          <Link to={`/people/${s.person_id}`}>{s.name}</Link>
        </span>
      ));

  return (
    <div>
      <p className="breadcrumb">
        <Link to="/videos">動画一覧</Link>
      </p>
      <h1>
        <span className={`badge kind-${video.kind}`}>{KIND_LABEL[video.kind]}</span> {video.title}
      </h1>
      <p className="muted">
        {video.uploader && <>投稿者: {video.uploader} / </>}
        {video.published_at && <>投稿日: {video.published_at} / </>}
        {url && (
          <a href={url} target="_blank" rel="noreferrer">
            {video.video_id ?? "リンク"} ↗
          </a>
        )}
      </p>
      {video.note && <p>{video.note}</p>}

      <h2>パート表（{video.parts.length}）</h2>
      {video.parts.length === 0 ? (
        <p className="muted">パートが未登録です。</p>
      ) : (
        <table className="table">
          <thead>
            <tr>
              <th className="num">No.</th>
              {hasTimestamps && <th>時間</th>}
              <th>曲 / 引用元</th>
              {hasBpm && <th>BPM</th>}
              {hasBars && <th className="num">小節</th>}
              {hasStaff && <th>音声</th>}
              {hasStaff && <th>映像</th>}
            </tr>
          </thead>
          <tbody>
            {video.parts.map((p) => (
              <tr key={p.id}>
                <td className="num">{p.position}</td>
                {hasTimestamps && (
                  <td>
                    {p.start_sec != null && (
                      <a href={watchUrl(video, p.start_sec) ?? undefined} target="_blank" rel="noreferrer">
                        {fmtTime(p.start_sec)}
                      </a>
                    )}
                  </td>
                )}
                <td>
                  {p.song_id ? (
                    <Link to={`/songs/${p.song_id}`}>{p.song_title}</Link>
                  ) : p.label ? (
                    <span>{p.label}</span>
                  ) : null}
                  {p.ref_video_id && (
                    <span className="muted small">
                      {" "}
                      ← <Link to={`/videos/${p.ref_video_id}`}>{p.ref_video_title}</Link>
                    </span>
                  )}
                  {p.song_id && p.label && p.label !== p.song_title && (
                    <span className="muted small">（表記: {p.label}）</span>
                  )}
                </td>
                {hasBpm && <td>{p.bpm ?? ""}</td>}
                {hasBars && <td className="num">{p.bars ?? ""}</td>}
                {hasStaff && <td>{staffOf(p, "audio")}</td>}
                {hasStaff && <td>{staffOf(p, "video")}</td>}
              </tr>
            ))}
          </tbody>
        </table>
      )}

      {video.referenced_by.length > 0 && (
        <>
          <h2>この動画を引用している動画</h2>
          <ul className="card-list">
            {video.referenced_by.map((v) => (
              <li key={v.id}>
                <Link to={`/videos/${v.id}`}>
                  <span className={`badge kind-${v.kind}`}>{KIND_LABEL[v.kind]}</span> {v.title}
                </Link>
              </li>
            ))}
          </ul>
        </>
      )}
    </div>
  );
}
