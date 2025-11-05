# EP5-S4: Canvas Composite Recording

As a system reviewing interviews later,
I want a recording containing the full UI context, webcam PiP, and mixed audio (candidate + AI),
So that replay retains complete situational fidelity.

## Scope

- Capture root interview container via `HTMLCanvasElement` draw loop
- Draw webcam stream PiP (bottom-right, rounded corners)
- Mixed audio node combining candidate mic + AI playback stream
- MediaRecorder on composite stream → chunked output
- Dynamic resolution fallback (1280x720 → 960x540 → 640x360)

## Acceptance Criteria

1. Composite recording starts automatically at interview activation
2. Frame rate target ~30fps (log actual averaged)
3. Mixed audio balanced (AI volume normalized vs candidate)
4. Resolution downgrade triggers when average encode time > threshold (e.g. 25ms)
5. Metadata saved: resolution, fps avg, hasWebcam, total chunks
6. Graceful stop ensures final chunk flushed
7. If canvas unsupported → fallback to webcam-only recording (flag composite=false)

## Performance

- Canvas draw loop CPU <40% on mid-tier laptop
- Memory usage stable (<250MB total for recording system)

## Risks

- Safari canvas constraints → fallback path essential
- Audio drift → use single mixed media stream for sync

## Tests

- Manual: inspect composite recording playback integrity
- Automated: mock canvas draw loop timing & resolution fallback logic

## Definition of Done

Playable composite recording with captured UI + webcam + mixed audio and resilient fallbacks.
