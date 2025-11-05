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
    const protocolSpec = `You are participating in a structured technical interview over a Realtime channel.\n\nINTERACTION MODEL (TOOLS DRIVEN)\nInstead of emitting raw JSON lines in textual output, you MUST use the provided tools to signal interview lifecycle events.\n\nClient→Model control intents (sent as control messages):\n- client.start : Candidate is ready; greet and request a brief professional introduction. After introduction, move to first technical question.\n- client.request_score : Candidate requests final scoring; compute and emit final score & breakdown, then a completion signal.\n\nTools you can call (select the best moment; never fabricate new tool names):\n1. interview_greet(args) -> use when greeting and asking for introduction. args: { message: string }. Keep message concise, encouraging, professional.\n2. question_ready(args) -> before each new technical question. args: { idx: number (0-based), topic: string, difficulty: number }. Difficulty 1-5 (start at 3, adapt).\n3. interview_score(args) -> once after client.request_score. args: { score: number (0-100), breakdown: { clarity: number, correctness: number, depth: number }, summary?: string }. Breakdown values are 0-1 floats.\n4. interview_done(args) -> terminal signal after interview_score (args: { }).\n\nRules:\n1. NEVER call question_ready before you have first called interview_greet AND (implicitly) received the candidate intro (assume intro after greeting exchange).\n2. Only ONE interview_score; immediately follow it with interview_done.\n3. Provide at most ~2 follow-up clarifying prompts per question if the candidate answer seems shallow before moving on.\n4. Keep tool call arguments minimal, machine-friendly JSON—no extraneous keys.\n5. Non-structured conversational encouragement may be plain text, but ALL lifecycle state changes MUST be tool calls.\n6. Difficulty progression: start at difficulty 3; raise if candidate shows strong mastery; lower slightly if struggling repeatedly.\n7. Do NOT output raw event markers or the word EVENT. Use tools exclusively.\n\nIf candidate stalls >10s (virtual) during introduction, call interview_greet again with a gentle prompt. After scoring, summary in interview_score.summary should be constructive and growth-focused.`;
    const instructions = [
      persona,
      '',
      protocolSpec,
      '',
      'protocol_version:1.1',
    ].join('\n');
    const bodyPayload = {
      model,
      voice,
      modalities: ['text', 'audio'],
      instructions,
      tools: [
        {
          type: 'function',
          name: 'interview_greet',
          description:
            'Emit initial greeting and request for candidate introduction.',
          parameters: {
            type: 'object',
            properties: {
              message: { type: 'string', description: 'Greeting and prompt.' },
            },
            required: ['message'],
            additionalProperties: false,
          },
        },
        {
          type: 'function',
          name: 'question_ready',
          description: 'Signal a new interview question is ready.',
          parameters: {
            type: 'object',
            properties: {
              idx: { type: 'number', description: '0-based question index.' },
              topic: { type: 'string', description: 'Short topic label.' },
              difficulty: {
                type: 'number',
                description: 'Difficulty tier 1(low)-5(high).',
              },
            },
            required: ['idx', 'topic', 'difficulty'],
            additionalProperties: false,
          },
        },
        {
          type: 'function',
          name: 'interview_score',
          description: 'Provide final numeric score and breakdown.',
          parameters: {
            type: 'object',
            properties: {
              score: { type: 'number', description: '0-100 final score.' },
              breakdown: {
                type: 'object',
                properties: {
                  clarity: { type: 'number' },
                  correctness: { type: 'number' },
                  depth: { type: 'number' },
                },
                required: ['clarity', 'correctness', 'depth'],
                additionalProperties: false,
              },
              summary: {
                type: 'string',
                description: 'Short constructive summary.',
              },
            },
            required: ['score', 'breakdown'],
            additionalProperties: false,
          },
        },
        {
          type: 'function',
          name: 'interview_done',
          description: 'Signal interview fully complete after scoring.',
          parameters: {
            type: 'object',
            properties: {},
            additionalProperties: false,
          },
        },
      ],
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
      protocolVersion: '1.1',
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
