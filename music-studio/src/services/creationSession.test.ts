import { describe, expect, it } from "vitest";

import {
  canStartMusicGeneration,
  createCreationSession,
  InvalidCreationTransitionError,
  transitionCreationSession,
} from "./creationSession";

function sessionAtDirection() {
  let session = createCreationSession({
    id: "session-1",
    projectId: "project-1",
    at: "2026-08-29T00:00:00.000Z",
  });
  session = transitionCreationSession(session, {
    type: "SUBMIT_IDEA",
    idea: "写一首副歌爆发的中文摇滚",
    at: "2026-08-29T00:01:00.000Z",
  });
  return transitionCreationSession(session, {
    type: "TASK_SUCCEEDED",
    stage: "direction",
    summary: "三套方向已准备",
    at: "2026-08-29T00:02:00.000Z",
  });
}

describe("creation session", () => {
  it("requires every human confirmation before music generation", () => {
    let session = sessionAtDirection();
    expect(canStartMusicGeneration(session)).toBe(false);

    session = transitionCreationSession(session, {
      type: "APPROVE_DIRECTION",
      summary: "采用推荐方向",
      payload: { directionId: "recommended" },
    });
    session = transitionCreationSession(session, {
      type: "TASK_SUCCEEDED",
      stage: "lyrics-vocal",
      summary: "歌词与唱法已准备",
    });
    expect(canStartMusicGeneration(session)).toBe(false);

    session = transitionCreationSession(session, {
      type: "APPROVE_LYRICS",
      summary: "确认 8 句歌词",
      payload: { lyrics: ["第一句"] },
    });
    expect(canStartMusicGeneration(session)).toBe(true);
  });

  it("rejects illegal stage jumps", () => {
    const session = sessionAtDirection();
    expect(() =>
      transitionCreationSession(session, {
        type: "APPROVE_LYRICS",
        summary: "试图越过方向",
        payload: {},
      }),
    ).toThrow(InvalidCreationTransitionError);
  });

  it("keeps approved snapshots immutable while revising later stages", () => {
    let session = sessionAtDirection();
    const directionPayload = { directionId: "recommended", bpm: 108 };
    session = transitionCreationSession(session, {
      type: "APPROVE_DIRECTION",
      summary: "采用推荐方向",
      payload: directionPayload,
      at: "2026-08-29T00:03:00.000Z",
    });
    directionPayload.bpm = 160;
    session = transitionCreationSession(session, {
      type: "TASK_SUCCEEDED",
      stage: "lyrics-vocal",
      summary: "歌词初稿",
    });
    session = transitionCreationSession(session, {
      type: "REQUEST_REVISION",
      stage: "lyrics-vocal",
      message: "第二句更有力量",
      at: "2026-08-29T00:04:00.000Z",
    });

    expect(session.approvedSnapshots[0].payload).toEqual({
      directionId: "recommended",
      bpm: 108,
    });
    expect(session.stages.direction.status).toBe("APPROVED");
    expect(session.stages["lyrics-vocal"].status).toBe("REVISING");
    expect(session.revisionFeedback[0].message).toBe("第二句更有力量");
  });
});
