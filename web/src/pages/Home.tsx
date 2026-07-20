import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { api, KIND_LABEL, Stats, Video } from "../api";

export default function Home() {
  const [stats, setStats] = useState<Stats | null>(null);
  const [videos, setVideos] = useState<Video[]>([]);

  useEffect(() => {
    api<Stats>("/stats").then(setStats).catch(console.error);
    api<Video[]>("/videos").then((v) => setVideos(v.slice(0, 10))).catch(console.error);
  }, []);

  return (
    <div>
      <h1>ニコメド管理</h1>
      {stats && (
        <div className="stat-row">
          <Link to="/videos" className="stat-tile">
            <div className="stat-num">{stats.videos}</div>
            <div className="stat-label">動画</div>
          </Link>
          <Link to="/songs" className="stat-tile">
            <div className="stat-num">{stats.songs}</div>
            <div className="stat-label">曲</div>
          </Link>
          <div className="stat-tile">
            <div className="stat-num">{stats.parts}</div>
            <div className="stat-label">パート</div>
          </div>
          <Link to="/people" className="stat-tile">
            <div className="stat-num">{stats.people}</div>
            <div className="stat-label">担当者</div>
          </Link>
        </div>
      )}
      <h2>動画</h2>
      {videos.length === 0 ? (
        <p className="muted">
          まだ何も登録されていません。Claude に「このスプシを取り込んで」と頼むと MCP 経由で登録されます。
        </p>
      ) : (
        <ul className="card-list">
          {videos.map((v) => (
            <li key={v.id}>
              <Link to={`/videos/${v.id}`}>
                <span className={`badge kind-${v.kind}`}>{KIND_LABEL[v.kind]}</span> {v.title}
              </Link>
              {v.part_count != null && <span className="muted"> — {v.part_count} パート</span>}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
