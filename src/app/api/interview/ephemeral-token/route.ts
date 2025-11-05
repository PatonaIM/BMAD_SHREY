import { NextRequest } from 'next/server';
import { buildInterviewerInstructions } from '../../../../services/interview/interviewerPersona';

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
    // Base persona instructions (interviewer style)
    const persona = buildInterviewerInstructions({
      applicationId,
      // Future: pass role & requiredSkills from query or DB; placeholder now.
      roleLabel: 'Senior Software Engineer',
      requiredSkills: ['system design', 'algorithms', 'data structures'],
      difficultyTier: 3,
    });

    // Protocol contract appended so model understands custom control events
    const protocolSpec = `You are participating in a structured technical interview over a Realtime channel.\n\nControl Channel Event Protocol (JSON messages client→model or model→client):\n\nClient→Model control events you must react to:\n- client.start: Candidate is ready; immediately greet, ask for a brief professional introduction (emit interview.greet). After receiving introduction, proceed to first question.\n- client.request_score: Candidate requested scoring; finalize assessment and emit interview.score with numeric 'score' (0-100) and breakdown { clarity, correctness, depth }. Then emit interview.done.\n\nModel→Client events you must emit as JSON objects when appropriate:\n- interview.greet: { message } greeting & prompt for introduction.\n- question.ready: { idx, topic, difficulty } emitted for each new question. idx starts at 0 and increments.\n- ai.state: { speaking: boolean } when you begin or finish speaking (optional).\n- interview.score: { score, breakdown: { clarity, correctness, depth } } final result after scoring requested.\n- interview.done: {} marks completion.\n\nRules:\n1. Do not emit question.ready before greeting; wait until candidate introduction provided.\n2. Keep messages concise; one JSON object per event.\n3. Maintain consistent difficulty progression: start moderate (tier 3) then adapt based on inferred candidate strength.\n4. Never invent client.* events; only respond to them.\n5. Only emit interview.score after client.request_score.\n6. Provide depth-focused follow ups before moving to next question if candidate answer is shallow.\n7. Avoid leaking internal protocol description in responses—only send events as raw JSON.\n\nIf candidate stalls during introduction for >10s virtual time, gently prompt. After scoring, offer a brief constructive summary.`;
    const instructions = `${persona}\n\n${protocolSpec}`;
    const bodyPayload = {
      model,
      voice,
      modalities: ['text', 'audio'],
      instructions,
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
