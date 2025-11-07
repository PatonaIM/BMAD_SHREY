# EP3-S13: Canvas Recording Implementation

**Epic:** 3 - Interactive AI Interview System  
**Story ID:** EP3-S13  
**Priority:** High  
**Effort:** 5 Story Points  
**Dependencies:** EP3-S12 (Split Panel Refactor)

---

## User Story

**As a** recruiter reviewing interview recordings,  
**I want** to see the entire interview interface including questions, coaching signals, and candidate video,  
**So that** I get complete context of the interview session beyond just the candidate's camera feed.

**As a** candidate,  
**I want** the option to share my screen or show code during the interview,  
**So that** I can demonstrate my technical skills more effectively.

---

## Context & Motivation

### Current State (Camera-Only Recording)

**What's Recorded:**

- ✅ Candidate webcam feed (720p video)
- ✅ Candidate audio (microphone)
- ❌ **Missing:** AI questions displayed on screen
- ❌ **Missing:** Coaching signals from helper panel
- ❌ **Missing:** Screen shares or code demos
- ❌ **Missing:** UI state (timer, status)

**Current Implementation:**

```typescript
// Only captures camera + mic
const stream = await navigator.mediaDevices.getUserMedia({
  video: { width: 1280, height: 720 },
  audio: true,
});

const mediaRecorder = new MediaRecorder(stream, {
  mimeType: 'video/webm;codecs=vp9,opus',
});
```

**Problems:**

1. Recruiters see candidate but not what questions were asked
2. No visual context of coaching signals or interview flow
3. Can't capture technical demonstrations (code, diagrams)
4. Recording doesn't reflect full interview experience

### Desired Future State (Canvas Recording)

**What Will Be Recorded:**

- ✅ Entire interview interface (both panels)
- ✅ Candidate webcam feed (picture-in-picture)
- ✅ AI questions and current question display
- ✅ Coaching signals from helper panel
- ✅ Optional screen shares or code demos
- ✅ Timer, status, and UI state
- ✅ Candidate audio (from mic)
- ✅ AI interviewer audio (from OpenAI)

**Benefits:**

- Complete context for recruiters
- Visual record of coaching signals
- Capture technical demonstrations
- Better post-interview review experience
- More comprehensive assessment data

---

## Acceptance Criteria

### 1. Canvas Capture Implementation

**Root Component Capture:**

- [ ] Capture entire `InterviewContainer` component as canvas stream
- [ ] Include both AI Interview and Helper panels
- [ ] Maintain layout fidelity (responsive design captured correctly)
- [ ] Capture at 30fps minimum
- [ ] Resolution: 1920x1080 (desktop) or 1280x720 (lower-end devices)

**Webcam Picture-in-Picture:**

- [ ] Overlay webcam feed in corner of recording
- [ ] Position: Bottom-right or top-right (configurable)
- [ ] Size: 320x240 (standard PiP size)
- [ ] Option to hide webcam (audio-only interview)
- [ ] Smooth overlay without z-index issues

**Canvas API Usage:**

```typescript
// Capture root component using displayMediaStreamConstraints
const canvasStream = await navigator.mediaDevices.getDisplayMedia({
  video: {
    displaySurface: 'browser', // Capture browser tab
    width: 1920,
    height: 1080,
    frameRate: 30,
  },
  audio: false, // Audio handled separately
});

// Overlay webcam on canvas
const webcamStream = await navigator.mediaDevices.getUserMedia({
  video: { width: 320, height: 240 },
  audio: true,
});

// Composite streams using Canvas API
const compositeStream = compositeStreams(canvasStream, webcamStream);
```

**MUST:**

- [ ] Canvas capture includes full UI (both panels)
- [ ] Webcam overlay positioned correctly
- [ ] Text remains readable in recording
- [ ] No performance degradation during capture
- [ ] Proper cleanup on stop/error

### 2. Audio Track Composition

**Multiple Audio Sources:**

1. **Candidate Microphone:** User's speech
2. **AI Interviewer Audio:** OpenAI Realtime playback
3. **System Audio (Optional):** Screen share audio if enabled

**Audio Mixing Requirements:**

