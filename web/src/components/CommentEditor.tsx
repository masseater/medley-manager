import { useState } from "react";
import { Button, Cluster, Textarea } from "smarthr-ui";

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
        <Textarea
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
          rows={compact ? 2 : 3}
          autoFocus
        />
        <Cluster gap={0.5}>
          <Button variant="primary" size="s" onClick={save} disabled={saving}>
            保存
          </Button>
          <Button variant="secondary" size="s" onClick={() => setEditing(false)} disabled={saving}>
            キャンセル
          </Button>
        </Cluster>
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
    <Button variant="text" size="s" onClick={start}>
      {compact ? "💬+" : "💬 コメントを追加"}
    </Button>
  );
}
