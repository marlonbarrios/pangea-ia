import "@/app/lib/envSetup";
import { NextResponse } from "next/server";
import { OPENAI_REALTIME_MODEL } from "@/app/lib/realtimeModel";
import { getOpenAIApiKey } from "@/app/lib/openaiEnv";

function openaiApiBase(): string {
  const raw = process.env.OPENAI_BASE_URL?.trim();
  if (!raw) return "https://api.openai.com/v1";
  return raw.replace(/\/$/, "");
}

function openaiHeaders(apiKey: string): Record<string, string> {
  const headers: Record<string, string> = {
    Authorization: `Bearer ${apiKey}`,
    "Content-Type": "application/json",
  };
  const org =
    process.env.OPENAI_ORG_ID?.trim() ||
    process.env.OPENAI_ORGANIZATION?.trim();
  const project =
    process.env.OPENAI_PROJECT_ID?.trim() || process.env.OPENAI_PROJECT?.trim();
  if (org) headers["OpenAI-Organization"] = org;
  if (project) headers["OpenAI-Project"] = project;
  return headers;
}

async function readOpenAIErrorMessage(res: Response): Promise<string> {
  try {
    const err = (await res.json()) as { error?: { message?: string } | string };
    if (typeof err.error === "object" && err.error?.message) return err.error.message;
    if (typeof err.error === "string") return err.error;
    return JSON.stringify(err);
  } catch {
    const text = await res.text();
    return text?.slice(0, 500) || "Unknown error";
  }
}

function extractEkFromClientSecretsPayload(data: unknown): string | undefined {
  if (!data || typeof data !== "object") return undefined;
  const d = data as Record<string, unknown>;
  if (typeof d.value === "string" && d.value.startsWith("ek_")) return d.value;
  const cs = d.client_secret;
  if (typeof cs === "string" && cs.startsWith("ek_")) return cs;
  if (cs && typeof cs === "object" && "value" in cs && typeof (cs as { value: unknown }).value === "string") {
    const v = (cs as { value: string }).value;
    if (v.startsWith("ek_")) return v;
  }
  return undefined;
}

function extractEkFromSessionPayload(data: unknown): string | undefined {
  if (!data || typeof data !== "object") return undefined;
  const d = data as { client_secret?: { value?: string } };
  const v = d.client_secret?.value;
  return v?.startsWith("ek_") ? v : undefined;
}

/** Safe booleans for debugging Vercel vs local (no secrets). */
function openaiEnvChecklist() {
  const orgSet = !!(
    process.env.OPENAI_ORG_ID?.trim() || process.env.OPENAI_ORGANIZATION?.trim()
  );
  const projectSet = !!(
    process.env.OPENAI_PROJECT_ID?.trim() || process.env.OPENAI_PROJECT?.trim()
  );
  return {
    has_openai_organization: orgSet,
    has_openai_project: projectSet,
    openai_base_url_set: !!process.env.OPENAI_BASE_URL?.trim(),
    realtime_model: OPENAI_REALTIME_MODEL,
  };
}

type MintOk = { ok: true; value: string; expires_at?: number; session: unknown };
type MintErr = { ok: false; status: number; message: string };

/**
 * Try GA mint paths in order. Uses OPENAI_BASE_URL when set (e.g. EU:
 * https://eu.api.openai.com/v1).
 */
async function mintEphemeralSession(apiKey: string): Promise<MintOk | MintErr> {
  const base = openaiApiBase();
  const headers = openaiHeaders(apiKey);

  let lastStatus = 502;
  let lastMessage = "Could not mint an ephemeral Realtime key.";

  const tryParse = async (
    res: Response,
    extract: (data: unknown) => string | undefined,
    sessionWrapper: (data: unknown) => unknown
  ): Promise<MintOk | null> => {
    if (!res.ok) {
      lastStatus = res.status;
      lastMessage = await readOpenAIErrorMessage(res);
      return null;
    }
    let data: unknown;
    try {
      data = await res.json();
    } catch {
      lastStatus = 502;
      lastMessage = "OpenAI returned a non-JSON success body.";
      return null;
    }
    const value = extract(data);
    if (!value) {
      lastStatus = 502;
      lastMessage = "OpenAI response did not include an ek_ client secret.";
      return null;
    }
    const exp =
      data && typeof data === "object" && "expires_at" in data && typeof (data as { expires_at: unknown }).expires_at === "number"
        ? (data as { expires_at: number }).expires_at
        : data && typeof data === "object" && "client_secret" in data && (data as { client_secret?: { expires_at?: number } }).client_secret
          ? (data as { client_secret?: { expires_at?: number } }).client_secret?.expires_at
          : undefined;
    return {
      ok: true,
      value,
      expires_at: exp,
      session: sessionWrapper(data),
    };
  };

  // 1) POST /v1/realtime/sessions — often works when client_secrets is routed to beta.
  {
    const res = await fetch(`${base}/realtime/sessions`, {
      method: "POST",
      headers,
      body: JSON.stringify({ model: OPENAI_REALTIME_MODEL }),
    });
    const parsed = await tryParse(res, extractEkFromSessionPayload, (d) => d);
    if (parsed) return parsed;
  }

  // 2) POST /v1/realtime/client_secrets
  {
    const res = await fetch(`${base}/realtime/client_secrets`, {
      method: "POST",
      headers,
      body: JSON.stringify({
        expires_after: { anchor: "created_at", seconds: 600 },
        session: {
          type: "realtime",
          model: OPENAI_REALTIME_MODEL,
        },
      }),
    });
    const parsed = await tryParse(res, extractEkFromClientSecretsPayload, (data) =>
      data && typeof data === "object" && "session" in data ? (data as { session: unknown }).session : data
    );
    if (parsed) return parsed;
  }

  return { ok: false, status: lastStatus, message: lastMessage };
}

export async function GET() {
  try {
    const apiKey = getOpenAIApiKey();
    if (!apiKey || apiKey === "your_api_key") {
      console.error("OPENAI_API_KEY is not properly configured");
      return NextResponse.json(
        {
          error:
            "OPENAI_API_KEY is not set. Add it in `.env.local` (local) or Vercel env, then restart.",
        },
        { status: 500 }
      );
    }

    const result = await mintEphemeralSession(apiKey);
    if (!result.ok) {
      const checklist = openaiEnvChecklist();
      const betaHint =
        result.message.includes("Beta API") || result.message.toLowerCase().includes("beta")
          ? " Add the same OPENAI_ORG_ID + OPENAI_PROJECT_ID (or OPENAI_ORGANIZATION + OPENAI_PROJECT) you use in .env.local to Vercel → Settings → Environment Variables (Production), then redeploy. If you use EU data residency, set OPENAI_BASE_URL=https://eu.api.openai.com/v1 there too."
          : "";
      return NextResponse.json(
        {
          error: `OpenAI API error: ${result.status} — ${result.message}${betaHint}`,
          env_hint: checklist,
        },
        { status: result.status }
      );
    }

    return NextResponse.json({
      value: result.value,
      expires_at: result.expires_at,
      session: result.session,
    });
  } catch (error) {
    console.error("Error in /session:", error);
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}
