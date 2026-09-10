import { spawn } from "node:child_process";

const mode = process.argv[2] === "production" ? "production" : "development";
const args = mode === "production"
  ? ["dist/index.cjs"]
  : ["--import", "tsx", "server/index.ts"];
const child = spawn(process.execPath, args, {
  stdio: "inherit",
  env: { ...process.env, NODE_ENV: mode },
});
child.on("error", (error) => { console.error(error); process.exit(1); });
child.on("exit", (code) => process.exit(code ?? 1));