- [ ] Mix multiple audio tracks into single stream
- [ ] Balance levels (AI voice and user voice both audible)
- [ ] Prevent echo/feedback (use echo cancellation)
- [ ] Maintain audio quality (24kHz, 128kbps minimum)
- [ ] Sync audio with video (no drift)

**Implementation Approach:**

```typescript
// Web Audio API for mixing
const audioContext = new AudioContext();

// Create sources
const micSource = audioContext.createMediaStreamSource(micStream);
const aiAudioSource = audioContext.createMediaStreamSource(aiPlaybackStream);

// Create mixer
const mixer = audioContext.createGain();
micSource.connect(mixer);
aiAudioSource.connect(mixer);

// Create destination
const dest = audioContext.createMediaStreamDestination();
mixer.connect(dest);

// Use mixed audio in recording
const mixedAudioTrack = dest.stream.getAudioTracks()[0];
```

**MUST:**

- [ ] Both AI and user audio captured
- [ ] Volume levels balanced
- [ ] No distortion or clipping
- [ ] Audio-video sync maintained
- [ ] Echo cancellation working

### 3. Screen Share Integration (Optional)

**Feature:** Allow candidate to share screen during interview (for code demos, whiteboard, etc.)

**User Flow:**

1. Interview starts with normal UI capture
2. Candidate clicks "Share Screen" button (optional)
3. Browser prompts for screen/window selection
4. Recording switches to screen share (with webcam PiP)
5. Candidate clicks "Stop Sharing" to return to normal view
6. Both modes captured in single recording

**Requirements:**

- [ ] "Share Screen" button in interview controls
- [ ] Smooth transition between UI capture and screen share
- [ ] Recording continues seamlessly during transition
- [ ] Webcam PiP remains visible during screen share
- [ ] Audio continues normally
- [ ] User can switch back to UI capture mode

**Screen Share Capture:**

```typescript
async function startScreenShare() {
  const screenStream = await navigator.mediaDevices.getDisplayMedia({
    video: { width: 1920, height: 1080, frameRate: 30 },
    audio: true, // Capture system audio if needed
  });

  // Switch recorder to screen stream
  switchRecordingSource(screenStream);
}
```

**MUST:**

- [ ] Screen share optional (not required)
- [ ] Graceful fallback if permission denied
- [ ] Clear UI indication of what's being captured
- [ ] Stop screen share button visible when active
- [ ] Recording doesn't stop during transition

### 4. Recording Manager Enhancement

**Extend `VideoRecordingManager`:**

```typescript
interface CanvasRecordingConfig {
  captureMode: 'component' | 'screen-share';
  includeWebcam: boolean;
  webcamPosition: 'top-right' | 'bottom-right' | 'top-left' | 'bottom-left';
  webcamSize: { width: number; height: number };
  resolution: { width: number; height: number };
  frameRate: number;
  videoBitrate: number; // 2500000 for high quality
  audioBitrate: number; // 128000 for good audio
}

class CanvasRecordingManager extends VideoRecordingManager {
  async startComponentRecording(config: CanvasRecordingConfig): Promise<void>;
  async startScreenShareRecording(): Promise<void>;
  async toggleWebcamOverlay(visible: boolean): Promise<void>;
  async switchCaptureMode(mode: 'component' | 'screen-share'): Promise<void>;
}
```

**Features:**

- [ ] Support both component and screen-share modes
- [ ] Toggle webcam overlay visibility
- [ ] Switch modes mid-recording (seamless transition)
- [ ] Chunked upload continues working (2MB chunks)
- [ ] Azure Blob storage integration unchanged
- [ ] Metadata includes capture mode

**MUST:**

- [ ] Backward compatible with existing recordings
- [ ] Error handling for permission denials
- [ ] Proper cleanup of canvas/streams
- [ ] Memory leak prevention
- [ ] Works on Chrome, Firefox, Safari, Edge

### 5. Browser Compatibility & Fallbacks

**Primary Support (Modern Browsers):**

- Chrome 94+ (getDisplayMedia full support)
- Firefox 92+ (getDisplayMedia + audio)
- Safari 13+ (limited, may need polyfill)
- Edge 94+ (Chromium-based)

**Fallback Strategy:**

