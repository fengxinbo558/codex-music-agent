import type {
  ApprovedAssetSnapshot,
  CreationSession,
  CreationSessionEvent,
  CreationStage,
  CreationStageState,
} from "../types";

const STAGES: CreationStage[] = [
  "idea",
  "direction",
  "lyrics-vocal",
  "sample",
  "full-song",
  "editing",
  "delivered",
];

export class InvalidCreationTransitionError extends Error {}

export function createCreationSession(input: {
  id: string;
  projectId: string;
  at?: string;
}): CreationSession {
  const at = input.at ?? new Date().toISOString();
  return {
    id: input.id,
    projectId: input.projectId,
    currentStage: "idea",
    idea: "",
    createdAt: at,
    updatedAt: at,
    stages: Object.fromEntries(
      STAGES.map((stage) => [
        stage,
        { stage, status: "DRAFT", revision: 1 } satisfies CreationStageState,
      ]),
    ) as CreationSession["stages"],
    stageDrafts: {},
    approvedSnapshots: [],
    revisionFeedback: [],
  };
}

export function transitionCreationSession(
  session: CreationSession,
  event: CreationSessionEvent,
): CreationSession {
  const at = event.at ?? new Date().toISOString();
  switch (event.type) {
    case "SUBMIT_IDEA": {
      requireStage(session, "idea", ["DRAFT", "REVISING", "FAILED"]);
      const idea = event.idea.trim();
      if (!idea) throw new InvalidCreationTransitionError("创意不能为空。");
      return {
        ...session,
        idea,
        currentStage: "direction",
        updatedAt: at,
        stages: {
          ...session.stages,
          idea: {
            ...session.stages.idea,
            status: "APPROVED",
            summary: idea,
            error: undefined,
          },
          direction: {
            ...session.stages.direction,
            status: "DRAFT",
            error: undefined,
          },
        },
      };
    }
    case "TASK_SUCCEEDED": {
      requireCurrentStage(session, event.stage);
      requireStatus(session, event.stage, ["DRAFT", "REVISING", "FAILED"]);
      const waitsForHuman = ["direction", "lyrics-vocal", "sample"].includes(
        event.stage,
      );
      const nextStage =
        event.stage === "full-song"
          ? "editing"
          : event.stage === "editing"
            ? "delivered"
            : session.currentStage;
      return {
        ...session,
        currentStage: nextStage,
        updatedAt: at,
        stages: {
          ...session.stages,
          [event.stage]: {
            ...session.stages[event.stage],
            status: waitsForHuman ? "AWAITING_CONFIRMATION" : "APPROVED",
            summary: event.summary,
            error: undefined,
          },
          ...(event.stage === "full-song"
            ? {
                editing: {
                  ...session.stages.editing,
                  status: "DRAFT" as const,
                },
              }
            : {}),
          ...(event.stage === "editing"
            ? {
                delivered: {
                  ...session.stages.delivered,
                  status: "AWAITING_CONFIRMATION" as const,
                },
              }
            : {}),
        },
        stageDrafts: {
          ...session.stageDrafts,
          [event.stage]: structuredClone(event.payload ?? {}),
        },
      };
    }
    case "TASK_FAILED": {
      requireCurrentStage(session, event.stage);
      return {
        ...session,
        updatedAt: at,
        stages: {
          ...session.stages,
          [event.stage]: {
            ...session.stages[event.stage],
            status: "FAILED",
            error: event.error,
          },
        },
      };
    }
    case "APPROVE_DIRECTION":
      return approveStage(
        session,
        "direction",
        "lyrics-vocal",
        event.summary,
        event.payload,
        at,
      );
    case "APPROVE_LYRICS":
      return approveStage(
        session,
        "lyrics-vocal",
        "sample",
        event.summary,
        event.payload,
        at,
      );
    case "APPROVE_SAMPLE":
      return approveStage(
        session,
        "sample",
        "full-song",
        event.summary,
        event.payload,
        at,
      );
    case "REQUEST_REVISION": {
      if (STAGES.indexOf(event.stage) > STAGES.indexOf(session.currentStage)) {
        throw new InvalidCreationTransitionError("不能跳到尚未完成的后续阶段。");
      }
      requireStatus(session, event.stage, ["AWAITING_CONFIRMATION", "APPROVED"]);
      const revisedIndex = STAGES.indexOf(event.stage);
      const resetStages = Object.fromEntries(
        STAGES.map((stage, index) => [
          stage,
          index > revisedIndex
            ? {
                ...session.stages[stage],
                status: "DRAFT" as const,
                error: undefined,
              }
            : session.stages[stage],
        ]),
      ) as CreationSession["stages"];
      return {
        ...session,
        currentStage: event.stage,
        updatedAt: at,
        stages: {
          ...resetStages,
          [event.stage]: {
            ...resetStages[event.stage],
            status: "REVISING",
            revision: session.stages[event.stage].revision + 1,
            error: undefined,
          },
        },
        revisionFeedback: [
          ...session.revisionFeedback,
          {
            id: `${session.id}-${event.stage}-feedback-${session.revisionFeedback.length + 1}`,
            stage: event.stage,
            createdAt: at,
            message: event.message.trim(),
          },
        ],
      };
    }
    case "APPROVE_DELIVERY": {
      requireStage(session, "delivered", ["AWAITING_CONFIRMATION"]);
      const snapshot = createSnapshot(
        session,
        "delivered",
        event.summary,
        event.payload,
        at,
      );
      return {
        ...session,
        updatedAt: at,
        stages: {
          ...session.stages,
          delivered: {
            ...session.stages.delivered,
            status: "APPROVED",
            summary: event.summary,
          },
        },
        approvedSnapshots: [...session.approvedSnapshots, snapshot],
      };
    }
  }
}

