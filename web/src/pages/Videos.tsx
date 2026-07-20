import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { api, KIND_LABEL, Video } from "../api";

const KINDS = ["", "medley", "collab", "single", "other"] as const;

export default function Videos() {
  const [videos, setVideos] = useState<Video[]>([]);
  const [q, setQ] = useState("");
  const [kind, setKind] = useState("");

  useEffect(() => {
    const params = new URLSearchParams();
    if (q) params.set("q", q);
    if (kind) params.set("kind", kind);
    api<Video[]>(`/videos?${params}`).then(setVideos).catch(console.error);
  }, [q, kind]);

  return (
    <div>
      <h1>動画一覧</h1>
      <div className="filter-row">
        <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="タイトル・ID・投稿者で絞り込み" />
        <select value={kind} onChange={(e) => setKind(e.target.value)}>
          {KINDS.map((k) => (
            <option key={k} value={k}>
              {k === "" ? "すべての種別" : KIND_LABEL[k]}
            </option>
          ))}
        </select>
      </div>
      <table className="table">
        <thead>
          <tr>
            <th>種別</th>
            <th>タイトル</th>
            <th>投稿者</th>
            <th className="num">パート数</th>
          </tr>
        </thead>
        <tbody>
          {videos.map((v) => (
            <tr key={v.id}>
              <td>
                <span className={`badge kind-${v.kind}`}>{KIND_LABEL[v.kind]}</span>
              </td>
              <td>
                <Link to={`/videos/${v.id}`}>{v.title}</Link>
                {v.video_id && <span className="muted small"> {v.video_id}</span>}
              </td>
              <td>{v.uploader ?? ""}</td>
              <td className="num">{v.part_count}</td>
            </tr>
          ))}
        </tbody>
      </table>
      {videos.length === 0 && <p className="muted">該当する動画がありません。</p>}
    </div>
  );
}
