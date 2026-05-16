/**
 * Realtime voice model for `/api/session` (client_secrets) and `RealtimeSession`.
 * Must match the `session.model` sent when minting the ephemeral key.
 *
 * GA slugs include `gpt-realtime`, `gpt-realtime-mini`, `gpt-realtime-2`, etc.
 *
 * Use `NEXT_PUBLIC_OPENAI_REALTIME_MODEL` (Vercel / `.env.local`) so server and
 * browser stay in sync — non-public env vars are not available in the client bundle.
 */
export const OPENAI_REALTIME_MODEL =
  process.env.NEXT_PUBLIC_OPENAI_REALTIME_MODEL?.trim() || "gpt-realtime";
