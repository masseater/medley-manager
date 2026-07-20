import { useEffect, useState } from "react";
import { Link, useParams } from "react-router-dom";
import { Base, Heading, Table, Td, Th } from "smarthr-ui";
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
      <Heading type="screenTitle" tag="h1" className="page-title">
        {person.name}
      </Heading>
      {person.aliases.length > 0 && <p className="muted">別名義: {person.aliases.join(" / ")}</p>}

      <Heading type="sectionTitle" tag="h2" className="section-title">
        担当パート（{person.works.length}）
      </Heading>
      <Base padding={1} className="table-base">
        <div className="table-wrap">
          <Table>
            <thead>
              <tr>
                <Th>動画</Th>
                <Th>No.</Th>
                <Th>曲</Th>
                <Th>役割</Th>
              </tr>
            </thead>
            <tbody>
              {person.works.map((w, i) => (
                <tr key={i}>
                  <Td>
                    <Link to={`/videos/${w.video_id_pk}`}>{w.video_title}</Link>
                  </Td>
                  <Td className="num">{w.position}</Td>
                  <Td>{w.song_id ? <Link to={`/songs/${w.song_id}`}>{w.song_title}</Link> : (w.label ?? "")}</Td>
                  <Td>{ROLE_LABEL[w.role] ?? w.role}</Td>
                </tr>
              ))}
            </tbody>
          </Table>
        </div>
      </Base>
    </div>
  );
}
