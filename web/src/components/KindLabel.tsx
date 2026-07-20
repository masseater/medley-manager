import { StatusLabel } from "smarthr-ui";
import { KIND_LABEL, Video } from "../api";

const TYPE: Record<Video["kind"], "blue" | "green" | "grey"> = {
  medley: "blue",
  collab: "green",
  single: "grey",
  other: "grey",
};

export default function KindLabel({ kind }: { kind: Video["kind"] }) {
  return (
    <span className="kind-label">
      <StatusLabel type={TYPE[kind]}>{KIND_LABEL[kind]}</StatusLabel>
    </span>
  );
}
