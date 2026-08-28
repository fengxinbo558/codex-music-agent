export async function analyzeAudioBlob(blob: Blob) {
  if (!blob.type.startsWith("audio/")) {
    throw new Error("请选择 WAV、MP3、M4A 等音频文件。");
  }
  const AudioContextConstructor = window.AudioContext;
  if (!AudioContextConstructor) {
    throw new Error("当前环境不能读取音频内容，文件没有被保存。");
  }
  const context = new AudioContextConstructor();
  try {
    const buffer = await context.decodeAudioData(await blob.arrayBuffer());
    if (!Number.isFinite(buffer.duration) || buffer.duration <= 0) {
      throw new Error("音频没有可播放的时长。");
    }
    return {
      duration: buffer.duration,
      waveform: createWaveform(buffer.getChannelData(0)),
    };
  } catch (error) {
    if (error instanceof Error && error.message.startsWith("音频")) throw error;
    throw new Error("这个音频无法解码，请换成 WAV、MP3 或 M4A 后重试。");
  } finally {
    await context.close();
  }
}

export function createWaveform(samples: Float32Array, bucketCount = 64) {
  if (!samples.length || bucketCount <= 0) return [];
  const length = Math.min(bucketCount, samples.length);
  const bucketSize = samples.length / length;
  const waveform = Array.from({ length }, (_, bucket) => {
    const start = Math.floor(bucket * bucketSize);
    const end = Math.max(start + 1, Math.floor((bucket + 1) * bucketSize));
    let peak = 0;
    for (let index = start; index < end && index < samples.length; index += 1) {
      peak = Math.max(peak, Math.abs(samples[index]));
    }
    return Number(peak.toFixed(3));
  });
  const maximum = Math.max(...waveform, 0.001);
  return waveform.map((value) => Number((value / maximum).toFixed(3)));
}
