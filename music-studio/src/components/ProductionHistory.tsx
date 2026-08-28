import type { CreationSession, CreationStage } from "../types";

const STAGE_LABELS: Record<CreationStage, string> = {
  idea: "原始创意",
  direction: "创作方向",
  "lyrics-vocal": "歌词与唱法",
  sample: "核心小样",
  "full-song": "完整歌曲",
  editing: "精修编辑",
  delivered: "交付确认",
};

export function ProductionHistory({ session }: { session: CreationSession }) {
  if (!session.approvedSnapshots.length) return null;
  return (
    <details className="production-history">
      <summary>
        <span>制作记录</span>
        <small>{session.approvedSnapshots.length} 项已确认</small>
      </summary>
      <ol>
        {session.approvedSnapshots.map((snapshot) => (
          <li key={snapshot.id}>
            <span>{STAGE_LABELS[snapshot.stage]}</span>
            <strong>{snapshot.summary}</strong>
            <small>第 {snapshot.revision} 版 · 已锁定</small>
          </li>
        ))}
      </ol>
    </details>
  );
}
