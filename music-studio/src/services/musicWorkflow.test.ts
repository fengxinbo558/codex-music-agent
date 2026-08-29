import { describe, expect, it } from "vitest";

import {
  activateWorkflowStep,
  completeWorkflowStep,
  evaluateDeliveryGate,
  startWorkflow,
} from "./musicWorkflow";

describe("music workflow", () => {
  it("keeps one truthful active handoff at a time", () => {
    const started = startWorkflow("run-1");
    const directed = completeWorkflowStep(
      started,
      "director",
      "Indie Pop · 88 BPM",
    );
    const arranging = activateWorkflowStep(directed, "arrangement");

    expect(arranging.steps.find((step) => step.id === "director")?.status).toBe(
      "complete",
    );
    expect(
      arranging.steps
        .filter((step) => step.status === "active")
        .map((step) => step.id),
    ).toEqual(["arrangement"]);
  });

  it("does not mark a vocal song ready without saved audio and lyric timing", () => {
    const incomplete = evaluateDeliveryGate({
      versionId: "v1",
      audioAssetId: "a1",
      audioSaved: false,
      duration: 60,
      hasVocals: true,
      lyrics: ["第一句"],
      lyricCues: [],
    });
    const ready = evaluateDeliveryGate({
      versionId: "v1",
      audioAssetId: "a1",
      audioSaved: true,
      duration: 60,
      hasVocals: true,
      lyrics: ["第一句"],
      lyricCues: [
        { id: "l1", text: "第一句", start: 2, end: 8, source: "aligned" },
      ],
      lyricLogicPassed: true,
      lyricAudit: {
        status: "passed",
        transcription: "第一句",
        quality: {
          status: "passed",
          overallMatch: 1,
          lineCoverage: 1,
          keyTermMatch: 1,
          averageConfidence: 0.9,
          vocalCoverage: 0.8,
          matchedKeyTerms: [],
          warnings: [],
        },
      },
    });

    expect(incomplete.ready).toBe(false);
    expect(ready.ready).toBe(true);
  });

  it("never delivers a vocal song with estimated subtitle timing", () => {
    const result = evaluateDeliveryGate({
      versionId: "v2",
      audioAssetId: "a2",
      audioSaved: true,
      duration: 60,
      hasVocals: true,
      lyrics: ["巴黎今晚必须发力"],
      lyricCues: [
        { id: "l1", text: "巴黎今晚必须发力", start: 2, end: 8, source: "estimated" },
      ],
      lyricLogicPassed: true,
      lyricAudit: {
        status: "passed",
        transcription: "巴黎今晚必须发力",
        quality: {
          status: "passed",
          overallMatch: 1,
          lineCoverage: 1,
          keyTermMatch: 1,
          averageConfidence: 0.9,
          vocalCoverage: 0.8,
          matchedKeyTerms: [],
          warnings: [],
        },
      },
    });
    expect(result.ready).toBe(false);
  });
});
