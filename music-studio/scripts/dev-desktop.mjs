import { spawn } from "node:child_process";
import electronPath from "electron";
import { createServer } from "vite";

const server = await createServer({
  configFile: new URL("../vite.config.ts", import.meta.url).pathname,
});

await server.listen();
const url = server.resolvedUrls?.local[0];

if (!url) {
  await server.close();
  throw new Error("Vite did not expose a local development URL.");
}

const electron = spawn(electronPath, ["."], {
  cwd: new URL("..", import.meta.url).pathname,
  env: { ...process.env, MUSIC_STUDIO_DEV_URL: url },
  stdio: "inherit",
});

const close = async (exitCode = 0) => {
  await server.close();
  process.exit(exitCode);
};

electron.on("exit", (code) => void close(code ?? 0));
process.on("SIGINT", () => electron.kill("SIGINT"));
process.on("SIGTERM", () => electron.kill("SIGTERM"));
