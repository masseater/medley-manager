import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { Base, Heading } from "smarthr-ui";
import { api, Stats, Video } from "../api";
import KindLabel from "../components/KindLabel";

export default function Home() {
  const [stats, setStats] = useState<Stats | null>(null);
  const [videos, setVideos] = useState<Video[]>([]);

  useEffect(() => {
    api<Stats>("/stats").then(setStats).catch(console.error);
    api<Video[]>("/videos").then((v) => setVideos(v.slice(0, 10))).catch(console.error);
  }, []);

  return (
    <div>
      <Heading type="screenTitle" tag="h1" className="page-title">
        ニコメド管理
      </Heading>
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
      <Heading type="sectionTitle" tag="h2" className="section-title">
        動画
      </Heading>
      {videos.length === 0 ? (
        <p className="muted">
          まだ何も登録されていません。Claude に「このスプシを取り込んで」と頼むと MCP 経由で登録されます。
        </p>
      ) : (
        <div className="card-list">
          {videos.map((v) => (
            <Base key={v.id} padding={0.75} className="card-item">
              <KindLabel kind={v.kind} />
              <Link to={`/videos/${v.id}`}>{v.title}</Link>
              {v.part_count != null && <span className="muted"> — {v.part_count} パート</span>}
            </Base>
          ))}
        </div>
      )}
    </div>
  );
}
