import { useState } from "react";

/** ユーザーメモ用コメントの表示 + インライン編集 */
export default function CommentEditor({
  value,
  onSave,
  compact = false,
}: {
  value: string | null;
  onSave: (text: string) => Promise<void>;
  compact?: boolean;
}) {
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState("");
  const [saving, setSaving] = useState(false);

  const start = () => {
    setDraft(value ?? "");
    setEditing(true);
  };

  const save = async () => {
    setSaving(true);
    try {
      await onSave(draft);
      setEditing(false);
    } catch (e) {
      alert(`保存に失敗しました: ${e}`);
    } finally {
      setSaving(false);
    }
  };

  if (editing) {
    return (
      <span className="comment-editor">
        <textarea
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
          rows={compact ? 2 : 3}
          autoFocus
        />
        <span className="comment-actions">
          <button onClick={save} disabled={saving}>
            保存
          </button>
          <button className="ghost" onClick={() => setEditing(false)} disabled={saving}>
            キャンセル
          </button>
        </span>
      </span>
    );
  }

  if (value) {
    return (
      <span className="comment-view" onClick={start} title="クリックで編集">
        💬 {value}
      </span>
    );
  }
  return (
    <button className="ghost comment-add" onClick={start}>
      {compact ? "💬+" : "💬 コメントを追加"}
    </button>
  );
}
