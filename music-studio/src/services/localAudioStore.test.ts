import "fake-indexeddb/auto";

import { afterEach, describe, expect, it } from "vitest";

import { createAudioAsset } from "./audioAssets";
import { LocalAudioStore } from "./localAudioStore";

const stores: LocalAudioStore[] = [];

afterEach(() => {
  stores.forEach((store) => store.close());
  stores.length = 0;
});

describe("LocalAudioStore", () => {
  it("persists metadata and the real Blob across store instances", async () => {
    const databaseName = `audio-library-${crypto.randomUUID()}`;
    const firstStore = new LocalAudioStore(databaseName, indexedDB);
    stores.push(firstStore);
    const blob = new Blob(["real-wave-data"], { type: "audio/wav" });
    const asset = createAudioAsset({
      id: "asset-a",
      name: "真实导入.wav",
      type: "reference",
      blob,
      durationSeconds: 12,
      waveform: [0.1, 0.6],
      origin: "本机导入",
    });

    await firstStore.save(asset, blob);
    firstStore.close();

    const reopenedStore = new LocalAudioStore(databaseName, indexedDB);
    stores.push(reopenedStore);
    expect(await reopenedStore.listAssets()).toEqual([asset]);
    const restoredBlob = await reopenedStore.getBlob(asset);
    expect(await restoredBlob?.text()).toBe("real-wave-data");
    expect(restoredBlob?.type).toBe("audio/wav");
  });

  it("updates favorites without losing the audio Blob", async () => {
    const store = new LocalAudioStore(
      `audio-library-${crypto.randomUUID()}`,
      indexedDB,
    );
    stores.push(store);
    const blob = new Blob(["audio"], { type: "audio/wav" });
    const asset = createAudioAsset({
      id: "asset-b",
      name: "素材.wav",
      type: "recording",
      blob,
      durationSeconds: 5,
      waveform: [0.4],
      origin: "本机导入",
    });
    await store.save(asset, blob);
    await store.putAsset({ ...asset, favorite: true });

    expect((await store.listAssets())[0].favorite).toBe(true);
    expect(await (await store.getBlob(asset))?.text()).toBe("audio");
  });
});
