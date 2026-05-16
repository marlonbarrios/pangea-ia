import "@/app/lib/envSetup";
import OpenAI, { APIError } from "openai";
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
            "OPENAI_API_KEY is not set. Add it in Vercel (or `.env.local` locally), then redeploy / restart.",
        },
        { status: 500 }
      );
    }

    // Use the official client so `OpenAI-Organization` / `OpenAI-Project` are sent
    // when `OPENAI_ORG_ID` / `OPENAI_PROJECT_ID` are set. Raw fetch omitted those
    // headers and can hit the deprecated beta route with some keys (400:
    // "Realtime Beta API is no longer supported").
    const openai = new OpenAI({ apiKey });

    const data = await openai.realtime.clientSecrets.create({
      expires_after: {
        anchor: "created_at",
        seconds: 600,
      },
      session: {
        type: "realtime",
        model: OPENAI_REALTIME_MODEL,
      },
    });

    if (!data.value?.startsWith("ek_")) {
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
      value: data.value,
      expires_at: data.expires_at,
      session: data.session,
    });
  } catch (error) {
    console.error("Error in /session:", error);
    if (error instanceof APIError) {
      return NextResponse.json(
        { error: `OpenAI API error: ${error.status} — ${error.message}` },
        { status: error.status ?? 500 }
      );
    }
    return NextResponse.json(
      { error: "Internal Server Error" },
      { status: 500 }
    );
  }
}
