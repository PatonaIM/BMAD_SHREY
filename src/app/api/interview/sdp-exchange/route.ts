import { NextRequest } from 'next/server';

// EP5-S2: SDP exchange endpoint (OpenAI Realtime pass-through)
// Accepts browser offer (SDP) + ephemeral token, forwards to OpenAI Realtime API, returns answer SDP.
// Falls back to local stub transformation if OPENAI_REALTIME_DISABLED=1 for offline development.
export async function POST(req: NextRequest) {
  const body = await req.json();
  const offerSdp: string | undefined = body?.sdp;
  if (!offerSdp) {
    return new Response('Missing SDP', { status: 400 });
  }
  const applicationId: string | undefined = body?.applicationId;
  const ephemeral = req.headers.get('X-Ephemeral-Token');
  if (!ephemeral) {
    return new Response('Missing ephemeral token header', { status: 401 });
  }
  // Server pass-through must still use permanent API key; ephemeral client_secret isn't valid for this HTTP endpoint.
  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) {
    return new Response('Server missing OPENAI_API_KEY', { status: 500 });
  }

  const disabled = process.env.OPENAI_REALTIME_DISABLED === '1';
  const model =
    process.env.INTERVIEW_REALTIME_MODEL || 'gpt-4o-realtime-preview';

  if (disabled) {
    const answerSdp = synthesizeAnswerFromOffer(offerSdp);
    return Response.json({ answer: answerSdp, offline: true });
  }

  try {
    const res = await fetch(
      `https://api.openai.com/v1/realtime?model=${encodeURIComponent(model)}` +
        (applicationId
          ? `&application_id=${encodeURIComponent(applicationId)}`
          : ''),
      {
        method: 'POST',
        headers: {
          // Use permanent server key for SDP HTTP exchange; retain ephemeral for potential validation or logging.
          Authorization: `Bearer ${apiKey}`,
          'Content-Type': 'application/sdp',
          'OpenAI-Beta': 'realtime=v1',
          'X-Client-Secret': ephemeral, // optional: for downstream logging/auditing (not required by OpenAI)
        },
        body: offerSdp,
        cache: 'no-store',
      }
    );
    if (!res.ok) {
      const text = await res.text();
      return Response.json(
        {
          error: 'OpenAI SDP exchange failed',
          status: res.status,
          body: text,
        },
        { status: 502 }
      );
    }
    const answerSdp = await res.text();
    return Response.json({ answer: answerSdp, model });
  } catch (err) {
    return Response.json(
      {
        error:
          err instanceof Error ? err.message : 'Unknown SDP exchange error',
      },
      { status: 500 }
    );
  }
}

function synthesizeAnswerFromOffer(offer: string): string {
  const lines = offer.split(/\r?\n/);
  const out: string[] = [];
  for (const raw of lines) {
    let line = raw;
    if (/^a=setup:actpass$/.test(line)) {
      line = 'a=setup:passive';
    }
    if (line.startsWith('a=candidate:')) {
      const existingFirst = out.findIndex(l => l.startsWith('a=candidate:'));
      if (existingFirst !== -1) continue;
    }
    out.push(line);
  }
  if (!out.some(l => l.startsWith('a=setup:'))) {
    const insertAt = out.findIndex(l => l.startsWith('m='));
    if (insertAt !== -1) out.splice(insertAt + 1, 0, 'a=setup:passive');
    else out.push('a=setup:passive');
  }
  return out.join('\r\n');
}
