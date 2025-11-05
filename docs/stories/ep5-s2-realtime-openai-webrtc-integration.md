# EP5-S2: OpenAI Realtime WebRTC Integration & Audio Bridge

As a system,
I want to stream candidate audio to OpenAI Realtime using WebRTC and receive AI responses with ultra-low latency,
So that the interview feels natural and resilient under varying network conditions.

## Scope

- WebRTC PeerConnection creation (STUN/TURN configuration, ICE lifecycle)
- Signaling handshake (SDP offer/answer) via ephemeral token endpoint
- Attach outbound microphone `MediaStreamTrack` (24kHz mono constraint) to PeerConnection
- Receive inbound AI audio track (playback via HTMLAudioElement / AudioContext mixing)
- DataChannel for realtime control events (question turn, latency markers, errors)
- Fallback to WebSocket streaming only if WebRTC negotiation fails (feature flag)
- AI speaking state derived from inbound audio track activity + data channel markers

## Acceptance Criteria

1. Successful WebRTC negotiation (ICE completed) within ≤4s (median) using ephemeral token / SDP bundle.
2. AI inbound audio track starts <1200ms after first question request (p50) and latency logged.
3. DataChannel established and emits `turn.start` / `turn.end` events; UI updates ≤150ms from receipt.
4. Automatic ICE restart on connectivity loss (<3 attempts) preserves `sessionId` and resumes audio.
5. Jitter buffer performance: no audio gap >200ms; artifact (pop/click) rate <1 per active minute.
6. Fallback path: If negotiation fails (timeout >8s), system switches to WebSocket PCM16 streaming and logs `INT_V2_WEBRTC_FALLBACK`.
7. Outbound audio encoding adheres to target sample rate (24kHz mono) and average CPU overhead <10% of main thread.

## Non-Functional

- PeerConnection memory footprint + audio buffers <50MB sustained.
- End-to-end audio latency p50 <550ms; p95 <1200ms (initial target).
- ICE restarts recover within ≤6s without manual user action.
- TURN usage monitored (counter) for cost visibility.

## DataChannel Event Schema (Draft)

```ts
interface InterviewRTCEvent {
  type:
    | 'turn.start'
    | 'turn.end'
    | 'question.ready'
    | 'latency.ping'
    | 'error'
    | 'ai.state';
  ts: number; // ms epoch
  payload?: Record<string, any>;
}
```

Notes:

- `question.ready` carries { idx, domain, difficultyTier, text }
- `ai.state` optionally signals speaking status boundaries for finer UI sync

## Risks

- High latency due to overlarge system prompt → enforce token budget & incremental context injection.
- Browser audio context suspension (tab hidden) → implement visibility listener to resume.
- NAT traversal failures / restrictive firewalls → require TURN; may increase cost.
- Potential drift if AI stream provides variable packet timing → monitor jitter, dynamically adjust playback.

## Tests

- Unit: DataChannel event parser & dispatcher.
- Unit: Audio track attach/detach lifecycle.
- Integration: Simulated signaling (mock SDP exchange) + ICE restart scenario.
- Performance: Latency measurement harness (question request → first inbound audio frame).
- Fallback: Forced negotiation failure triggers WebSocket path.

## Definition of Done

Stable WebRTC audio + control channel with logged latency metrics, resilient ICE restart, and seamless fallback to WebSocket when required.

## Rationale for WebRTC over WebSocket

| Aspect                             | WebSocket (Original Draft)          | WebRTC (Adopted)                    |
| ---------------------------------- | ----------------------------------- | ----------------------------------- |
| NAT Traversal                      | Manual proxying required            | Built-in ICE (STUN/TURN)            |
| Jitter Buffer                      | Custom implement                    | Built-in adaptive buffering         |
| Latency                            | Good but can spike on packet loss   | Optimized for real-time media       |
| Extensibility (future multi-party) | Requires additional signaling layer | Native multi-track and peer scaling |
| Audio/Video Track Handling         | Manual chunk decode & playback      | Direct media track rendering        |
| Resilience                         | Reconnect entire socket             | ICE restart keeps media flow        |

WebSockets remain as a fallback and can serve signaling if provider does not supply direct SDP; final implementation will prefer direct PeerConnection to the OpenAI Realtime endpoint (or relay) to leverage built-in media optimizations.
