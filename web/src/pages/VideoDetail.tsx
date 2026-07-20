import { useCallback, useEffect, useState } from "react";
import { Link, useParams } from "react-router-dom";
import { api, KIND_LABEL, saveComment, VideoDetail as VD, watchUrl } from "../api";
import CommentEditor from "../components/CommentEditor";
import PartsTable from "../components/PartsTable";

export default function VideoDetail() {
  const { id } = useParams();
  const [video, setVideo] = useState<VD | null>(null);
  const [error, setError] = useState("");

  const reload = useCallback(() => {
    api<VD>(`/videos/${id}`).then(setVideo).catch((e) => setError(String(e)));
  }, [id]);

  useEffect(reload, [reload]);

  if (error) return <p className="muted">動画が見つかりません。</p>;
  if (!video) return null;

  const url = watchUrl(video);

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
      {video.note && <p className="muted small">{video.note}</p>}
      <p>
        <CommentEditor
          value={video.comment}
          onSave={async (text) => {
            await saveComment("videos", video.id, text);
            reload();
          }}
        />
      </p>

      <h2>パート表（{video.parts.length}）</h2>
      {video.parts.length === 0 ? (
        <p className="muted">パートが未登録です。</p>
      ) : (
        <PartsTable video={video} parts={video.parts} onChanged={reload} />
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