```typescript
async function initializeRecording() {
  if (supportsDisplayMedia()) {
    // Use Canvas recording (EP3-S13)
    return new CanvasRecordingManager();
  } else {
    // Fall back to camera-only recording (current)
    return new VideoRecordingManager();
  }
}

function supportsDisplayMedia(): boolean {
  return !!navigator.mediaDevices?.getDisplayMedia;
}
```

**Graceful Degradation:**

- [ ] Detect Canvas API support before enabling feature
- [ ] Fall back to camera-only if getDisplayMedia unavailable
- [ ] Show warning if Canvas recording not supported
- [ ] Still capture audio if video capture fails
- [ ] Clear messaging to user about recording mode

**MUST:**

- [ ] Feature detection prevents runtime errors
- [ ] Fallback to camera-only on older browsers
- [ ] User informed of recording capabilities
- [ ] Interview proceeds even if advanced recording fails

### 6. User Permissions & Privacy

**Permission Flow:**

```
1. Interview start → Request microphone permission
2. Request camera permission (for webcam PiP)
3. Request display capture permission (for component recording)
4. If screen share: Request screen/window selection
```

**Privacy Considerations:**

- [ ] Clear explanation of what will be recorded
- [ ] User consent for display capture
- [ ] Option to hide webcam (audio-only)
- [ ] Option to not record screen (camera-only fallback)
- [ ] Clear indicators showing what's being captured

**UI Indicators:**

- [ ] 🔴 Recording indicator always visible
- [ ] Icon showing capture mode (component vs screen)
- [ ] Browser's native recording indicator (can't override)
- [ ] Status text: "Recording: Interview UI + Webcam"

**MUST:**

- [ ] Informed consent obtained
- [ ] User can opt out of webcam
- [ ] Recording mode clearly indicated
- [ ] Compliance with privacy regulations (GDPR, CCPA)

### 7. Performance & Quality

**Performance Targets:**

- [ ] Canvas rendering at 30fps stable
- [ ] CPU usage <30% during recording (mid-range laptop)
- [ ] Memory usage <500MB for 30-min recording
- [ ] No dropped frames (within 5% tolerance)
- [ ] Audio-video sync drift <100ms over 30 minutes

**Quality Targets:**

- [ ] Video resolution 1920x1080 (desktop) or 1280x720 (mobile)
- [ ] Video bitrate 2.5 Mbps (adjustable based on device)
- [ ] Audio bitrate 128 kbps
- [ ] Text legibility: 12pt font readable in recording
- [ ] Color fidelity maintained (no significant compression artifacts)

**Optimization Strategies:**

- [ ] Reduce frame rate to 24fps on low-end devices
- [ ] Lower resolution to 1280x720 if performance issues
- [ ] Use hardware encoding if available (MediaRecorder flags)
- [ ] Throttle canvas updates to match frame rate
- [ ] Debounce UI updates during recording

**MUST:**

- [ ] Recording doesn't impact interview latency
- [ ] Audio quality sufficient for transcription
- [ ] Visual quality acceptable for recruiter review
- [ ] Performance profiling done on low-end devices

---

## Technical Implementation

### Architecture Diagram

```
┌────────────────────────────────────────────────┐
│         InterviewContainer (Root)              │
│  ┌──────────────┬──────────────────────────┐  │
│  │ AI Interview │ Interview Helper         │  │
│  │ Panel        │ Panel                    │  │
│  └──────────────┴──────────────────────────┘  │
└────────────────────────────────────────────────┘
                    │
                    ▼
         getDisplayMedia() Capture
                    │
                    ▼
         Canvas Composite Layer
          ┌──────────────────┐
          │  Interview UI    │
          │  ┌──────────┐    │
          │  │ Webcam   │    │ ← getUserMedia() PiP
          │  │ Overlay  │    │
          │  └──────────┘    │
          └──────────────────┘
                    │
                    ▼
           MediaRecorder
          (video/webm VP9)
                    │
                    ▼
          Chunked Upload
          (2MB segments)
                    │
                    ▼
          Azure Blob Storage
```

### Canvas Composition Code

