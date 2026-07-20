import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { Base, Heading, Input, Table, Td, Th } from "smarthr-ui";
import { api, Song } from "../api";

export default function Songs() {
  const [songs, setSongs] = useState<Song[]>([]);
  const [q, setQ] = useState("");

  useEffect(() => {
    api<Song[]>(`/songs?q=${encodeURIComponent(q)}`).then(setSongs).catch(console.error);
  }, [q]);

  return (
    <div>
      <Heading type="screenTitle" tag="h1" className="page-title">
        曲一覧
      </Heading>
      <div className="filter-row">
        <Input
          name="filter"
          value={q}
          onChange={(e) => setQ(e.target.value)}
          placeholder="曲名・別表記・アーティストで絞り込み"
          width="20em"
        />
      </div>
      <Base padding={1} className="table-base">
        <div className="table-wrap">
          <Table>
            <thead>
              <tr>
                <Th>曲名</Th>
                <Th>出典・アーティスト</Th>
                <Th>使用動画数</Th>
              </tr>
            </thead>
            <tbody>
              {songs.map((s) => (
                <tr key={s.id}>
                  <Td>
                    <Link to={`/songs/${s.id}`}>{s.title}</Link>
                    {s.aliases.length > 0 && <span className="muted small">（{s.aliases.join(" / ")}）</span>}
                  </Td>
                  <Td className="muted small">{s.artist ?? s.note ?? ""}</Td>
                  <Td className="num">{s.use_count}</Td>
                </tr>
              ))}
            </tbody>
          </Table>
        </div>
        {songs.length === 0 && <p className="muted">該当する曲がありません。</p>}
      </Base>
    </div>
  );
}
