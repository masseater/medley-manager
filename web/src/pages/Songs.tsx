import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { api, Song } from "../api";

export default function Songs() {
  const [songs, setSongs] = useState<Song[]>([]);
  const [q, setQ] = useState("");

  useEffect(() => {
    api<Song[]>(`/songs?q=${encodeURIComponent(q)}`).then(setSongs).catch(console.error);
  }, [q]);

  return (
    <div>
      <h1>曲一覧</h1>
      <div className="filter-row">
        <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="曲名・別表記・アーティストで絞り込み" />
      </div>
      <table className="table">
        <thead>
          <tr>
            <th>曲名</th>
            <th>アーティスト</th>
            <th>ジャンル</th>
            <th className="num">使用動画数</th>
          </tr>
        </thead>
        <tbody>
          {songs.map((s) => (
            <tr key={s.id}>
              <td>
                <Link to={`/songs/${s.id}`}>{s.title}</Link>
                {s.aliases.length > 0 && <span className="muted small">（{s.aliases.join(" / ")}）</span>}
              </td>
              <td>{s.artist ?? ""}</td>
              <td>{s.genre ?? ""}</td>
              <td className="num">{s.use_count}</td>
            </tr>
          ))}
        </tbody>
      </table>
      {songs.length === 0 && <p className="muted">該当する曲がありません。</p>}
    </div>
  );
}
