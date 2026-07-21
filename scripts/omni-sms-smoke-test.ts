/** @deprecated Use: npx tsx scripts/sms-smoke-test.ts */
import { spawnSync } from "node:child_process";
import path from "node:path";

const script = path.join(__dirname, "sms-smoke-test.ts");
const result = spawnSync(process.execPath, ["--import", "tsx", script, ...process.argv.slice(2)], {
  stdio: "inherit",
  env: process.env,
});
process.exit(result.status ?? 1);
