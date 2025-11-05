import { NextRequest } from 'next/server';

// EP5-S2: Ephemeral realtime session token endpoint (OpenAI integration)
// Creates a short-lived client secret used by the browser to perform the SDP exchange directly
// against OpenAI's Realtime API (via our pass-through /sdp-exchange for now).
// Security: NEVER expose your permanent OPENAI_API_KEY to the client; only return the ephemeral client_secret.
export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const applicationId = searchParams.get('applicationId') || 'unknown';

  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) {
    return Response.json(
      { error: 'OPENAI_API_KEY not configured' },
      { status: 500 }
    );
  }

  // Model & voice can be parameterized later; keep minimal for now.
  const model =
    process.env.INTERVIEW_REALTIME_MODEL || 'gpt-4o-realtime-preview';
  const voice = process.env.INTERVIEW_REALTIME_VOICE || 'alloy';

  try {
    // OpenAI Realtime sessions currently allow: model, voice, modalities, instructions
    // Remove unsupported 'metadata' param that caused error.
    const bodyPayload = {
      model,
      voice,
      // The browser will negotiate audio; include both text & audio modalities for flexibility.
      modalities: ['text', 'audio'],
      instructions: `AI Interview session for application ${applicationId}. Respond succinctly and await turn events.`,
    };
    const sessionRes = await fetch(
      'https://api.openai.com/v1/realtime/sessions',
      {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${apiKey}`,
          'Content-Type': 'application/json',
          'OpenAI-Beta': 'realtime=v1',
        },
        body: JSON.stringify(bodyPayload),
        cache: 'no-store',
      }
    );
    let rawJson: unknown = null;
    let textBody: string | null = null;
    if (sessionRes.headers.get('content-type')?.includes('application/json')) {
      rawJson = await sessionRes.json();
    } else {
      textBody = await sessionRes.text();
    }
    if (!sessionRes.ok) {
      return Response.json(
        {
          error: 'Failed to create realtime session',
          status: sessionRes.status,
          body: rawJson || textBody,
        },
        { status: 502 }
      );
    }
    const session = rawJson as {
      client_secret?: string;
      expires_at?: string;
    } | null;
    const clientSecret: string | undefined = session?.client_secret;
    if (!clientSecret) {
      return Response.json(
        { error: 'Realtime session missing client_secret' },
        { status: 502 }
      );
    }
    return Response.json({
      token: clientSecret,
      sdpEndpoint: '/api/interview/sdp-exchange',
      model,
      voice,
      expiresAt: session?.expires_at,
    });
  } catch (err) {
    return Response.json(
      {
        error:
          err instanceof Error ? err.message : 'Unknown error creating session',
      },
      { status: 500 }
    );
  }
}
