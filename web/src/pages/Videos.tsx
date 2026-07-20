import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { Base, Heading, Input, Select, Table, Td, Th } from "smarthr-ui";
import { api, KIND_LABEL, Video } from "../api";
import KindLabel from "../components/KindLabel";

const KIND_OPTIONS = [
  { label: "すべての種別", value: "" },
  ...(["medley", "collab", "single", "other"] as const).map((k) => ({ label: KIND_LABEL[k], value: k })),
];

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
      <Heading type="screenTitle" tag="h1" className="page-title">
        動画一覧
      </Heading>
      <div className="filter-row">
        <Input
          name="filter"
          value={q}
          onChange={(e) => setQ(e.target.value)}
          placeholder="タイトル・ID・投稿者で絞り込み"
          width="20em"
        />
        <Select name="kind" options={KIND_OPTIONS} value={kind} onChange={(e) => setKind(e.target.value)} />
      </div>
      <Base padding={1} className="table-base">
        <div className="table-wrap">
          <Table>
            <thead>
              <tr>
                <Th>種別</Th>
                <Th>タイトル</Th>
                <Th>投稿者</Th>
                <Th>パート数</Th>
              </tr>
            </thead>
            <tbody>
              {videos.map((v) => (
                <tr key={v.id}>
                  <Td>
                    <KindLabel kind={v.kind} />
                  </Td>
                  <Td>
                    <Link to={`/videos/${v.id}`}>{v.title}</Link>
                    {v.video_id && <span className="muted small"> {v.video_id}</span>}
                  </Td>
                  <Td>{v.uploader ?? ""}</Td>
                  <Td className="num">{v.part_count}</Td>
                </tr>
              ))}
            </tbody>
          </Table>
        </div>
        {videos.length === 0 && <p className="muted">該当する動画がありません。</p>}
      </Base>
    </div>
  );
}
