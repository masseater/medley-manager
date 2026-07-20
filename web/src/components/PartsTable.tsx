import { Link } from "react-router-dom";
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
    <table className="table">
      <thead>
        <tr>
          <th className="num">No.</th>
          {hasTimestamps && <th>時間</th>}
          <th>曲 / 引用元</th>
          {hasBpm && <th>BPM</th>}
          {hasBars && <th className="num">小節</th>}
          {hasAudio && <th>音声</th>}
          {hasVideoStaff && <th>映像</th>}
          {hasNote && <th>備考</th>}
          <th>コメント</th>
        </tr>
      </thead>
      <tbody>
        {parts.map((p) => (
          <tr key={p.id}>
            <td className="num">{p.position}</td>
            {hasTimestamps && (
              <td>
                {p.start_sec != null && (
                  <a href={watchUrl(video, p.start_sec) ?? undefined} target="_blank" rel="noreferrer">
                    {fmtTime(p.start_sec)}
                  </a>
                )}
              </td>
            )}
            <td>
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
            </td>
            {hasBpm && <td>{p.bpm ?? ""}</td>}
            {hasBars && <td className="num">{p.bars ?? ""}</td>}
            {hasAudio && <td>{staffOf(p, "audio")}</td>}
            {hasVideoStaff && <td>{staffOf(p, "video")}</td>}
            {hasNote && <td className="muted small">{p.note ?? ""}</td>}
            <td className="comment-cell">
              <CommentEditor
                compact
                value={p.comment}
                onSave={async (text) => {
                  await saveComment("parts", p.id, text);
                  onChanged();
                }}
              />
            </td>
          </tr>
        ))}
      </tbody>
    </table>
  );
}
