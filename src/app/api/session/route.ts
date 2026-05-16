import "@/app/lib/envSetup";
import { NextResponse } from "next/server";
import { OPENAI_REALTIME_MODEL } from "@/app/lib/realtimeModel";
import { getOpenAIApiKey } from "@/app/lib/openaiEnv";

export async function GET() {
  try {
    const apiKey = getOpenAIApiKey();
    if (!apiKey || apiKey === "your_api_key") {
      console.error("OPENAI_API_KEY is not properly configured");
      return NextResponse.json(
        {
          error:
            "OPENAI_API_KEY is not set. Add it to `.env.local` in the project root (same folder as package.json), then restart `npm run dev`.",
        },
        { status: 500 }
      );
    }

    const response = await fetch(
      "https://api.openai.com/v1/realtime/client_secrets",
      {
        method: "POST",
        headers: {
          Authorization: `Bearer ${apiKey}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          expires_after: {
            anchor: "created_at",
            seconds: 600,
          },
          session: {
            type: "realtime",
            model: OPENAI_REALTIME_MODEL,
          },
        }),
      }
    );
    
    if (!response.ok) {
      let errorMessage = "Unknown error";
      try {
        const errorData = await response.json();
        console.error("OpenAI API error:", response.status, errorData);
        errorMessage =
          errorData.error?.message ??
          (typeof errorData.error === "string" ? errorData.error : null) ??
          JSON.stringify(errorData);
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
    
    const data = (await response.json()) as Record<string, unknown>;

    const ephemeral =
      typeof data.value === "string"
        ? data.value
        : typeof data.client_secret === "string"
          ? data.client_secret
          : typeof data.client_secret === "object" &&
              data.client_secret !== null &&
              "value" in data.client_secret &&
              typeof (data.client_secret as { value?: unknown }).value === "string"
            ? (data.client_secret as { value: string }).value
            : undefined;

    if (!ephemeral?.startsWith("ek_")) {
      console.error("client_secrets OK but no ek_ value in payload:", data);
      return NextResponse.json(
        {
          error:
            "OpenAI returned a client_secrets response without an ephemeral key (ek_). Check server logs for the raw payload shape.",
        },
        { status: 502 }
      );
    }

    return NextResponse.json({
      value: ephemeral,
      expires_at: data.expires_at,
      session: data.session,
    });
  } catch (error) {
    console.error("Error in /session:", error);
    return NextResponse.json(
      { error: "Internal Server Error" },
      { status: 500 }
    );
  }
}
