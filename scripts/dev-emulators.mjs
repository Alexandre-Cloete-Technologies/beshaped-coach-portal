/**
 * `next dev` against the local Firebase emulators (started from beshaped-backend).
 * Sets NEXT_PUBLIC_USE_EMULATORS=true for this process only; works the same on Windows and macOS.
 */
import { spawn } from "node:child_process";

const child = spawn("npx", ["next", "dev", ...process.argv.slice(2)], {
  stdio: "inherit",
  shell: true,
  env: { ...process.env, NEXT_PUBLIC_USE_EMULATORS: "true" },
});
child.on("exit", (code) => process.exit(code ?? 0));
