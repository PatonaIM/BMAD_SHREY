# Epic 3: Interactive AI Interview System – User Stories

Source: `docs/prd.md` Epic 3. IDs EP3-S#.

**UPDATED for Simplified Candidate Flow:** Epic 3 now focuses on AI interview as score boosting mechanism, implementing step 10 where candidates can give AI interviews to boost their profile and application scores.

**IMPLEMENTATION APPROACH:** Epic 3 will start with a POC (EP3-S0) to establish reusable components and APIs, then proceed with feature stories building on that foundation.

---

## EP3-S0: AI Interview POC - Core Infrastructure (NEW - POC First)

As a developer,
I want to build a working POC of the AI interview system,
So that we validate the technical approach and create reusable components.

**Purpose:** Establish the technical foundation for AI interviews with OpenAI Realtime API, audio recording, Azure storage, and playback before building full user flows.

**Scope:** Minimal viable interview experience to prove:

1. OpenAI Realtime API integration works
2. Audio recording can be captured and stored
3. Interview sessions can be replayed
4. Basic question generation from job + resume context

### Acceptance Criteria:

**1. OpenAI Realtime API Integration:**

- Establish WebSocket connection to OpenAI Realtime API
- Send/receive audio streams in real-time
- Handle conversation turns (system speaks → user responds → repeat)
- Implement session management (start, pause, end)
- Basic error handling and reconnection logic

**2. Question Generation:**

- Service that takes job description + resume/profile
- Generates 5-8 interview questions using GPT-4
- Questions categorized by type: technical, behavioral, experience
- Questions stored with interview session

**3. Video Recording & Storage:**

- Capture user video + audio during interview (browser MediaRecorder API with Screen Capture API)
- Record webcam feed showing candidate during interview
- Record both user responses and AI questions
- Store complete interview recording as video file in Azure Blob Storage
- Generate unique session IDs for retrieval
- Store recording metadata (duration, timestamp, application context, video dimensions)
- Support for screen sharing if candidate wants to demo code/projects (optional POC feature)

**4. Interview Playback:**

- Retrieve video recording from Azure storage
- Video player component with timeline and controls
- Display questions alongside video (transcript sync)
- Show recording metadata (date, duration, job title, video quality)
- Picture-in-picture support for reviewing interviews

**5. Basic UI Components (Reusable):**

