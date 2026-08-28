import type { AgentPlanResponse, PlanMusicRequest } from "../types";
import { createFallbackPlan } from "./fallbackPlanner";

const AGENT_TIMEOUT_MS = 3 * 60 * 1_000;

export async function planMusic(
  request: PlanMusicRequest,
): Promise<AgentPlanResponse> {
  if (!window.musicAgent) {
    await wait(700);
    return createFallbackPlan(request);
  }

  try {
    return await withTimeout(
      window.musicAgent.planMusic(request),
      AGENT_TIMEOUT_MS,
      "音乐制作助理规划时间较长，本次已切换到本机音乐规划器。",
    );
  } catch (error) {
    const fallback = createFallbackPlan(request);
    const message =
      error instanceof Error ? error.message : "音乐制作助理暂时不可用";
    return {
      ...fallback,
      warning: message.startsWith("音乐制作助理")
        ? message
        : `音乐制作助理连接失败：${message}`,
    };
  }
}

async function withTimeout<T>(
  operation: Promise<T>,
  milliseconds: number,
  message: string,
) {
  let timeout: number | undefined;
  try {
    return await Promise.race([
      operation,
      new Promise<T>((_resolve, reject) => {
        timeout = window.setTimeout(() => reject(new Error(message)), milliseconds);
      }),
    ]);
  } finally {
    if (timeout !== undefined) window.clearTimeout(timeout);
  }
}

function wait(milliseconds: number) {
  return new Promise((resolve) => window.setTimeout(resolve, milliseconds));
}