export function canStartMusicGeneration(session: CreationSession) {
  return (
    session.stages.direction.status === "APPROVED" &&
    session.stages["lyrics-vocal"].status === "APPROVED" &&
    ["sample", "full-song", "editing", "delivered"].includes(
      session.currentStage,
    )
  );
}

export function updateCreationStageDraft(
  session: CreationSession,
  stage: CreationStage,
  payload: Record<string, unknown>,
): CreationSession {
  return {
    ...session,
    updatedAt: new Date().toISOString(),
    stageDrafts: {
      ...session.stageDrafts,
      [stage]: structuredClone(payload),
    },
  };
}

function approveStage(
  session: CreationSession,
  stage: CreationStage,
  nextStage: CreationStage,
  summary: string,
  payload: Record<string, unknown>,
  at: string,
) {
  requireCurrentStage(session, stage);
  requireStatus(session, stage, ["AWAITING_CONFIRMATION"]);
  const snapshot = createSnapshot(session, stage, summary, payload, at);
  return {
    ...session,
    currentStage: nextStage,
    updatedAt: at,
    stages: {
      ...session.stages,
      [stage]: {
        ...session.stages[stage],
        status: "APPROVED" as const,
        summary,
        error: undefined,
      },
      [nextStage]: {
        ...session.stages[nextStage],
        status: "DRAFT" as const,
        error: undefined,
      },
    },
    approvedSnapshots: [...session.approvedSnapshots, snapshot],
  } satisfies CreationSession;
}

function createSnapshot(
  session: CreationSession,
  stage: CreationStage,
  summary: string,
  payload: Record<string, unknown>,
  approvedAt: string,
): ApprovedAssetSnapshot {
  return {
    id: `${session.id}-${stage}-r${session.stages[stage].revision}`,
    stage,
    revision: session.stages[stage].revision,
    approvedAt,
    summary,
    payload: structuredClone(payload),
  };
}

function requireCurrentStage(session: CreationSession, stage: CreationStage) {
  if (session.currentStage !== stage) {
    throw new InvalidCreationTransitionError(
      `当前处于 ${session.currentStage}，不能处理 ${stage}。`,
    );
  }
}

function requireStage(
  session: CreationSession,
  stage: CreationStage,
  allowed: CreationStageState["status"][],
) {
  requireCurrentStage(session, stage);
  requireStatus(session, stage, allowed);
}

function requireStatus(
  session: CreationSession,
  stage: CreationStage,
  allowed: CreationStageState["status"][],
) {
  if (!allowed.includes(session.stages[stage].status)) {
    throw new InvalidCreationTransitionError(
      `${stage} 当前状态为 ${session.stages[stage].status}，不能执行这个操作。`,
    );
  }
}
