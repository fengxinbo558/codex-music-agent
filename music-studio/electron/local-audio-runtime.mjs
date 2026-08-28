import { spawn } from "node:child_process";
import { existsSync } from "node:fs";
import path from "node:path";

const HEALTH_URL = "http://127.0.0.1:8002/health";

export async function startLocalAudioRuntime(studioDirectory, dataDirectory) {
  if (await isHealthy()) return null;
  const serviceDirectory = path.join(studioDirectory, "local-audio-service");
  const python = path.join(serviceDirectory, ".venv/bin/python");
  if (!existsSync(python)) return null;

  const processHandle = spawn(
    python,
    [
      "-m",
      "uvicorn",
      "audio_service.app:app",
      "--host",
      "127.0.0.1",
      "--port",
      "8002",
    ],
    {
      cwd: serviceDirectory,
      env: {
        ...process.env,
        MUSIC_WORKROOM_AUDIO_DATA: dataDirectory,
        TOKENIZERS_PARALLELISM: "false",
      },
      stdio: "inherit",
    },
  );
  processHandle.on("error", (error) => {
    console.error("Local audio runtime failed to start:", error.message);
  });
  return processHandle;
}

export function stopLocalAudioRuntime(processHandle) {
  if (processHandle && !processHandle.killed) processHandle.kill("SIGTERM");
}

async function isHealthy() {
  try {
    const response = await fetch(HEALTH_URL, {
      signal: AbortSignal.timeout(1_200),
    });
    return response.ok;
  } catch {
    return false;
  }
}