```typescript
class CanvasCompositor {
  private canvas: HTMLCanvasElement;
  private ctx: CanvasRenderingContext2D;
  private uiStream: MediaStream;
  private webcamStream: MediaStream;
  private animationFrame: number;

  constructor(
    uiElement: HTMLElement,
    webcamStream: MediaStream,
    config: CompositorConfig
  ) {
    this.canvas = document.createElement('canvas');
    this.canvas.width = config.width;
    this.canvas.height = config.height;
    this.ctx = this.canvas.getContext('2d')!;

    // Capture UI element as stream
    this.uiStream = this.captureElement(uiElement);
    this.webcamStream = webcamStream;
  }

  private captureElement(element: HTMLElement): MediaStream {
    // Use html2canvas or native captureStream
    const canvas = document.createElement('canvas');
    const ctx = canvas.getContext('2d')!;

    // Render element to canvas at frame rate
    const render = () => {
      ctx.drawImage(element as any, 0, 0);
      this.animationFrame = requestAnimationFrame(render);
    };
    render();

    return canvas.captureStream(30); // 30fps
  }

  composite(): MediaStream {
    const uiVideo = document.createElement('video');
    const webcamVideo = document.createElement('video');

    uiVideo.srcObject = this.uiStream;
    webcamVideo.srcObject = this.webcamStream;

    uiVideo.play();
    webcamVideo.play();

    const render = () => {
      // Draw UI layer
      this.ctx.drawImage(uiVideo, 0, 0, this.canvas.width, this.canvas.height);

      // Draw webcam PiP (bottom-right)
      const pipX = this.canvas.width - 330;
      const pipY = this.canvas.height - 250;
      this.ctx.drawImage(webcamVideo, pipX, pipY, 320, 240);

      // Add border around PiP
      this.ctx.strokeStyle = '#fff';
      this.ctx.lineWidth = 2;
      this.ctx.strokeRect(pipX, pipY, 320, 240);

      this.animationFrame = requestAnimationFrame(render);
    };
    render();

    return this.canvas.captureStream(30);
  }

  destroy() {
    cancelAnimationFrame(this.animationFrame);
    this.uiStream.getTracks().forEach(t => t.stop());
    this.webcamStream.getTracks().forEach(t => t.stop());
  }
}
```

### Audio Mixing Code

```typescript
class AudioMixer {
  private audioContext: AudioContext;
  private mixer: GainNode;
  private destination: MediaStreamAudioDestinationNode;

  constructor() {
    this.audioContext = new AudioContext({ sampleRate: 24000 });
    this.mixer = this.audioContext.createGain();
    this.destination = this.audioContext.createMediaStreamDestination();
    this.mixer.connect(this.destination);
  }

  addSource(stream: MediaStream, gain: number = 1.0): GainNode {
    const source = this.audioContext.createMediaStreamSource(stream);
    const gainNode = this.audioContext.createGain();
    gainNode.gain.value = gain;

    source.connect(gainNode);
    gainNode.connect(this.mixer);

    return gainNode;
  }

  getMixedStream(): MediaStream {
    return this.destination.stream;
  }

  destroy() {
    this.audioContext.close();
  }
}

// Usage in recording manager
const mixer = new AudioMixer();
mixer.addSource(micStream, 1.0); // User mic at 100%
mixer.addSource(aiAudioStream, 0.8); // AI voice at 80%
const mixedAudio = mixer.getMixedStream();
```

### Updated Recording Manager

