import { existsSync, readFileSync } from "fs";
import path from "path";

const OPENAI_KEY = "OPENAI_API_KEY";

function findProjectRoot(): string {
  let dir = process.cwd();
  for (let i = 0; i < 6; i++) {
    if (existsSync(path.join(dir, "package.json"))) {
      return dir;
    }
    const parent = path.dirname(dir);
    if (parent === dir) break;
    dir = parent;
  }
  return process.cwd();
}

function parseEnvFile(contents: string, key: string): string | undefined {
  const lines = contents.split(/\r?\n/);
  for (const raw of lines) {
    const line = raw.trim();
    if (!line || line.startsWith("#")) continue;
    const re = new RegExp(
      `^\\s*${key.replace(/[^A-Z0-9_]/gi, "")}\\s*=\\s*(.*)$`,
      "i",
    );
    const match = line.match(re);
    if (!match) continue;
    let value = match[1].trim();
    if (
      (value.startsWith('"') && value.endsWith('"')) ||
      (value.startsWith("'") && value.endsWith("'"))
    ) {
      value = value.slice(1, -1);
    }
    return value;
  }
  return undefined;
}

/**
 * Resolves the OpenAI API key for App Route handlers. Tries `process.env` first
 * (including values Next or `envSetup` already loaded), then reads `.env.local`
 * / `.env` from the project root. File fallback avoids cases where `process.cwd()`
 * or module order prevents `dotenv` from populating `process.env` before the route runs.
 */
export function getOpenAIApiKey(): string | undefined {
  const fromEnv = process.env[OPENAI_KEY]?.trim();
  if (fromEnv) return fromEnv;

  const root = findProjectRoot();
  for (const file of [".env.local", ".env"] as const) {
    const full = path.join(root, file);
    if (!existsSync(full)) continue;
    try {
      const parsed = parseEnvFile(readFileSync(full, "utf8"), OPENAI_KEY)?.trim();
      if (parsed) return parsed;
    } catch {
      /* ignore unreadable env file */
    }
  }

  return undefined;
}
