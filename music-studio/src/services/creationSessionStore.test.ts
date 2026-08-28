import "fake-indexeddb/auto";

import { afterEach, describe, expect, it } from "vitest";

import { createCreationSession, transitionCreationSession } from "./creationSession";
import { CreationSessionStore } from "./creationSessionStore";

const stores: CreationSessionStore[] = [];

afterEach(() => {
  stores.forEach((store) => store.close());
  stores.length = 0;
});

describe("CreationSessionStore", () => {
  it("restores an awaiting-confirmation session after reopening", async () => {
    const databaseName = `creation-sessions-${crypto.randomUUID()}`;
    const first = new CreationSessionStore(databaseName, indexedDB);
    stores.push(first);
    let session = createCreationSession({
      id: "session-a",
      projectId: "project-a",
      at: "2026-08-29T00:00:00.000Z",
    });
    session = transitionCreationSession(session, {
      type: "SUBMIT_IDEA",
      idea: "夜晚的中文 R&B",
      at: "2026-08-29T00:01:00.000Z",
    });
    session = transitionCreationSession(session, {
      type: "TASK_SUCCEEDED",
      stage: "direction",
      summary: "三套方向已准备",
      at: "2026-08-29T00:02:00.000Z",
    });
    await first.save(session);
    first.close();

    const reopened = new CreationSessionStore(databaseName, indexedDB);
    stores.push(reopened);
    const restored = await reopened.getLatest("project-a");
    expect(restored?.currentStage).toBe("direction");
    expect(restored?.stages.direction.status).toBe("AWAITING_CONFIRMATION");
    expect(restored?.idea).toBe("夜晚的中文 R&B");
  });
});
