import { existsSync } from "fs";
import path from "path";
import dotenv from "dotenv";

/**
 * Load `.env` then `.env.local` into `process.env` (local overrides).
 * Uses the `dotenv` package only — avoids `@next/env` / `instrumentation`, which
 * webpack can bundle in contexts where Node `crypto` is not available.
 */
const root = process.cwd();

const envPath = path.join(root, ".env");
const envLocalPath = path.join(root, ".env.local");

if (existsSync(envPath)) {
  dotenv.config({ path: envPath });
}
if (existsSync(envLocalPath)) {
  dotenv.config({ path: envLocalPath, override: true });
}
