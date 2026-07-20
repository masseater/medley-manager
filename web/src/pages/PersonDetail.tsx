import { useEffect, useState } from "react";
import { Link, useParams } from "react-router-dom";
import { api, PersonDetail as PD } from "../api";

const ROLE_LABEL: Record<string, string> = { audio: "音声", video: "映像", other: "その他" };

export default function PersonDetail() {
  const { id } = useParams();
  const [person, setPerson] = useState<PD | null>(null);
  const [error, setError] = useState("");

  useEffect(() => {
    api<PD>(`/people/${id}`).then(setPerson).catch((e) => setError(String(e)));
  }, [id]);

  if (error) return <p className="muted">担当者が見つかりません。</p>;
  if (!person) return null;

  return (
    <div>
      <p className="breadcrumb">
        <Link to="/people">担当者一覧</Link>
      </p>
      <h1>{person.name}</h1>
      {person.aliases.length > 0 && <p className="muted">別名義: {person.aliases.join(" / ")}</p>}

      <h2>担当パート（{person.works.length}）</h2>
      <table className="table">
        <thead>
          <tr>
            <th>動画</th>
            <th className="num">No.</th>
            <th>曲</th>
            <th>役割</th>
          </tr>
        </thead>
        <tbody>
          {person.works.map((w, i) => (
            <tr key={i}>
              <td>
                <Link to={`/videos/${w.video_id_pk}`}>{w.video_title}</Link>
              </td>
              <td className="num">{w.position}</td>
              <td>
                {w.song_id ? <Link to={`/songs/${w.song_id}`}>{w.song_title}</Link> : (w.label ?? "")}
              </td>
              <td>{ROLE_LABEL[w.role] ?? w.role}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
