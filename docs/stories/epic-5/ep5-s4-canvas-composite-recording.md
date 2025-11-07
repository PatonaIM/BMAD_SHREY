# EP5-S4: Canvas Composite Recording

As a system reviewing interviews later,
I want a recording containing the full UI context, webcam PiP, and mixed audio (candidate + AI),
So that replay retains complete situational fidelity.

## Scope

- Use `HTMLElement.captureStream()` to capture the root interview container directly
- Browser handles frame capture automatically (no manual draw loop needed)
- Mixed audio node combining candidate mic + AI playback stream
- MediaRecorder on composite stream (video from captureStream + mixed audio)
- Dynamic resolution fallback via CSS transform scale if capture quality is poor
- Fallback: If captureStream() unsupported, record webcam-only with flag `composite=false`

## Acceptance Criteria

1. Composite recording starts automatically at interview activation using `element.captureStream(frameRate)`
2. Frame rate target ~30fps (browser-managed)
3. Mixed audio balanced (AI volume normalized vs candidate)
4. If captureStream() unavailable (e.g., older Safari), gracefully fall back to webcam-only recording
5. Metadata saved: resolution, fps target, hasComposite, hasWebcam, total chunks
6. Graceful stop ensures final chunk flushed
7. Audio/video sync maintained by combining captureStream video track with mixed audio track

## Performance

- Offloads frame capture to browser's native implementation (more efficient than manual canvas)
- Memory usage stable (<150MB for recording system)
- CPU usage minimal since browser handles encoding

## Risks

- Browser support: `captureStream()` supported in Chrome/Edge/Firefox, limited Safari support
- Solution: Feature detection + webcam-only fallback
- Audio drift → use single mixed MediaStream for sync

## Tests

- Manual: inspect composite recording playback integrity
- Automated: feature detection for captureStream(), fallback logic validation

## Definition of Done

Playable composite recording with captured UI + webcam + mixed audio using native captureStream() API with resilient fallbacks.
