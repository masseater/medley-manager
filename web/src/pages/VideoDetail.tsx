import { useCallback, useEffect, useState } from "react";
import { Link, useParams } from "react-router-dom";
import { Base, Heading, TextLink } from "smarthr-ui";
import { api, saveComment, VideoDetail as VD, watchUrl } from "../api";
import CommentEditor from "../components/CommentEditor";
import KindLabel from "../components/KindLabel";
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
      <Heading type="screenTitle" tag="h1" className="page-title">
        <KindLabel kind={video.kind} /> {video.title}
      </Heading>
      <p className="muted">
        {video.uploader && <>投稿者: {video.uploader} / </>}
        {video.published_at && <>投稿日: {video.published_at} / </>}
        {url && (
          <TextLink href={url} target="_blank">
            {video.video_id ?? "リンク"}
          </TextLink>
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

      <Heading type="sectionTitle" tag="h2" className="section-title">
        パート表（{video.parts.length}）
      </Heading>
      {video.parts.length === 0 ? (
        <p className="muted">パートが未登録です。</p>
      ) : (
        <Base padding={1} className="table-base">
          <PartsTable video={video} parts={video.parts} onChanged={reload} />
        </Base>
      )}

      {video.referenced_by.length > 0 && (
        <>
          <Heading type="sectionTitle" tag="h2" className="section-title">
            この動画を引用している動画
          </Heading>
          <div className="card-list">
            {video.referenced_by.map((v) => (
              <Base key={v.id} padding={0.75} className="card-item">
                <KindLabel kind={v.kind} />
                <Link to={`/videos/${v.id}`}>{v.title}</Link>
              </Base>
            ))}
          </div>
        </>
      )}
    </div>
  );
}