- `InterviewControls` - Start/Stop/Pause buttons
- `VideoPreview` - Show webcam preview before starting
- `AudioVisualizer` - Show audio levels during recording (candidate's voice)
- `AISpeakingAnimation` - Animated avatar/waveform when AI is speaking
- `InterviewPlayer` - Video playback component for completed interviews
- `InterviewQuestionCard` - Display question with context
- `InterviewStatus` - Connection status, time elapsed, question progress
- `CameraToggle` - Enable/disable camera during interview

**6. API Endpoints (Reusable):**

- `POST /api/interview/generate-questions` - Generate questions for job+candidate
- `POST /api/interview/start-session` - Initialize interview session
- `POST /api/interview/end-session` - Finalize and store interview
- `GET /api/interview/[sessionId]` - Retrieve interview details
- `GET /api/interview/recording/[sessionId]` - Get recording URL

**7. Dashboard Integration (POC):**

- Add "Take AI Interview" button to application page
- Simple interview launch flow (no scheduling yet)
- Display interview status on application page after completion
- Link to replay interview from application details

### Technical Implementation Details:

**OpenAI Realtime API Setup:**

```typescript
// Core realtime client wrapper
interface RealtimeInterviewSession {
  sessionId: string;
  jobId: string;
  applicationId: string;
  questions: InterviewQuestion[];
  startedAt: Date;
  endedAt?: Date;
  recordingUrl?: string;
  status: 'preparing' | 'active' | 'completed' | 'error';
}

interface InterviewQuestion {
  id: string;
  type: 'technical' | 'behavioral' | 'experience';
  question: string;
  context?: string; // Why this question was chosen
  askedAt?: Date;
  answeredAt?: Date;
}
```

**Audio Storage Strategy:**

```typescript
// Azure Blob Storage container: "interview-recordings"
// Path: {userId}/{applicationId}/{sessionId}/recording.webm (video with audio)
// Audio-only path (for OpenAI): {userId}/{applicationId}/{sessionId}/audio.webm
// Metadata stored in MongoDB with references
```

**WebRTC + WebSocket Architecture:**

```typescript
// Browser uses WebRTC to capture media
interface MediaStreamConfig {
  video: {
    width: { ideal: 1280 };
    height: { ideal: 720 };
    facingMode: 'user'; // Front camera
  };
  audio: {
    echoCancellation: true;
    noiseSuppression: true;
    sampleRate: 24000; // Match OpenAI Realtime API
  };
}

// Local recording via MediaRecorder (video+audio)
const mediaRecorder = new MediaRecorder(stream, {
  mimeType: 'video/webm;codecs=vp9,opus',
  videoBitsPerSecond: 2500000, // 2.5 Mbps
});

// Separate audio stream to OpenAI via WebSocket (audio only)
const audioContext = new AudioContext({ sampleRate: 24000 });
const audioStream = stream.getAudioTracks()[0];
// Convert to PCM16 and send to OpenAI Realtime API via WebSocket
```

**Interview Flow (POC):**

```
1. User clicks "Take AI Interview" on application page
2. System generates questions based on job + profile
3. WebSocket connection established to OpenAI Realtime
4. Recording starts automatically
5. AI asks questions one by one (~15 min total)
6. User responds naturally via voice
7. Recording saved to Azure on completion
8. Interview marked complete on application
9. User can replay from application page
```

### DoD:

**Core Services:**

- [x] OpenAI Realtime API client wrapper (`src/services/ai/realtimeInterview.ts`)
- [ ] Interview question generator service (`src/services/ai/interviewQuestions.ts`)
- [ ] Video recording manager with WebRTC (`src/services/media/videoRecordingManager.ts`)
- [ ] Audio extraction and format conversion (`src/services/media/audioProcessor.ts`)
- [ ] Azure storage service for recordings (extend existing `azureBlobStorage.ts`)
- [ ] Interview session repository (`src/data-access/repositories/interviewSessionRepo.ts`)
- [ ] WebSocket manager for OpenAI Realtime connection (`src/services/ai/realtimeWebSocket.ts`)

**API Routes:**

- [ ] `POST /api/interview/generate-questions` (job + candidate context)
- [ ] `POST /api/interview/start-session` (create session record)
- [ ] `POST /api/interview/realtime-token` (get OpenAI session token)
- [ ] `POST /api/interview/end-session` (save recording, finalize)
- [ ] `GET /api/interview/[sessionId]` (retrieve session details)
- [ ] `GET /api/interview/recording/[sessionId]` (get signed URL)

**UI Components:**

- [ ] `InterviewLauncher` - Entry point button on application page
- [ ] `InterviewInterface` - Main interview screen with video preview
- [ ] `VideoPreview` - Webcam preview with camera toggle
- [ ] `AudioVisualizer` - Real-time audio level display (candidate)
- [ ] `AISpeakingAnimation` - Animated visual when AI is speaking
- [ ] `InterviewPlayer` - Video playback component with timeline
- [ ] `InterviewQuestionList` - Display questions during/after interview
- [ ] `InterviewStatus` - Connection, timer, progress indicators
- [ ] `CameraPermissionCheck` - Request and verify camera/mic permissions

**Database Schema:**

```typescript
// InterviewSession collection
{
  _id: ObjectId,
  userId: string,
  applicationId: string,
  jobId: string,
  sessionId: string, // UUID for Azure storage path
  questions: InterviewQuestion[],
  videoRecordingUrl: string, // Azure Blob URL for video
  audioRecordingUrl?: string, // Separate audio if needed
  recordingPath: string, // Azure storage path
  duration: number, // seconds
  status: 'preparing' | 'active' | 'completed' | 'error',
  startedAt: Date,
  endedAt?: Date,
  metadata: {
    videoFormat: string, // 'video/webm'
    audioFormat: string, // 'audio/webm' or 'pcm16'
    videoResolution: string, // '1280x720'
    fileSize: number, // bytes
    transcriptAvailable: boolean,
    hasWebcam: boolean, // Whether video includes webcam
    hasScreenShare: boolean // Whether candidate shared screen
  }
}
```

**Testing:**

- [ ] Unit tests for question generator
- [ ] Integration test: Generate questions → Start session → Record → Store → Retrieve
- [ ] Manual test: Complete 15-min interview end-to-end
- [ ] Verify recording playback quality
- [ ] Test error scenarios (connection loss, storage failure)

**Documentation:**

- [ ] OpenAI Realtime API setup guide
- [ ] Audio recording architecture decisions
- [ ] Azure storage configuration for recordings
- [ ] Interview flow diagram
- [ ] Component reusability guide for future stories

### Success Metrics:

- ✅ Successfully complete 3 test interviews of 5+ minutes each
- ✅ Video recording playback works with acceptable quality (720p minimum)
- ✅ Audio quality sufficient for OpenAI speech recognition
- ✅ Questions generated are relevant to job description
- ✅ Latency <2s for AI responses during interview
- ✅ All recordings successfully stored and retrievable
- ✅ No memory leaks during 15-min recording sessions
- ✅ Interview status correctly updates on application page
- ✅ Video file size reasonable (<100MB for 15-min interview)

### Technical Architecture: WebRTC + WebSocket Integration

**Why We Need Both:**

1. **WebRTC (Browser → Local Recording)**
   - Purpose: Capture camera + microphone from browser
   - Output: MediaStream with video + audio tracks
   - Used for: Local video recording (MediaRecorder)
   - NOT sent directly to OpenAI (OpenAI Realtime API uses WebSocket, not WebRTC)

2. **WebSocket (Browser ↔ OpenAI Realtime API)**
   - Purpose: Real-time bidirectional audio streaming with OpenAI
   - Format: PCM16 24kHz mono audio (extracted from WebRTC stream)
   - Used for: AI conversation (questions + responses)
   - Low latency: <500ms for natural conversation

**Data Flow Diagram:**

```
┌─────────────────────────────────────────────────────────┐
│                    Browser (Client)                     │
├─────────────────────────────────────────────────────────┤
│                                                         │
│  [Webcam] ──┐                                          │
│             ├──> getUserMedia() ──> MediaStream        │
│  [Mic] ─────┘                           │              │
│                                         │              │
│                        ┌────────────────┼─────────┐    │
│                        │                │         │    │
│                        ▼                ▼         ▼    │
│                                                         │
│              MediaRecorder        AudioContext         │
│              (video+audio)        (audio only)         │
│                   │                    │               │
│                   │                    │               │
│                   ▼                    ▼               │
│                                                         │
│            Blob chunks           PCM16 buffer          │
│            (video/webm)          (24kHz mono)          │
│                   │                    │               │
└───────────────────┼────────────────────┼───────────────┘
                    │                    │
                    │                    │
                    ▼                    ▼

    ┌───────────────────┐      ┌──────────────────┐
    │   Azure Blob      │      │  OpenAI Realtime │
    │   Storage         │      │  API (WebSocket) │
    │                   │      │                  │
    │ Store video       │      │ Process audio    │
    │ recording         │      │ Generate speech  │
    │ for playback      │      │ Return responses │
    └───────────────────┘      └──────────────────┘
```

**Implementation Steps:**

```typescript
// 1. Request camera + microphone access (WebRTC)
const stream = await navigator.mediaDevices.getUserMedia({
  video: { width: 1280, height: 720 },
  audio: {
    echoCancellation: true,
    sampleRate: 24000,
  },
});

// 2. Start local video recording
const mediaRecorder = new MediaRecorder(stream, {
  mimeType: 'video/webm;codecs=vp9,opus',
});
mediaRecorder.start(); // Records to chunks for Azure upload

// 3. Extract audio for OpenAI (separate processing)
const audioContext = new AudioContext({ sampleRate: 24000 });
const source = audioContext.createMediaStreamSource(stream);
const processor = audioContext.createScriptProcessor(4096, 1, 1);

processor.onaudioprocess = e => {
  // Convert Float32Array to PCM16
  const pcm16 = convertToPCM16(e.inputBuffer.getChannelData(0));

  // Send to OpenAI via WebSocket
  websocket.send(pcm16);
};

// 4. WebSocket connection to OpenAI Realtime API
const websocket = new WebSocket('wss://api.openai.com/v1/realtime');

websocket.onopen = () => {
  // Initialize session with interview context
  websocket.send(
    JSON.stringify({
      type: 'session.update',
      session: {
        instructions: 'You are conducting a job interview...',
        voice: 'alloy',
        input_audio_format: 'pcm16',
        output_audio_format: 'pcm16',
      },
    })
  );
};

websocket.onmessage = event => {
  // Receive AI audio response (PCM16)
  const audioData = event.data;

  // Play in browser (convert PCM16 back to playable format)
  playAudioResponse(audioData);
};

// 5. On interview end
mediaRecorder.stop();
mediaRecorder.ondataavailable = event => {
  // Upload video blob to Azure
  uploadToAzure(event.data, sessionId);
};
websocket.close();
```

**Key Technical Points:**

1. **No Direct WebRTC ↔ OpenAI Connection**
   - WebRTC only for local browser media capture
   - OpenAI Realtime API requires WebSocket with specific format
   - We bridge the two by extracting audio from WebRTC stream

2. **Dual Recording Strategy**
   - Video recording: MediaRecorder → Azure (for playback)
   - Audio streaming: AudioContext → PCM16 → WebSocket → OpenAI (for AI)

3. **Audio Format Conversion**
   - WebRTC captures: Opus codec in WebM container
   - OpenAI requires: PCM16 24kHz mono (raw audio samples)
   - Use Web Audio API (AudioContext) to convert in real-time

4. **Bandwidth Considerations**
   - Video recording: ~2.5 Mbps (local, then uploaded)
   - Audio to OpenAI: ~384 Kbps (PCM16 24kHz)
   - AI responses: ~384 Kbps (PCM16 24kHz back)

5. **Browser Compatibility**
   - WebRTC getUserMedia: Chrome, Firefox, Safari, Edge (all modern)
   - MediaRecorder: Widely supported (fallback for older browsers)
   - WebSocket: Universal support

**Technical Decisions to Document:**

- Video format choice (WebM/VP9 vs MP4/H.264)
- Audio format for OpenAI (PCM16 24kHz mono)
- Video recording resolution and bitrate
- OpenAI Realtime API session management approach
- Recording chunking strategy (stream vs full file)
- Transcript generation timing (real-time vs post-processing)
- Error recovery mechanisms
- WebRTC getUserMedia configuration
- Audio processing pipeline (WebRTC → AudioContext → PCM16 → WebSocket)
- AI speaking animation style (waveform vs avatar vs orb)

### AI Speaking Animation Component

**Purpose:** Provide visual feedback when the AI interviewer is speaking to create a more natural, engaging conversation experience.

**Animation Options (Choose one for POC):**

1. **Animated Waveform (Recommended for POC)**
   - Simple, clean design
   - Bars that pulse/animate with AI speech
   - Inspired by Siri/Google Assistant
   - Easy to implement with CSS/Canvas

2. **Pulsing Orb/Circle**
   - Circular shape that expands/contracts
   - Glowing effect when speaking
   - Minimal and modern
   - Pure CSS animation

3. **Avatar with Lip Sync (Future Enhancement)**
   - D-ID or similar AI avatar
   - Realistic talking head
   - More complex integration
   - Higher resource usage

**Recommended: Animated Waveform Implementation**

```typescript
interface AISpeakingAnimationProps {
  isAISpeaking: boolean; // Toggle animation on/off
  audioLevel?: number; // 0-1, intensity of animation
  variant?: 'waveform' | 'orb' | 'minimal'; // Animation style
  color?: string; // Theme color
}

// Component behavior:
// - Animates when AI is speaking (isAISpeaking = true)
// - Idle state when candidate is speaking
// - Can sync with actual audio levels from OpenAI response
```

**Visual Design (Waveform):**

```
When AI is speaking:
┌─────────────────────────────┐
│                             │
│   🤖 AI Interviewer         │
│                             │
│   ║  ║║ ║ ║║║ ║ ║║ ║       │  <- Animated bars
│   ╚══╩╩═╩═╩╩╩═╩═╩╩═╩       │     pulsing up/down
│                             │
│   "Tell me about your       │
│    experience with React"   │
│                             │
└─────────────────────────────┘

When candidate is speaking:
┌─────────────────────────────┐
│                             │
│   🤖 AI Interviewer         │
│                             │
│   ─  ─  ─  ─  ─  ─  ─      │  <- Flat/idle state
│   ══════════════════        │
│                             │
│   [Listening...]            │
│                             │
└─────────────────────────────┘
```

**Implementation Approach:**

```typescript
// 1. Detect when AI is speaking (from WebSocket events)
websocket.onmessage = (event) => {
  const message = JSON.parse(event.data);

  if (message.type === 'response.audio.delta') {
    // AI is sending audio = AI is speaking
    setIsAISpeaking(true);

    // Optionally: analyze audio data for levels
    const audioLevel = calculateAudioLevel(message.audio);
    setAudioLevel(audioLevel);
  }

  if (message.type === 'response.audio.done') {
    // AI finished speaking
    setIsAISpeaking(false);
  }

  if (message.type === 'input_audio_buffer.speech_started') {
    // Candidate started speaking
    setIsAISpeaking(false);
  }
};

// 2. AISpeakingAnimation component
export function AISpeakingAnimation({
  isAISpeaking,
  audioLevel = 0.5
}: AISpeakingAnimationProps) {
  return (
    <div className="ai-avatar-container">
      <div className="ai-icon">🤖</div>

      <div className="waveform">
        {[...Array(7)].map((_, i) => (
          <div
            key={i}
            className={`wave-bar ${isAISpeaking ? 'active' : 'idle'}`}
            style={{
              animationDelay: `${i * 0.1}s`,
              height: isAISpeaking
                ? `${20 + audioLevel * 60 + Math.random() * 20}%`
                : '10%'
            }}
          />
        ))}
      </div>

      <div className="status-text">
        {isAISpeaking ? 'Speaking...' : 'Listening...'}
      </div>
    </div>
  );
}

// 3. CSS Animation
.wave-bar {
  width: 4px;
  background: linear-gradient(180deg, #3b82f6, #8b5cf6);
  border-radius: 2px;
  transition: height 0.1s ease;
}

.wave-bar.active {
  animation: pulse 0.8s ease-in-out infinite;
}

@keyframes pulse {
  0%, 100% { height: 20%; }
  50% { height: 80%; }
}

.wave-bar.idle {
  height: 10%;
  opacity: 0.3;
}
```

**State Management:**

```typescript
// Interview state includes AI speaking status
interface InterviewState {
  isAISpeaking: boolean;
  isCandidateSpeaking: boolean;
  currentQuestion: string;
  aiAudioLevel: number; // For animation intensity
  candidateAudioLevel: number; // For candidate visualizer
}

// Update states based on OpenAI Realtime events
const handleRealtimeEvent = (event: RealtimeEvent) => {
  switch (event.type) {
    case 'response.audio.delta':
      setInterviewState(prev => ({
        ...prev,
        isAISpeaking: true,
        aiAudioLevel: calculateLevel(event.audio),
      }));
      break;

    case 'response.audio.done':
      setInterviewState(prev => ({
        ...prev,
        isAISpeaking: false,
      }));
      break;

    case 'input_audio_buffer.speech_started':
      setInterviewState(prev => ({
        ...prev,
        isCandidateSpeaking: true,
        isAISpeaking: false, // AI stops when candidate speaks
      }));
      break;

    case 'input_audio_buffer.speech_stopped':
      setInterviewState(prev => ({
        ...prev,
        isCandidateSpeaking: false,
      }));
      break;
  }
};
```

**Interview Screen Layout with Animation:**

```
┌──────────────────────────────────────────────────┐
│  AI Interview - Senior React Developer          │
├──────────────────────────────────────────────────┤
│                                                  │
│  ┌────────────────┐  ┌────────────────────────┐ │
│  │                │  │  🤖 AI Interviewer     │ │
│  │   [Webcam]     │  │                        │ │
│  │   Preview      │  │  ║ ║║║ ║ ║║ ║║ ║      │ │  <- Animated
│  │   (You)        │  │  ╚═╩╩╩═╩═╩╩═╩╩═╩      │ │     when speaking
│  │                │  │                        │ │
│  │                │  │  Speaking...           │ │
│  └────────────────┘  └────────────────────────┘ │
│                                                  │
│  ┌────────────────────────────────────────────┐ │
│  │  Question 3 of 7                           │ │
│  │                                            │ │
│  │  "Can you describe a challenging React    │ │
│  │   project you worked on and how you       │ │
│  │   overcame technical obstacles?"          │ │
│  └────────────────────────────────────────────┘ │
│                                                  │
│  [Your Audio] ▓▓░░░░░░░░░░░░  🔴 Recording     │  <- Your mic levels
│                                                  │
│  ⏱️ 08:32 elapsed  •  ~6 mins remaining         │
│                                                  │
│  [Pause]  [End Interview]                       │
│                                                  │
└──────────────────────────────────────────────────┘
```

**User Experience Benefits:**

1. **Clear Turn-Taking:** Users know when to speak vs when to listen
2. **Engagement:** Visual feedback keeps user engaged during AI speaking
3. **Professional Feel:** Mimics professional video conferencing tools
4. **Reduced Confusion:** No awkward silences wondering if AI is done
5. **Accessibility:** Visual indicator supplements audio for hearing impaired

**Performance Considerations:**

- Use CSS animations over JavaScript for smooth 60fps
- RequestAnimationFrame for audio-reactive animations
- Lightweight component (<5KB)
- No heavy libraries needed
- Works on mobile devices

**Testing:**

- [ ] Animation smoothness (60fps target)
- [ ] State transitions (AI speaking → listening → candidate speaking)
- [ ] Audio level synchronization accuracy
- [ ] Mobile performance (iOS/Android)
- [ ] Accessibility (screen readers announce state changes)
- [ ] Theme compatibility (light/dark mode)

---

## EP3-S1 Job Application System

As a job seeker,
I want to apply and get an initial score,
So that I understand baseline fit.

**Flow Position:** Step 6-7 - Application submission, score generation, redirect to dashboard.

**ENHANCED:** Post-application flow now provides immediate guidance based on score.

Acceptance Criteria:

- Apply creates application record + score
- Duplicate prevention
- Optional cover letter & extras
- Email confirmation (stub acceptable)
- **NEW:** Calculate match score immediately on submission
- **NEW:** Show post-application modal with score and next steps
- **NEW:** If score 60-85%: Show "Boost with AI Interview" CTA
- **NEW:** If score <60%: Show "Improve Profile" recommendations
- **NEW:** If score >85%: Show "Strong Match!" encouragement
- **NEW:** Redirect to dashboard after modal dismissed
- **NEW:** Store application in timeline with initial score

DoD:

- [ ] Application schema
- [ ] Apply endpoint + tests
- [ ] Duplicate guard logic
- [ ] **NEW:** Post-application modal component (PostApplicationModal)
- [ ] **NEW:** Score threshold logic (60%, 85% breakpoints)
- [ ] **NEW:** AI interview invitation flow
- [ ] **NEW:** Profile improvement recommendations generator
- [ ] **NEW:** Dashboard redirect with success toast

## EP3-S2 AI Interview Scheduling & Setup

As a job seeker,
I want to schedule or start an AI interview,
So that I can boost my score.

**Flow Position:** Step 10 - Candidate can give AI interview to boost profile.

**ENHANCED:** Interview now accessible from multiple entry points with clear value proposition.

Acceptance Criteria:

- Immediate start or schedule
- Prep guide + environment check
- Reminder stub
- Reschedule/cancel within rules
- **NEW:** Accessible from dashboard quick actions ("Take AI Interview")
- **NEW:** Accessible from application detail page ("Boost This Application")
- **NEW:** Accessible from post-application modal (for 60-85% scores)
- **NEW:** Show potential score boost estimate (e.g., "Could boost score by 5-15 points")
- **NEW:** Display interview preparation tips and expected questions topics
- **NEW:** Environment check: microphone, internet speed, browser compatibility
- **NEW:** Practice mode option (no score impact, just practice)

DoD:

- [ ] Scheduling model
- [ ] Environment diagnostic utility
- [ ] Reminder service placeholder
- [ ] **NEW:** AIInterviewCard component (dashboard widget)
- [ ] **NEW:** ScheduleInterviewModal component
- [ ] **NEW:** Score boost estimator algorithm
- [ ] **NEW:** Preparation guide content (markdown)
- [ ] **NEW:** Environment check utility (WebRTC test)
- [ ] **NEW:** Practice mode toggle + flag

## EP3-S3 Dynamic Interview Question Generation

As a system,
I want tailored interview questions,
So that assessment is relevant.

Acceptance Criteria:

- 8–12 questions generated with balance (technical vs communication)
- Difficulty calibrates to candidate & role
- Fallback static bank

DoD:

- [ ] Question generator module
- [ ] Fallback bank JSON
- [ ] Difficulty calibration tests

## EP3-S4 Real-time AI Interview Interface

As a job seeker,
I want a natural voice AI interview experience,
So that I can demonstrate my skills conversationally.

**UPDATED for OpenAI Realtime API:** Uses OpenAI's Realtime API for natural conversational interviews with <500ms latency, recording the full 15-minute session.

### Acceptance Criteria:

**Interview Experience:**

- Natural conversational flow using OpenAI Realtime API
- AI interviewer asks questions one at a time
- Candidate responds via voice naturally (no "push to talk")
- AI acknowledges responses and transitions smoothly
- Total interview duration: ~15 minutes
- 5-8 questions covering technical + behavioral aspects
- Real-time audio streaming with <500ms latency
- Natural pauses and follow-up questions based on responses

**Recording Capabilities:**

- Full interview audio recorded from start to finish
- Capture both AI questions and candidate responses
- Store complete recording as single audio file
- Generate transcript during or after interview
- Recording automatically saved to Azure Blob Storage on completion
- Recording metadata includes: duration, timestamp, application context

**UI Components:**

- Clean, minimal interview interface (no distractions)
- Current question displayed as text
- Audio level visualizer (showing candidate is being heard)
- Timer showing elapsed time and estimated remaining time
- Current question number (e.g., "Question 3 of 7")
- Pause/Resume capability
- Emergency "End Interview" button with confirmation
- Connection status indicator
- Microphone permission and testing before start

**Error Handling:**

- Connection loss detection with auto-reconnect
- Audio quality warnings (if mic issues detected)
- Graceful degradation if Realtime API fails
- Save progress if interview interrupted
- Clear error messages with recovery options

**Technical Requirements:**

- WebRTC audio capture from browser
- WebSocket connection to OpenAI Realtime API
- Audio streaming in required format (PCM16 24kHz mono)
- Local audio buffering for recording
- Background upload to Azure storage
- Session management (keep-alive, reconnection)

### DoD:

**Core Services:**

- [ ] OpenAI Realtime API WebSocket client (`realtimeClient.ts`)
- [ ] Audio stream manager (capture + format conversion)
- [ ] Recording buffer and storage service
- [ ] Session state manager (questions, responses, timing)
- [ ] Interview flow controller (question progression)
- [ ] Azure storage uploader for recordings

**UI Components:**

- [ ] `InterviewInterface` - Main interview screen
- [ ] `AudioVisualizer` - Real-time audio level display
- [ ] `InterviewControls` - Pause/Resume/End buttons
- [ ] `QuestionDisplay` - Current question with context
- [ ] `InterviewTimer` - Elapsed time and progress
- [ ] `ConnectionStatus` - WebSocket status indicator
- [ ] `MicrophoneTest` - Pre-interview audio check

**API Routes:**

- [ ] `POST /api/interview/realtime/init` - Get Realtime API session token
- [ ] `POST /api/interview/realtime/session` - Start interview session
- [ ] `POST /api/interview/realtime/upload` - Upload recording chunks
- [ ] `POST /api/interview/realtime/finalize` - Complete and finalize

**Interview Flow Implementation:**

```typescript
// Interview flow controller
const interviewFlow = {
  1. Initialize Realtime session with OpenAI
  2. Load generated questions for this job
  3. Start audio recording
  4. For each question:
     - AI speaks question
     - Wait for candidate response (auto-detect pause)
     - AI acknowledges ("Great, let me ask you about...")
     - Move to next question
  5. After all questions:
     - AI thanks candidate
     - Stop recording
     - Upload to Azure
     - Update application status
  6. Show completion screen with next steps
}
```

**OpenAI Realtime API Integration:**

```typescript
interface RealtimeSession {
  // Initialize with system prompt
  systemMessage: string; // "You are conducting a job interview..."

  // Interview context
  context: {
    jobTitle: string;
    companyName: string;
    questions: InterviewQuestion[];
    candidateName: string;
  };

  // Audio settings
  audio: {
    inputFormat: 'pcm16';
    outputFormat: 'pcm16';
    sampleRate: 24000;
  };

  // Conversation config
  turnDetection: {
    type: 'server_vad'; // Voice Activity Detection
    threshold: 0.5;
    silenceDuration: 800; // ms of silence = end of turn
  };
}
```

**Recording Storage:**

- Azure Blob container: `interview-recordings`
- Path structure: `{userId}/{applicationId}/{sessionId}/recording.webm`
- Metadata stored in MongoDB:

```typescript
{
  recordingUrl: string;
  duration: number; // seconds
  fileSize: number; // bytes
  format: 'webm' | 'mp3';
  transcript?: string;
  uploadedAt: Date;
}
```

**Testing:**

- [ ] Unit tests for Realtime client connection management
- [ ] Integration test: Complete 15-min interview end-to-end
- [ ] Audio quality verification (playback test)
- [ ] Connection resilience test (simulate disconnection)
- [ ] Latency measurement (<500ms requirement)
- [ ] Browser compatibility (Chrome, Firefox, Safari, Edge)
- [ ] Mobile device testing (responsive + microphone)
- [ ] Recording file integrity verification
- [ ] Concurrent interview sessions test (multiple users)

**Performance Targets:**

- Audio latency: <500ms (Realtime API)
- WebSocket connection stability: >99.5% uptime during interview
- Recording upload success rate: >99%
- Interview completion rate: >95% (no technical failures)
- Audio quality: Clear speech recognition
- Memory usage: <200MB for 15-min session

**User Experience Flow:**

```
1. Click "Take AI Interview" → Loading screen
2. Microphone test → "Your audio is clear ✓"
3. Brief intro screen → "The interview will take ~15 minutes"
4. Countdown: 3, 2, 1...
5. Interview starts → AI: "Hi [Name], thanks for joining..."
6. Questions flow naturally with AI acknowledgments
7. Visual feedback (audio bars, timer, question number)
8. Interview ends → "Thank you for your time!"
9. "Processing your interview..." (upload to Azure)
10. Redirect to application page with success message
```

**Accessibility:**

- Keyboard shortcuts (Space = pause/resume, Esc = end)
- Screen reader announcements for status changes
- High contrast mode support
- Font size adjustable
- Audio level visual indicators for hearing impaired
- Transcript available for review after completion

## EP3-S5 AI Interview Scoring & Analysis

As a system,
I want to score responses (technical & communication),
So that performance gains are quantified.

Acceptance Criteria:

- Weighting 60/40 applied
- Per-question score breakdown
- Boost calculation (5–15 points)
- Completion <30s after interview end

DoD:

- [ ] Scoring algorithm module
- [ ] Boost calculator tests
- [ ] Timing benchmark

## EP3-S6 Interview Results & Feedback

As a job seeker,
I want detailed feedback & replay,
So that I can improve.

Acceptance Criteria:

- Overall + component scores
- Question breakdown + suggestions
- Replay & transcript
- Benchmark comparison

DoD:

- [ ] Results endpoint
- [ ] Feedback generator stub
- [ ] Replay UI placeholder

## EP3-S7 Application Status Integration

As a job seeker,
I want interview impact reflected in application,
So that progress is visible.

**Flow Position:** Step 10-11 - Interview completion updates application and shows new score.

**ENHANCED:** Clear before/after score visualization with celebration.

Acceptance Criteria:

- Status update to AI Interview Complete
- Timeline entry logged
- Dashboard updates immediately
- **NEW:** Show before/after score comparison
- **NEW:** Display score boost amount (e.g., "+12 points")
- **NEW:** Celebration UI (confetti, success animation)
- **NEW:** Update application card badge to show "Interview Complete"
- **NEW:** Add interview recording link to application detail
- **NEW:** Show updated position in match ranking (if applicable)
- **NEW:** Notify recruiter of interview completion (future)

DoD:

- [ ] Status transition logic
- [ ] Timeline event store
- [ ] UI refresh tests
- [ ] **NEW:** ScoreComparisonModal component (before/after)
- [ ] **NEW:** Celebration animation (confetti.js or similar)
- [ ] **NEW:** Application badge update logic
- [ ] **NEW:** Interview recording link storage
- [ ] **NEW:** Match ranking recalculation
- [ ] **NEW:** Recruiter notification stub (email/webhook)

## EP3-S8 Interview Recording & Recruiter Access

As a recruiter,
I want secure access to recordings & AI assessments,
So that I can validate scores.

Acceptance Criteria:

- Auth-protected retrieval
- Transcript + summary view
- Notes/annotations
- Audit logging of access

DoD:

- [ ] Recording access endpoint
- [ ] Annotation model
- [ ] Audit hook integration

---

Epic 3 ready when real-time latency tracked and scoring verified.

---

## EP3-S9: Post-Application Score Guidance (NEW - Simplified Flow)

As a job seeker,
I want immediate feedback after applying,
So that I know if I should take additional actions.

**Flow Position:** Step 7 - Post-application, system redirects to dashboard with guidance.

**Purpose:** Provides contextual next steps based on match score, driving candidates toward profile completion or AI interview.

Acceptance Criteria:

- After application submission, calculate match score immediately
- Display modal with score and personalized message:
  - **<60% (Weak Match):**
    - Title: "Improve Your Profile to Boost This Application"
    - Message: "Your profile is missing key skills. Complete these sections to improve your match:"
    - Actions: "Complete Profile", "View Missing Skills", "Continue to Dashboard"
  - **60-85% (Good Match):**
    - Title: "Good Match! Boost Your Score with AI Interview"
    - Message: "You're a good fit for this role. Take a 15-minute AI interview to increase your score by 5-15 points."
    - Actions: "Schedule AI Interview", "Continue to Dashboard"
  - **>85% (Excellent Match):**
    - Title: "Excellent Match!"
    - Message: "Your profile strongly aligns with this role. We'll notify you as your application progresses."
    - Actions: "View Application", "Browse More Jobs"
- Modal includes:
  - Match score badge with color coding
  - Component breakdown (skills, experience, semantic match)
  - Timeline estimate ("Typically reviewed within 3-5 days")
- Auto-dismiss after 10 seconds or user action
- Redirect to dashboard after dismissal

DoD:

- [ ] PostApplicationModal component with score-based content
- [ ] Score threshold logic (60%, 85% breakpoints)
- [ ] Message content templates for each score band
- [ ] Score breakdown visualization (mini chart/bars)
- [ ] Action button routing (to profile, AI interview, dashboard)
- [ ] Auto-dismiss timer with progress indicator
- [ ] Modal responsive design (mobile, desktop)
- [ ] Unit tests for score threshold logic
- [ ] Integration test for application flow
- [ ] Analytics tracking (modal shown, action taken)

**Modal Wireframe:**

```
┌──────────────────────────────────────────┐
│  ✓ Application Submitted                 │
├──────────────────────────────────────────┤
│                                          │
│     🎯 Match Score: 72%                  │
│     [━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━] │
│                                          │
│  Good Match! Boost Your Score            │
│  with AI Interview                       │
│                                          │
│  Your skills align well with this role.  │
│  Take a 15-min AI interview to boost     │
│  your score by up to 15 points.          │
│                                          │
│  Skills: 78% | Experience: 65%           │
│  Semantic: 73%                           │
│                                          │
│  [Schedule AI Interview]  [Dashboard]    │
│                                          │
│  Auto-closing in 8s...                   │
└──────────────────────────────────────────┘
```

---

## EP3-S10: AI Interview Dashboard Integration (NEW - Simplified Flow)

As a job seeker,
I want to see my top-matched jobs on the dashboard and easily access AI interviews,
So that I can boost my best opportunities.

**Flow Position:** Step 10 - Dashboard provides clear path to AI interview for top matches.

**Purpose:** Surface highest-scoring applications and make AI interview prominent as key score improvement action.

**UPDATED FLOW:**

1. Dashboard "Quick Picks" section shows top 3-5 jobs where candidate has highest match scores
2. Each job card displays match score badge
3. Clicking job card navigates to application detail page
4. Application page shows "Take AI Interview to Boost Score" prominent CTA
5. Interview completion updates application page with recording link

### Acceptance Criteria:

**Dashboard Quick Picks Section:**

- Show top 5 jobs sorted by match score (highest first)
- Only show jobs where match score >50%
- Display match score badge with color coding
- Show job title, company, location, match percentage
- "View Application" button navigates to `/applications/[id]`
- If no applications exist, show "Browse Jobs" CTA
- Update in real-time when new application created

**Application Detail Page Enhancements:**

- Add "Take AI Interview" prominent button if:
  - Match score between 50-89%
  - No interview completed yet
  - Application status is "submitted" or "under review"
- Button shows potential score boost ("Boost by up to 15 points")
- If interview already completed:
  - Show interview completion badge
  - Display before/after score comparison
  - Show "Rewatch Interview" button with recording player
  - Show interview date and duration
- Interview status section shows:
  - "Interview Not Started" | "Interview Completed" | "Interview Scheduled"
  - Recording player (if completed)
  - Transcript preview (if available)

**Interview Recording Display:**

- Embedded audio player with timeline
- Question markers on timeline (click to jump)
- Transcript panel (expandable)
- Metadata: Date completed, duration, questions answered
- Download recording option
- Share with recruiter option (future)

DoD:

**Dashboard Updates:**

- [ ] QuickPicksWidget component showing top jobs by score
- [ ] Sort and filter logic for highest matches
- [ ] Empty state ("No applications yet")
- [ ] Link to application detail page
- [ ] Real-time updates when applications/scores change

**Application Page Updates:**

- [ ] "Take AI Interview" CTA button (conditional rendering)
- [ ] Score boost estimator display
- [ ] Interview status section
- [ ] Interview completion badge
- [ ] Before/after score comparison UI
- [ ] Recording player integration
- [ ] Transcript display component
- [ ] Interview metadata display

**Components (Reusable):**

- [ ] `QuickPicksWidget` - Dashboard top matches
- [ ] `AIInterviewCTA` - Call-to-action button with boost estimate
- [ ] `InterviewStatusCard` - Status display on application page
- [ ] `InterviewRecordingPlayer` - Audio playback with timeline
- [ ] `InterviewTranscript` - Scrollable transcript with timestamps
- [ ] `ScoreComparisonBadge` - Before/after score display

**Database Schema Updates:**

```typescript
// Application schema enhancement
{
  // ... existing fields
  interviewSessionId?: string, // Link to InterviewSession
  interviewStatus: 'not_started' | 'completed' | 'scheduled',
  interviewCompletedAt?: Date,
  scoreBeforeInterview?: number,
  scoreAfterInterview?: number,
  scoreBoosted?: number // Calculated: after - before
}
```

**API Endpoints:**

- [ ] `GET /api/applications/top-matches` - Get highest scoring applications
- [ ] `GET /api/applications/[id]/interview-status` - Check interview eligibility
- [ ] `POST /api/applications/[id]/start-interview` - Launch interview for application

**Testing:**

- [ ] Unit tests for top matches sorting logic
- [ ] Unit tests for interview eligibility rules
- [ ] Integration test: Complete interview → Application page updates
- [ ] Manual test: Navigate dashboard → application → take interview → replay
- [ ] Responsive design testing (mobile, tablet, desktop)

**Dashboard Quick Picks Section Wireframe:**

```
┌────────────────────────────────────────────────┐
│  � Your Top Matches - Apply Now!             │
├────────────────────────────────────────────────┤
│                                                │
│  ┌──────────────────────────────────────────┐ │
│  │ Senior React Developer                   │ │
│  │ TechCorp Inc. • Remote                   │ │
│  │ Match: 87% 🟢  Applied 2 days ago        │ │
│  │ [View Application]                       │ │
│  └──────────────────────────────────────────┘ │
│                                                │
│  ┌──────────────────────────────────────────┐ │
│  │ Full Stack Engineer                      │ │
│  │ StartupXYZ • San Francisco               │ │
│  │ Match: 78% 🟡  Applied 5 days ago        │ │
│  │ [View Application] [Boost Score]         │ │
│  └──────────────────────────────────────────┘ │
│                                                │
│  ┌──────────────────────────────────────────┐ │
│  │ Backend Developer                        │ │
│  │ MegaCorp • New York                      │ │
│  │ Match: 72% 🟡  Applied 1 week ago        │ │
│  │ [View Application] [Boost Score]         │ │
│  └──────────────────────────────────────────┘ │
│                                                │
└────────────────────────────────────────────────┘
```

**Application Page Interview Section Wireframe:**

```
┌────────────────────────────────────────────────┐
│  Application: Senior React Developer          │
│  TechCorp Inc. • Match: 78%                   │
├────────────────────────────────────────────────┤
│                                                │
│  🎤 Boost Your Application Score              │
│  ┌──────────────────────────────────────────┐ │
│  │                                          │ │
│  │  Take a 15-minute AI interview to        │ │
│  │  improve your match score by up to       │ │
│  │  15 points.                              │ │
│  │                                          │ │
│  │  Current Score: 78%                      │ │
│  │  Potential Score: 85-93%                 │ │
│  │                                          │ │
│  │  [Take AI Interview Now]                │ │
│  │                                          │ │
│  └──────────────────────────────────────────┘ │
│                                                │
│  --- OR if interview completed ---            │
│                                                │
│  ✅ Interview Completed                       │
│  ┌──────────────────────────────────────────┐ │
│  │  Score Boost: +12 points 🎉              │ │
│  │  Before: 78% → After: 90%                │ │
│  │                                          │ │
│  │  Interview Date: Oct 28, 2025            │ │
│  │  Duration: 14:32                         │ │
│  │                                          │ │
│  │  [▶ Rewatch Interview] [View Transcript]│ │
│  │                                          │ │
│  └──────────────────────────────────────────┘ │
│                                                │
└────────────────────────────────────────────────┘
```

---

Epic 3 stories complete when all DoD items verified and AI interview flow tested end-to-end.

## EP3-S11: Real-Time Interview Experience Enhancements (NEW)

As a job seeker,
I want a polished, reliable, and transparent real-time AI interview experience,
So that I can focus on answering naturally while trusting system stability and quality.

**Purpose:** Build on the POC foundation (EP3-S0 / EP3-S4) by adding the essential UX, reliability, observability, and configurability improvements identified during initial testing (gibberish audio fix, sequential scheduling, permissions stability). This story consolidates post-POC enhancement backlog items into one cohesive delivery.

### Enhancement Areas & Acceptance Criteria

**1. Live Transcript Rendering**

- Stream partial transcript (`response.audio_transcript.delta`) in near real-time
- Replace with final segment on `response.audio_transcript.done`
- Scroll behavior: auto-scroll only when user not manually viewing older lines
- Accessibility: transcript container marked `aria-live="polite"`
- Toggle to hide/show transcript

**2. Voice Selection & Session Prefs**

- Pre-interview selection of voice: alloy | echo | shimmer
- Persist chosen voice via initial `session.update`
- Display selected voice during interview
- Defaults to alloy if user makes no choice

**3. Turn-Taking Indicators**

- Distinct UI states: AI Speaking, Listening, User Speaking
- User speaking state triggered by `input_audio_buffer.speech_started`
- AI speaking state triggered by first `response.audio.delta` until `response.audio.done`
- Visual indicator + textual label updated within <150ms of event receipt

**4. Error & Reconnect UX**

- Non-disruptive toast for transient disconnect with auto-retry countdown
- Manual "Retry Now" button if auto-retries exhausted (>=3 failed attempts)
- Clear messaging for token expiration vs network failure
- Post-reconnect: interview state (question index, transcript) preserved

**5. Latency Metrics Visibility**

- Measure and log per-response latency: `response.created` → first audio delta arrival
- Display rolling average + last response latency in hidden dev panel (toggle key: e.g., Ctrl+Alt+L)
- Store metrics for final session summary (not persisted yet)

**6. Ephemeral Token Lifecycle Management**

- Detect token age & proactively refresh before expiry (T-60s)
- Seamless WebSocket handoff without user intervention (pause input capture <2s)
- Retry refresh once on failure; surface error if second attempt fails

**7. Audio Quality Smoothing (Jitter Buffer & Crossfade)**

- Buffer small set (2–3) of incoming PCM16 chunks before scheduling
- Apply 10–15ms crossfade between adjacent chunks to reduce clicks
- No perceptible added latency (>50ms budget)
- Provide feature flag to disable if issues encountered

**8. Playback Cursor Management**

- Reset playback cursor to `audioContext.currentTime` on `response.audio.done` if drift >250ms
- Log drift corrections to latency panel (dev only)

**9. Foundational Automated Tests**

- Unit: session config key transform (camelCase → snake_case)
- Unit: reconnection attempt logic (max attempts honored)
- Unit: transcript buffer assembly (delta + done replacement)
- Unit: latency calculator (edge cases: missing timestamps)
- Mock WebSocket event dispatch test for handler routing

**10. Structured Logging & Observability**

- Introduce lightweight logger with levels (info|warn|error|debug) and context (sessionId, eventType)
- Replace ad-hoc `console.debug` usages (retain debug in dev only)
- Export final session summary JSON (latency stats, response count, average chunk size)

**11. Basic Analytics Hooks**

- Track counts: responsesGenerated, userTurns, avgUserTurnDuration, interruptions
- Provide `window.__interviewAnalytics` read-only snapshot for later EP3-S5 scoring integration

**12. Graceful Cleanup & Page Unload Handling**

- `beforeunload` listener flushes pending audio queue & marks session as `abandoned` if mid-interview
- Avoid blocking dialog unless recording upload in-flight

**13. Microphone & Backpressure Safeguards**

- Monitor outbound audio queue length; if > threshold (e.g., 50 chunks) temporarily stop capture & display warning
- Resume automatically when queue drains below threshold

### Non-Goals (Explicit for Scope Control)

- Full scoring pipeline (EP3-S5)
- Recruiter access features (EP3-S8)
- Application score recalculation integration (EP3-S7)
- Avatar lip-sync or advanced AI persona configuration

### DoD Checklist

- [ ] Transcript component renders real-time & final text replacements
- [ ] Voice selector integrated & persists chosen voice
- [ ] Turn-taking UI states tested with simulated events
- [ ] Reconnect UX covers token expiry & network failure
- [ ] Latency metrics collected & visible in dev panel
- [ ] Token refresh occurs before expiry without user disruption
- [ ] Jitter buffer + crossfade implemented behind feature flag
- [ ] Playback cursor drift correction functioning
- [ ] Core unit tests passing (≥5 new tests)
- [ ] Structured logger replaces previous direct console usage (except critical error fallback)
- [ ] Analytics snapshot object populated at end of interview
- [ ] Unload handler safely cleans resources
- [ ] Backpressure logic pauses & resumes mic capture as specified
- [ ] Documentation section added to Epic or separate markdown summarizing enhancements & toggles

### Success Metrics

- Transcript latency: <800ms from speech end to final segment render
- Response audio start latency mean: <1.2s (stretch <900ms)
- Token refresh success rate: 100% during >15 min test sessions
- Audio artifact (click/pop) occurrences: <1 per response (observational)
- Reconnect recovery time (network drop): <5s without user action
- Zero overlapping AI audio sources during test runs
- All new unit tests green in CI

### Implementation Notes

- Feature flags stored in a simple in-memory config for now (`src/config/interviewFeatures.ts`) with future migration path to user preferences.
- Crossfade implemented via overlapping two `AudioBufferSourceNode`s with gain envelopes (linear fade in/out) inside scheduling loop.
- Latency measurement uses high-resolution timestamps captured at event dispatch; falls back to `Date.now()` if Performance API unavailable.
- Token refresh endpoint reuses existing `/api/interview/realtime-token` with `previousSessionId` param for audit.

### Risks & Mitigations

- Added buffering could impact latency → keep buffer depth minimal & allow quick disable.
- Token refresh race conditions → serialize refresh with mutex & ignore stale completions.
- Transcript flicker with rapid deltas → batch updates using a 100ms micro-buffer before DOM paint.

### Future Story Links

- Scoring integration will consume `window.__interviewAnalytics` aggregates (EP3-S5)
- Recruiter transcript view depends on stable transcript (EP3-S8)
- Application score boost UI benefits from latency & reliability metrics (EP3-S7)
