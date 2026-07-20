import { Link } from "react-router-dom";
import { Table, Td, Th } from "smarthr-ui";
import { fmtTime, Part, saveComment, watchUrl } from "../api";
import CommentEditor from "./CommentEditor";

/** パート表。BPM・小節・担当・時間などは、データがある列だけ表示する */
export default function PartsTable({
  video,
  parts,
  onChanged,
}: {
  video: { video_id: string | null; url: string | null };
  parts: Part[];
  onChanged: () => void;
}) {
  const hasTimestamps = parts.some((p) => p.start_sec != null);
  const hasBpm = parts.some((p) => p.bpm);
  const hasBars = parts.some((p) => p.bars);
  const hasAudio = parts.some((p) => p.staff.some((s) => s.role === "audio"));
  const hasVideoStaff = parts.some((p) => p.staff.some((s) => s.role === "video"));
  const hasNote = parts.some((p) => p.note);

  const staffOf = (p: Part, role: string) =>
    p.staff
      .filter((s) => s.role === role)
      .map((s, i) => (
        <span key={s.person_id}>
          {i > 0 && ", "}
          <Link to={`/people/${s.person_id}`}>{s.name}</Link>
        </span>
      ));

  return (
    <div className="table-wrap">
      <Table>
        <thead>
          <tr>
            <Th>No.</Th>
            {hasTimestamps && <Th>時間</Th>}
            <Th>曲 / 引用元</Th>
            {hasBpm && <Th>BPM</Th>}
            {hasBars && <Th>小節</Th>}
            {hasAudio && <Th>音声</Th>}
            {hasVideoStaff && <Th>映像</Th>}
            {hasNote && <Th>備考</Th>}
            <Th>コメント</Th>
          </tr>
        </thead>
        <tbody>
          {parts.map((p) => (
            <tr key={p.id}>
              <Td className="num">{p.position}</Td>
              {hasTimestamps && (
                <Td>
                  {p.start_sec != null && (
                    <a href={watchUrl(video, p.start_sec) ?? undefined} target="_blank" rel="noreferrer">
                      {fmtTime(p.start_sec)}
                    </a>
                  )}
                </Td>
              )}
              <Td>
                {p.song_id ? (
                  <Link to={`/songs/${p.song_id}`}>{p.song_title}</Link>
                ) : p.label ? (
                  <span>{p.label}</span>
                ) : null}
                {p.ref_video_id && (
                  <span className="muted small">
                    {" "}
                    ← <Link to={`/videos/${p.ref_video_id}`}>{p.ref_video_title}</Link>
                  </span>
                )}
                {p.song_id && p.label && p.label !== p.song_title && (
                  <span className="muted small">（表記: {p.label}）</span>
                )}
              </Td>
              {hasBpm && <Td>{p.bpm ?? ""}</Td>}
              {hasBars && <Td className="num">{p.bars ?? ""}</Td>}
              {hasAudio && <Td>{staffOf(p, "audio")}</Td>}
              {hasVideoStaff && <Td>{staffOf(p, "video")}</Td>}
              {hasNote && <Td className="muted small">{p.note ?? ""}</Td>}
              <Td className="comment-cell">
                <CommentEditor
                  compact
                  value={p.comment}
                  onSave={async (text) => {
                    await saveComment("parts", p.id, text);
                    onChanged();
                  }}
                />
              </Td>
            </tr>
          ))}
        </tbody>
      </Table>
    </div>
  );
}