```typescript
export class CanvasRecordingManager {
  private compositor: CanvasCompositor | null = null;
  private audioMixer: AudioMixer | null = null;
  private mediaRecorder: MediaRecorder | null = null;
  private mode: 'component' | 'screen-share' = 'component';

  async startRecording(
    rootElement: HTMLElement,
    micStream: MediaStream,
    aiAudioStream: MediaStream,
    config: RecordingConfig
  ): Promise<void> {
    try {
      // Get webcam stream
      const webcamStream = await navigator.mediaDevices.getUserMedia({
        video: { width: 320, height: 240 },
        audio: false, // Audio handled separately
      });

      // Composite video (UI + webcam PiP)
      this.compositor = new CanvasCompositor(rootElement, webcamStream, {
        width: config.resolution.width,
        height: config.resolution.height,
        webcamPosition: config.webcamPosition,
      });
      const videoStream = this.compositor.composite();

      // Mix audio (mic + AI)
      this.audioMixer = new AudioMixer();
      this.audioMixer.addSource(micStream, 1.0);
      this.audioMixer.addSource(aiAudioStream, 0.8);
      const audioStream = this.audioMixer.getMixedStream();

      // Combine video + audio
      const combinedStream = new MediaStream([
        ...videoStream.getVideoTracks(),
        ...audioStream.getAudioTracks(),
      ]);

      // Start MediaRecorder
      this.mediaRecorder = new MediaRecorder(combinedStream, {
        mimeType: 'video/webm;codecs=vp9,opus',
        videoBitsPerSecond: config.videoBitrate,
        audioBitsPerSecond: config.audioBitrate,
      });

      this.mediaRecorder.ondataavailable = event => {
        if (event.data.size > 0) {
          this.uploadChunk(event.data);
        }
      };

      this.mediaRecorder.start(5000); // 5-second chunks
    } catch (error) {
      console.error('Failed to start canvas recording:', error);
      throw error;
    }
  }

  async switchToScreenShare(): Promise<void> {
    const screenStream = await navigator.mediaDevices.getDisplayMedia({
      video: { width: 1920, height: 1080, frameRate: 30 },
      audio: true,
    });

    // TODO: Implement seamless stream switching
    this.mode = 'screen-share';
  }

  async stopRecording(): Promise<void> {
    this.mediaRecorder?.stop();
    this.compositor?.destroy();
    this.audioMixer?.destroy();

    // Finalize upload
    await this.finalizeUpload();
  }

  private async uploadChunk(chunk: Blob): Promise<void> {
    // Existing chunked upload logic
  }

  private async finalizeUpload(): Promise<void> {
    // Existing finalization logic
  }
}
```

---

## Definition of Done

**Functionality:**

- [ ] Canvas recording captures full interview UI
- [ ] Webcam PiP overlay positioned correctly
- [ ] Both AI and user audio mixed properly
- [ ] Screen share mode works (optional)
- [ ] Recording uploaded to Azure successfully
- [ ] Playback quality acceptable

**Code Quality:**

- [ ] CanvasCompositor class implemented and tested
- [ ] AudioMixer class implemented and tested
- [ ] CanvasRecordingManager extends existing manager
- [ ] TypeScript types defined
- [ ] Error handling comprehensive
- [ ] Memory leaks prevented

**Testing:**

- [ ] Unit tests for compositor and mixer
- [ ] Integration test: full recording flow
- [ ] Browser compatibility tests (Chrome, Firefox, Edge)
- [ ] Performance testing on low-end devices
- [ ] Audio-video sync validation
- [ ] Playback test after upload

**Documentation:**

- [ ] Architecture decision documented (why Canvas over camera-only)
- [ ] Browser compatibility matrix
- [ ] Performance tuning guide
- [ ] Troubleshooting guide for permission issues

**Performance:**

- [ ] 30fps stable during recording
- [ ] CPU usage <30%
- [ ] Memory <500MB for 30-min session
- [ ] Audio-video sync drift <100ms

---

## Risks & Mitigations

| Risk                                  | Impact | Mitigation                                            |
| ------------------------------------- | ------ | ----------------------------------------------------- |
| Browser permission denial             | High   | Graceful fallback to camera-only; clear user guidance |
| Performance issues on low-end devices | Medium | Adaptive quality settings; frame rate reduction       |
| Audio-video sync drift                | High   | Regular sync checks; use single MediaRecorder source  |
| Canvas rendering overhead             | Medium | Optimize rendering; reduce unnecessary DOM updates    |
| Safari limited support                | Medium | Detect Safari; fall back to camera-only; warn user    |

---

## Success Metrics

- **Recording Completeness:** 100% of interviews include full UI context
- **Audio Quality:** Both AI and user speech clearly audible
- **Performance:** 95% of recordings maintain 30fps throughout
- **Completion Rate:** 98% of recordings successfully uploaded
- **User Satisfaction:** Reduced recruiter questions about missing context

---

## Future Enhancements

- Real-time recording preview (small thumbnail)
- Multi-camera support (switch between cameras)
- Recording editing (trim, annotate) before upload
- Live streaming to recruiter (optional monitoring)
- Recording highlights/bookmarks (flag important moments)

---

**Story Status:** Ready for Development  
**Assigned To:** TBD  
**Sprint:** TBD (After EP3-S12 completion)  
**Last Updated:** 2025-11-04
