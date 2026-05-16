import "@/app/lib/envSetup";
import { NextResponse } from "next/server";
import { OPENAI_REALTIME_MODEL } from "@/app/lib/realtimeModel";
import { getOpenAIApiKey } from "@/app/lib/openaiEnv";

/**
 * GA Realtime mints ephemeral keys via `POST /v1/realtime/sessions` (response includes
 * `client_secret.value`). As of 2026, `POST /v1/realtime/client_secrets` can return
 * 400 "Realtime Beta API is no longer supported" for the same API key.
 */
export async function GET() {
  try {
    const apiKey = getOpenAIApiKey();
    if (!apiKey || apiKey === "your_api_key") {
      console.error("OPENAI_API_KEY is not properly configured");
      return NextResponse.json(
        {
          error:
            "OPENAI_API_KEY is not set. Add it in Vercel (or `.env.local` locally), then redeploy / restart.",
        },
        { status: 500 }
      );
    }

    const headers: Record<string, string> = {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json",
    };
    const org = process.env.OPENAI_ORG_ID?.trim();
    const project = process.env.OPENAI_PROJECT_ID?.trim();
    if (org) headers["OpenAI-Organization"] = org;
    if (project) headers["OpenAI-Project"] = project;

    const response = await fetch("https://api.openai.com/v1/realtime/sessions", {
      method: "POST",
      headers,
      body: JSON.stringify({
        model: OPENAI_REALTIME_MODEL,
        modalities: ["audio", "text"],
      }),
    });

    if (!response.ok) {
      let errorMessage = "Unknown error";
      try {
        const errorData = (await response.json()) as {
          error?: { message?: string } | string;
        };
        console.error("OpenAI API error:", response.status, errorData);
        errorMessage =
          typeof errorData.error === "object" && errorData.error?.message
            ? errorData.error.message
            : typeof errorData.error === "string"
              ? errorData.error
              : JSON.stringify(errorData);
      } catch {
        const text = await response.text();
        console.error("OpenAI API error (non-JSON):", response.status, text);
        errorMessage = text?.slice(0, 500) || errorMessage;
      }
      return NextResponse.json(
        { error: `OpenAI API error: ${response.status} — ${errorMessage}` },
        { status: response.status }
      );
    }

    const data = (await response.json()) as {
      client_secret?: { value?: string; expires_at?: number };
      id?: string;
      model?: string;
      [key: string]: unknown;
    };

    const ephemeral = data.client_secret?.value;
    if (!ephemeral?.startsWith("ek_")) {
      console.error("/realtime/sessions OK but no ek_ in client_secret:", data);
      return NextResponse.json(
        {
          error:
            "OpenAI returned a session without an ephemeral key (ek_) in client_secret. Check server logs.",
        },
        { status: 502 }
      );
    }

    return NextResponse.json({
      value: ephemeral,
      expires_at: data.client_secret?.expires_at,
      session: data,
    });
  } catch (error) {
    console.error("Error in /session:", error);
    return NextResponse.json(
      { error: "Internal Server Error" },
      { status: 500 }
    );
  }
}
