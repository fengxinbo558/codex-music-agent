import { spawn } from "node:child_process";
import { existsSync } from "node:fs";
import path from "node:path";

const ACE_STEP_URL = "http://127.0.0.1:8001/health";

export async function startAceStepRuntime(studioDirectory) {
  const lmModel = process.env.ACESTEP_LM_MODEL_PATH || "acestep-5Hz-lm-1.7B";
  const existingHealth = await getHealth();
  if (existingHealth.healthy) {
    if (!existingHealth.modelsInitialized) void warmAceStepRuntime(lmModel);
    return null;
  }

  const runtimeDirectory = path.resolve(
    studioDirectory,
    "../local-models/ACE-Step-1.5",
  );
  if (!existsSync(runtimeDirectory)) return null;
  const localPython = path.join(runtimeDirectory, ".venv/bin/python");
  const command = existsSync(localPython) ? localPython : resolveUvPath();
  const commandPrefix = existsSync(localPython) ? [] : ["run", "python"];

  const processHandle = spawn(
    command,
    [
      ...commandPrefix,
      "-m",
      "acestep.api_server",
      "--host",
      "127.0.0.1",
      "--port",
      "8001",
      "--download-source",
      process.env.ACESTEP_DOWNLOAD_SOURCE || "modelscope",
      "--init-llm",
      "--lm-model-path",
      lmModel,
    ],
    {
      cwd: runtimeDirectory,
      env: {
        ...process.env,
        ACESTEP_DEVICE: "mps",
        ACESTEP_INIT_LLM: "true",
        ACESTEP_LM_BACKEND: "mlx",
        ACESTEP_NO_INIT: "true",
        TOKENIZERS_PARALLELISM: "false",
      },
      stdio: "inherit",
    },
  );

  processHandle.on("error", (error) => {
    console.error("ACE-Step runtime failed to start:", error.message);
  });
  void waitForHealth().then((healthy) => {
    if (healthy) return warmAceStepRuntime(lmModel);
  });
  return processHandle;
}

export function stopAceStepRuntime(processHandle) {
  if (processHandle && !processHandle.killed) processHandle.kill("SIGTERM");
}

async function getHealth() {
  try {
    const response = await fetch(ACE_STEP_URL, {
      signal: AbortSignal.timeout(1_200),
    });
    if (!response.ok) return { healthy: false, modelsInitialized: false };
    const payload = await response.json();
    return {
      healthy: payload?.data?.status === "ok",
      modelsInitialized: Boolean(payload?.data?.models_initialized),
    };
  } catch {
    return { healthy: false, modelsInitialized: false };
  }
}

async function waitForHealth() {
  for (let attempt = 0; attempt < 60; attempt += 1) {
    if ((await getHealth()).healthy) return true;
    await new Promise((resolve) => setTimeout(resolve, 1_000));
  }
  return false;
}

async function warmAceStepRuntime(lmModel) {
  try {
    await fetch("http://127.0.0.1:8001/v1/init", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        model: "acestep-v15-turbo",
        slot: 1,
        init_llm: true,
        lm_model_path: lmModel,
      }),
    });
  } catch (error) {
    console.error("ACE-Step warm-up failed:", error.message);
  }
}

function resolveUvPath() {
  const candidates = [
    process.env.UV_PATH,
    process.env.HOME && path.join(process.env.HOME, ".local/bin/uv"),
    process.env.HOME && path.join(process.env.HOME, ".cargo/bin/uv"),
  ].filter(Boolean);
  return candidates.find((candidate) => existsSync(candidate)) || "uv";
}
