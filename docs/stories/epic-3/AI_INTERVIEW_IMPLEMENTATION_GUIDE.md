# AI Interview Implementation Guide

**A comprehensive guide for developers looking to implement real-time AI voice interviews in their applications**

---

## Table of Contents

1. [Overview](#overview)
2. [Technical Architecture](#technical-architecture)
3. [Core Components](#core-components)
4. [Implementation Flow](#implementation-flow)
5. [Challenges & Solutions](#challenges--solutions)
6. [API Endpoints](#api-endpoints)
7. [Storage Strategy](#storage-strategy)
8. [Testing & Debugging](#testing--debugging)
9. [Cost Considerations](#cost-considerations)
10. [Technology-Agnostic Tips](#technology-agnostic-tips)

---

## Overview

This guide documents our implementation of a **real-time AI interview system** that conducts voice-based interviews with candidates, records the sessions, and stores them for later review. The system uses OpenAI's Realtime API for conversational AI, WebRTC for media capture, and Azure Blob Storage for video persistence.

### Key Features

- ✅ Real-time voice conversation with AI interviewer
- ✅ WebRTC video + audio recording (candidate side)
- ✅ Dynamic question generation based on job requirements
- ✅ Streaming upload to cloud storage during interview
- ✅ Post-interview scoring and analysis
- ✅ Video playback for recruiters
- ✅ Browser-based (no plugins required)

### Our Tech Stack

- **Frontend:** Next.js 15 (React 19, App Router)
- **Backend:** Next.js API Routes
- **Database:** MongoDB
- **AI:** OpenAI Realtime API (GPT-4o-realtime)
- **Storage:** Azure Blob Storage (Block Blobs)
- **Media:** WebRTC (getUserMedia, MediaRecorder)
- **Authentication:** NextAuth.js

---

## Technical Architecture

### High-Level Flow

```
User → Interview Page → Request Permissions → Start Interview
  ↓
WebRTC Capture (Video + Audio) → MediaRecorder
  ↓
Bidirectional Audio Streaming ↔ OpenAI Realtime API (WebSocket)
  ↓
Video Chunks → Azure Blob Storage (Streaming Upload)
  ↓
End Interview → Finalize Upload → Score Interview → Complete
```

### Component Diagram

```
┌─────────────────────────────────────────────────────────────┐
│                     Client (Browser)                        │
├─────────────────────────────────────────────────────────────┤
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐     │
│  │ Permission   │  │   Interview  │  │   Video      │     │
│  │ Manager      │→ │   Interface  │→ │   Recording  │     │
│  └──────────────┘  └──────────────┘  └──────────────┘     │
│         ↓                  ↓                  ↓             │
│  ┌──────────────────────────────────────────────────┐      │
│  │        Audio Processor (PCM16 24kHz)            │      │
│  └──────────────────────────────────────────────────┘      │
│         ↓                                    ↓              │
│  ┌──────────────┐                    ┌──────────────┐      │
│  │   WebSocket  │←--Audio Frames--→  │ MediaRecorder│      │
│  │  to OpenAI   │                    │  (WebM/VP9)  │      │
│  └──────────────┘                    └──────────────┘      │
└─────────────────────────────────────────────────────────────┘
         ↓                                      ↓
┌─────────────────────┐              ┌─────────────────────┐
│  OpenAI Realtime    │              │   Next.js API       │
│  API (wss://)       │              │   Routes            │
│  - GPT-4o Model     │              │   /api/interview/*  │
│  - Voice: Alloy     │              └─────────────────────┘
│  - 24kHz PCM16      │                        ↓
└─────────────────────┘              ┌─────────────────────┐
                                     │   Azure Blob        │
                                     │   Storage           │
                                     │   (Block Upload)    │
                                     └─────────────────────┘
                                               ↓
                                     ┌─────────────────────┐
                                     │   MongoDB           │
                                     │   (Session Metadata)│
                                     └─────────────────────┘
```

---

## Core Components

### 1. Permission Management

**Challenge:** Browsers require explicit user permission for camera/microphone access.

**Our Implementation:**

- `CameraPermissionCheck.tsx` - Pre-interview permission request UI
- `VideoRecordingManager.ts` - Handles getUserMedia with constraints
- Next.js config - Permissions-Policy headers

**Key Code Pattern:**

```typescript
// Request camera + microphone
const stream = await navigator.mediaDevices.getUserMedia({
  video: {
    width: { ideal: 1280 },
    height: { ideal: 720 },
    frameRate: { ideal: 30 },
    facingMode: 'user',
  },
  audio: {
    echoCancellation: true,
    noiseSuppression: true,
    autoGainControl: true,
    sampleRate: 48000,
  },
});
```

**Next.js Config (next.config.js):**

```javascript
headers: async () => [
  {
    source: '/:path*',
    headers: [
      {
        key: 'Permissions-Policy',
        value: 'camera=(self), microphone=(self), display-capture=(self)',
      },
    ],
  },
],
```

### 2. Audio Processing Pipeline

**Purpose:** Convert browser audio to OpenAI's required PCM16 24kHz mono format.

**Our Implementation:**

- `AudioProcessor.ts` - Web Audio API-based audio converter
- Input: 48kHz stereo from getUserMedia
- Output: 24kHz mono PCM16 (Int16Array)

**Key Code Pattern:**

```typescript
class AudioProcessor {
  private audioContext: AudioContext;
  private sourceNode: MediaStreamAudioSourceNode;
  private processorNode: ScriptProcessorNode;

  constructor(stream: MediaStream, onAudioData: (data: Int16Array) => void) {
    this.audioContext = new AudioContext({ sampleRate: 24000 });
    this.sourceNode = this.audioContext.createMediaStreamSource(stream);

    // 4096 buffer size for low latency
    this.processorNode = this.audioContext.createScriptProcessor(4096, 1, 1);

    this.processorNode.onaudioprocess = event => {
      const inputData = event.inputBuffer.getChannelData(0);
      const pcm16 = this.floatToPCM16(inputData);
      onAudioData(pcm16);
    };

    this.sourceNode.connect(this.processorNode);
    this.processorNode.connect(this.audioContext.destination);
  }

  private floatToPCM16(float32Array: Float32Array): Int16Array {
    const pcm16 = new Int16Array(float32Array.length);
    for (let i = 0; i < float32Array.length; i++) {
      const s = Math.max(-1, Math.min(1, float32Array[i]));
      pcm16[i] = s < 0 ? s * 0x8000 : s * 0x7fff;
    }
    return pcm16;
  }
}
```

### 3. WebSocket Connection to OpenAI

**Purpose:** Bidirectional audio streaming with AI interviewer.

**Our Implementation:**

- `RealtimeWebSocketManager.ts` - WebSocket client for OpenAI Realtime API
- Ephemeral token authentication (browser-safe)
- Event-driven message handling

**Key Code Pattern:**

```typescript
class RealtimeWebSocketManager {
  async connect(sessionToken: string): Promise<void> {
    const url = `wss://api.openai.com/v1/realtime?model=gpt-4o-realtime-preview-2024-10-01`;

    // Browser WebSocket uses protocols array for auth
    this.ws = new WebSocket(url, [
      'realtime',
      `openai-insecure-api-key.${sessionToken}`,
      'openai-beta.realtime-v1',
    ]);

    this.ws.onopen = () => this.onConnected();
    this.ws.onmessage = event => this.handleMessage(event);
    this.ws.onerror = error => this.handleError(error);
  }

  sendAudio(audioData: Int16Array): void {
    if (!this.isConnected()) return;

    const base64Audio = this.arrayBufferToBase64(audioData.buffer);

    this.ws.send(
      JSON.stringify({
        type: 'input_audio_buffer.append',
        audio: base64Audio,
      })
    );
  }

  private handleMessage(event: MessageEvent): void {
    const message = JSON.parse(event.data);

    switch (message.type) {
      case 'response.audio.delta':
        // AI speaking - decode base64 audio
        const audioChunk = this.base64ToArrayBuffer(message.delta);
        this.playAudio(audioChunk);
        break;

      case 'input_audio_buffer.speech_started':
        // User started speaking
        this.emit('userSpeaking', true);
        break;

      case 'response.done':
        // AI finished response
        this.emit('aiResponseComplete', message.response);
        break;
    }
  }
}
```

### 4. Video Recording Manager

**Purpose:** Record candidate video+audio during interview.

**Our Implementation:**

- `VideoRecordingManager.ts` - MediaRecorder wrapper
- WebM container with VP9 codec
- Chunk-based recording for streaming upload
- 10-second chunks (configurable)

**Key Code Pattern:**

```typescript
class VideoRecordingManager {
  startRecording(
    stream: MediaStream,
    onChunkReady: (chunk: Blob, index: number) => void
  ): void {
    const options = {
      mimeType: 'video/webm;codecs=vp9',
      videoBitsPerSecond: 2500000, // 2.5 Mbps
      audioBitsPerSecond: 128000, // 128 Kbps
    };

    this.mediaRecorder = new MediaRecorder(stream, options);

    // Emit chunks every 10 seconds
    this.mediaRecorder.ondataavailable = event => {
      if (event.data.size > 0) {
        onChunkReady(event.data, this.chunkIndex++);
      }
    };

    this.mediaRecorder.start(10000); // 10-second chunks
  }
}
```

### 5. Streaming Upload to Azure

**Purpose:** Upload video chunks to Azure Blob Storage during recording (not after).

**Our Implementation:**

- Azure Block Blob API
- Sequential chunk upload (prevents out-of-order issues)
- Queue-based upload processor
- Finalize with commit block list

**Key Code Pattern:**

```typescript
// Client-side chunk upload
async function uploadChunk(
  sessionId: string,
  chunk: Blob,
  blockIndex: number
): Promise<string> {
  const blockId = btoa(`block-${blockIndex.toString().padStart(6, '0')}`);

  const formData = new FormData();
  formData.append('sessionId', sessionId);
  formData.append('blockId', blockId);
  formData.append('blockIndex', blockIndex.toString());
  formData.append('chunk', chunk);

  const response = await fetch('/api/interview/upload-chunk', {
    method: 'POST',
    body: formData,
  });

  if (!response.ok) throw new Error('Upload failed');

  const data = await response.json();
  return data.value.blockId;
}

// Server-side (Next.js API route)
export async function POST(req: NextRequest) {
  const formData = await req.formData();
  const sessionId = formData.get('sessionId') as string;
  const blockId = formData.get('blockId') as string;
  const chunk = formData.get('chunk') as Blob;

  const buffer = Buffer.from(await chunk.arrayBuffer());

  // Azure Blob Storage
  const blobClient = containerClient.getBlockBlobClient(blobPath);
  await blobClient.stageBlock(blockId, buffer, buffer.length);

  return NextResponse.json({ ok: true, value: { blockId } });
}
```

### 6. Interview Session Management

**Purpose:** Track interview state, questions, metadata.

**Our Implementation:**

- MongoDB collection: `interviewSessions`
- Session lifecycle: preparing → active → completed
- Links to application and job

**Database Schema:**

```typescript
interface InterviewSession {
  _id: string;
  userId: string;
  applicationId: string;
  jobId: string;
  sessionId: string; // UUID for storage paths

  status: 'preparing' | 'active' | 'completed' | 'abandoned';

  questions: InterviewQuestion[];
  recordingPath: string; // Azure blob path
  recordingUrl?: string; // Signed URL for playback

  scores?: {
    technical: number;
    communication: number;
    experience: number;
    overall: number;
    confidence: number;
  };

  metadata: {
    duration?: number; // seconds
    fileSize?: number; // bytes
    videoFormat: string;
    audioFormat: string;
    videoResolution: string;
    transcriptAvailable: boolean;
  };

  startedAt?: Date;
  completedAt?: Date;
  createdAt: Date;
  updatedAt: Date;
}

interface InterviewQuestion {
  id: string;
  category: 'technical' | 'behavioral' | 'experience' | 'situational';
  question: string;
  expectedDuration: number; // seconds
  difficulty: 'easy' | 'medium' | 'hard';
}
```

---

## Implementation Flow

### Phase 1: Pre-Interview Setup

**User Flow:**

1. Candidate clicks "Take AI Interview" on application
2. System creates interview session
3. Generates questions based on job description + candidate profile
4. Redirects to `/interview/[sessionId]`

**API Call:**

```typescript
// POST /api/interview/start-session
const response = await fetch('/api/interview/start-session', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    jobId: 'job-123',
    applicationId: 'app-456',
    questions: [], // Optional - AI generates if empty
  }),
});

const { sessionId } = await response.json();
```

### Phase 2: Permission Request

**User Flow:**

1. Show permission check screen
2. User clicks "Request Permissions"
3. Browser shows camera/microphone prompt
4. On grant: show video preview + "Start Interview" button
5. On deny: show troubleshooting guide

**Key Implementation:**

```typescript
const CameraPermissionCheck = ({ onGranted }) => {
  const [permissionState, setPermissionState] = useState('prompt');

  const requestPermissions = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: true,
        audio: true,
      });

      setPermissionState('granted');
      onGranted(stream);
    } catch (error) {
      if (error.name === 'NotAllowedError') {
        setPermissionState('denied');
      } else if (error.name === 'NotFoundError') {
        setPermissionState('no-device');
      }
    }
  };

  return (
    <div>
      {permissionState === 'prompt' && (
        <button onClick={requestPermissions}>Request Permissions</button>
      )}
      {permissionState === 'denied' && (
        <div>Permission denied. Please enable in browser settings.</div>
      )}
    </div>
  );
};
```

### Phase 3: Interview Initialization

**User Flow:**

1. User clicks "Start Interview"
2. Initialize managers: VideoRecording, AudioProcessor, WebSocket
3. Request ephemeral token from OpenAI
4. Connect WebSocket
5. Start MediaRecorder
6. Send initial instructions to AI

**API Call:**

```typescript
// POST /api/interview/realtime-token
const tokenResponse = await fetch('/api/interview/realtime-token', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({ sessionId }),
});

const { token, expiresAt } = await tokenResponse.json();
```

**WebSocket Initialization:**

```typescript
const websocket = new RealtimeWebSocketManager(token, {
  onConnected: () => {
    // Send interview instructions
    websocket.updateSession({
      instructions: `You are an AI interviewer. Ask the candidate these questions:
        1. ${questions[0].question}
        2. ${questions[1].question}
        ...
        
        Be professional, encouraging, and adaptive. Listen carefully to responses.`,
      voice: 'alloy',
      temperature: 0.8,
      turnDetection: {
        type: 'server_vad',
        threshold: 0.5,
        silence_duration_ms: 1000,
      },
    });

    // Start the interview
    websocket.sendMessage({
      type: 'response.create',
      response: {
        modalities: ['audio', 'text'],
        instructions: 'Greet the candidate and ask the first question.',
      },
    });
  },

  onAudioDelta: audioData => {
    // Play AI audio through speakers
    playAudioChunk(audioData);
  },
});

await websocket.connect();
```

### Phase 4: Active Interview

**Continuous Process:**

1. Capture user audio → AudioProcessor → PCM16 → WebSocket → OpenAI
2. Receive AI audio ← WebSocket ← OpenAI → Play through speakers
3. Record video+audio → MediaRecorder → Chunks → Upload to Azure
4. Monitor connection, audio levels, inactivity

**Audio Loop:**

```typescript
audioProcessor.onAudioData = pcm16Data => {
  // Send to OpenAI
  websocket.sendAudio(pcm16Data);

  // Update UI audio level
  const level = calculateAudioLevel(pcm16Data);
  setUserAudioLevel(level);
};
```

**Video Upload Loop:**

```typescript
videoRecorder.onChunkReady = async (chunk, index) => {
  // Add to upload queue
  uploadQueue.push(chunk);

  // Process queue sequentially
  if (!isUploading) {
    await processUploadQueue();
  }
};

async function processUploadQueue() {
  isUploading = true;

  while (uploadQueue.length > 0) {
    const chunk = uploadQueue.shift();
    const blockId = await uploadChunk(sessionId, chunk, blockIndex++);
    uploadedBlockIds.push(blockId);
  }

  isUploading = false;
}
```

### Phase 5: Interview Completion

**User Flow:**

1. AI asks final question and says goodbye
2. User clicks "End Interview" (or AI auto-ends after time limit)
3. Stop recording
4. Finalize Azure upload (commit block list)
5. Generate scores using GPT-4
6. Update session status to 'completed'
7. Redirect to application detail page

**API Calls:**

```typescript
// 1. Finalize Azure upload
await fetch('/api/interview/finalize-upload', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    sessionId,
    blockIds: uploadedBlockIds,
    totalSize: totalFileSize,
  }),
});

// 2. End session and score
await fetch('/api/interview/end-session', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    sessionId,
    duration: elapsedSeconds,
  }),
});
```

**Scoring Implementation:**

```typescript
// Server-side scoring with GPT-4
async function scoreInterview(
  sessionId: string,
  questions: InterviewQuestion[]
): Promise<InterviewScores> {
  const prompt = `Analyze this interview and provide scores (0-100):
    
    Questions asked: ${questions.map(q => q.question).join('\n')}
    
    Provide scores for:
    - technical: Technical competence demonstrated
    - communication: Clarity and articulation
    - experience: Relevant experience shown
    - overall: Overall candidate quality
    - confidence: Confidence and professionalism
    
    Respond with JSON only.`;

  const response = await openai.chat.completions.create({
    model: 'gpt-4',
    messages: [{ role: 'user', content: prompt }],
    response_format: { type: 'json_object' },
  });

  return JSON.parse(response.choices[0].message.content);
}
```

### Phase 6: Playback & Review

**User Flow:**

1. Recruiter views application detail page
2. Sees interview summary with scores
3. Clicks "Watch Interview"
4. Video player loads from Azure Blob Storage
5. Can see transcript (if implemented)

**API Call:**

```typescript
// GET /api/interview/recording/[sessionId]
const response = await fetch(`/api/interview/recording/${sessionId}`);
const { recordingUrl, expiresAt } = await response.json();

// recordingUrl is a signed Azure SAS URL (valid for 1 hour)
```

**Video Player:**

```typescript
const InterviewPlayer = ({ sessionId }) => {
  const [recordingUrl, setRecordingUrl] = useState<string | null>(null);

  useEffect(() => {
    fetch(`/api/interview/recording/${sessionId}`)
      .then(res => res.json())
      .then(data => setRecordingUrl(data.recordingUrl));
  }, [sessionId]);

  if (!recordingUrl) return <div>Loading...</div>;

  return (
    <video
      src={recordingUrl}
      controls
      style={{ width: '100%', maxWidth: '800px' }}
    >
      Your browser does not support video playback.
    </video>
  );
};
```

---

## Challenges & Solutions

### Challenge 1: Camera/Microphone Permissions Not Working

**Problem:** Browser doesn't show permission prompt, or shows "Permission denied" without user interaction.

**Root Causes:**

- Permissions-Policy headers blocking getUserMedia
- User previously denied permissions (cached)
- Not running on HTTPS or localhost
- Browser security extensions blocking
- Accessing via IP address instead of localhost

**Solutions:**

1. **Add Permissions-Policy headers** (Next.js example):

```javascript
// next.config.js
module.exports = {
  async headers() {
    return [
      {
        source: '/:path*', // Apply to all routes
        headers: [
          {
            key: 'Permissions-Policy',
            value: 'camera=(self), microphone=(self), display-capture=(self)',
          },
        ],
      },
    ];
  },
};
```

2. **Check permission state before requesting**:

```typescript
const checkPermissions = async () => {
  const cameraStatus = await navigator.permissions.query({ name: 'camera' });
  const micStatus = await navigator.permissions.query({ name: 'microphone' });

  if (cameraStatus.state === 'denied' || micStatus.state === 'denied') {
    // Show instructions to reset permissions
    showPermissionResetInstructions();
  }
};
```

3. **Provide clear error messages**:

```typescript
try {
  const stream = await navigator.mediaDevices.getUserMedia({
    video: true,
    audio: true,
  });
} catch (error) {
  switch (error.name) {
    case 'NotAllowedError':
      showError('Permission denied. Check browser settings.');
      break;
    case 'NotFoundError':
      showError('No camera or microphone found.');
      break;
    case 'SecurityError':
      showError('Cannot access media. Check Permissions-Policy headers.');
      break;
  }
}
```

### Challenge 2: AI Audio Playback Issues (Gibberish/Glitchy)

**Problem:** AI voice sounds garbled, stuttering, or has clicking noises.

**Root Causes:**

- Out-of-order audio chunk playback
- Buffer underruns (playing too fast)
- Incorrect audio format conversion
- AudioContext scheduling issues

**Solutions:**

1. **Sequential audio scheduling** (not parallel):

```typescript
class AudioPlaybackManager {
  private audioContext: AudioContext;
  private audioQueue: ArrayBuffer[] = [];
  private scheduledTime: number = 0;
  private isPlaying: boolean = false;

  constructor() {
    this.audioContext = new AudioContext({ sampleRate: 24000 });
    this.scheduledTime = this.audioContext.currentTime;
  }

  playAudioChunk(base64Audio: string): void {
    const arrayBuffer = this.base64ToArrayBuffer(base64Audio);
    this.audioQueue.push(arrayBuffer);

    if (!this.isPlaying) {
      this.processQueue();
    }
  }

  private async processQueue(): Promise<void> {
    this.isPlaying = true;

    while (this.audioQueue.length > 0) {
      const chunk = this.audioQueue.shift()!;
      await this.scheduleAudioBuffer(chunk);
    }

    this.isPlaying = false;
  }

  private async scheduleAudioBuffer(arrayBuffer: ArrayBuffer): Promise<void> {
    const audioBuffer = await this.audioContext.decodeAudioData(arrayBuffer);
    const source = this.audioContext.createBufferSource();
    source.buffer = audioBuffer;
    source.connect(this.audioContext.destination);

    // Schedule at the end of previous audio
    const now = this.audioContext.currentTime;
    const startTime = Math.max(now, this.scheduledTime);

    source.start(startTime);

    // Update scheduled time
    this.scheduledTime = startTime + audioBuffer.duration;

    // Wait for playback to finish
    return new Promise(resolve => {
      source.onended = () => resolve();
    });
  }
}
```

2. **Proper PCM16 conversion**:

```typescript
function floatToPCM16(float32Array: Float32Array): Int16Array {
  const pcm16 = new Int16Array(float32Array.length);

  for (let i = 0; i < float32Array.length; i++) {
    // Clamp to [-1, 1]
    const clamped = Math.max(-1, Math.min(1, float32Array[i]));

    // Convert to 16-bit integer
    pcm16[i] = clamped < 0 ? clamped * 0x8000 : clamped * 0x7fff;
  }

  return pcm16;
}
```

### Challenge 3: Video Upload Failures / Incomplete Uploads

**Problem:** Video chunks fail to upload, or final video is corrupted/incomplete.

**Root Causes:**

- Network interruptions during upload
- Out-of-order chunk uploads
- Missing chunks in block list
- Race conditions in upload queue

**Solutions:**

1. **Sequential upload queue** (not parallel):

```typescript
class UploadQueue {
  private queue: Blob[] = [];
  private isProcessing: boolean = false;
  private uploadedBlocks: string[] = [];

  async enqueue(chunk: Blob): Promise<void> {
    this.queue.push(chunk);

    if (!this.isProcessing) {
      await this.processQueue();
    }
  }

  private async processQueue(): Promise<void> {
    this.isProcessing = true;

    while (this.queue.length > 0) {
      const chunk = this.queue.shift()!;
      const blockIndex = this.uploadedBlocks.length;

      try {
        const blockId = await this.uploadChunk(chunk, blockIndex);
        this.uploadedBlocks.push(blockId);
      } catch (error) {
        console.error('Upload failed, retrying...', error);

        // Retry once
        const blockId = await this.uploadChunk(chunk, blockIndex);
        this.uploadedBlocks.push(blockId);
      }
    }

    this.isProcessing = false;
  }

  private async uploadChunk(chunk: Blob, index: number): Promise<string> {
    // Zero-padded block IDs (required for Azure)
    const blockId = btoa(`block-${index.toString().padStart(6, '0')}`);

    const formData = new FormData();
    formData.append('blockId', blockId);
    formData.append('chunk', chunk);

    const response = await fetch('/api/interview/upload-chunk', {
      method: 'POST',
      body: formData,
    });

    if (!response.ok) throw new Error('Upload failed');

    return blockId;
  }
}
```

2. **Finalize with commit block list**:

```typescript
// Server-side (Azure SDK)
async function finalizeUpload(
  blobPath: string,
  blockIds: string[]
): Promise<void> {
  const blobClient = containerClient.getBlockBlobClient(blobPath);

  // Commit blocks in order
  await blobClient.commitBlockList(blockIds, {
    blobHTTPHeaders: {
      blobContentType: 'video/webm',
    },
  });
}
```

3. **Track upload progress**:

```typescript
const [uploadProgress, setUploadProgress] = useState({
  uploaded: 0,
  total: 0,
});

videoRecorder.onChunkReady = async (chunk, index) => {
  setUploadProgress(prev => ({
    ...prev,
    total: prev.total + chunk.size,
  }));

  await uploadQueue.enqueue(chunk);

  setUploadProgress(prev => ({
    ...prev,
    uploaded: prev.uploaded + chunk.size,
  }));
};
```

### Challenge 4: WebSocket Connection Drops

**Problem:** WebSocket disconnects during interview, causing AI to stop responding.

**Root Causes:**

- Network instability
- Token expiration (ephemeral tokens expire after 60 seconds)
- Server-side disconnection
- Browser tab backgrounded (mobile)

**Solutions:**

1. **Connection monitoring with heartbeat**:

```typescript
class RealtimeWebSocketManager {
  private heartbeatInterval: NodeJS.Timeout | null = null;
  private lastHeartbeat: number = Date.now();

  startHeartbeat(): void {
    this.heartbeatInterval = setInterval(() => {
      if (this.isConnected()) {
        // Send ping
        this.ws.send(JSON.stringify({ type: 'ping' }));

        // Check if we received recent messages
        if (Date.now() - this.lastHeartbeat > 30000) {
          console.warn('No heartbeat for 30s, reconnecting...');
          this.reconnect();
        }
      }
    }, 10000); // Check every 10 seconds
  }

  private handleMessage(event: MessageEvent): void {
    this.lastHeartbeat = Date.now();
    // ... handle message
  }
}
```

2. **Automatic reconnection**:

```typescript
async reconnect(): Promise<void> {
  if (this.reconnectAttempts >= this.maxReconnectAttempts) {
    this.emit('error', new Error('Max reconnection attempts reached'));
    return;
  }

  this.reconnectAttempts++;
  this.disconnect();

  // Exponential backoff
  const delay = Math.min(1000 * Math.pow(2, this.reconnectAttempts), 10000);
  await new Promise(resolve => setTimeout(resolve, delay));

  // Get new token
  const { token } = await fetch('/api/interview/realtime-token', {
    method: 'POST',
    body: JSON.stringify({ sessionId }),
  }).then(r => r.json());

  this.sessionToken = token;
  await this.connect();
}
```

### Challenge 5: Browser Compatibility Issues

**Problem:** Features work in Chrome but fail in Safari/Firefox.

**Root Causes:**

- Different MediaRecorder codec support
- AudioContext API differences
- WebSocket protocol handling
- Permissions API availability

**Solutions:**

1. **Feature detection**:

```typescript
function getSupportedMimeType(): string {
  const types = [
    'video/webm;codecs=vp9',
    'video/webm;codecs=vp8',
    'video/webm',
    'video/mp4',
  ];

  for (const type of types) {
    if (MediaRecorder.isTypeSupported(type)) {
      return type;
    }
  }

  throw new Error('No supported video format');
}
```

2. **Browser-specific handling**:

```typescript
const isSafari = /^((?!chrome|android).)*safari/i.test(navigator.userAgent);

if (isSafari) {
  // Safari requires different AudioContext handling
  const AudioContext = window.AudioContext || window.webkitAudioContext;
  audioContext = new AudioContext({ sampleRate: 24000 });
}
```

3. **Polyfills for older browsers**:

```typescript
if (!navigator.permissions) {
  // Fallback: try getUserMedia directly
  console.warn('Permissions API not available, requesting directly');
}
```

### Challenge 6: Inactivity Detection (User Not Speaking)

**Problem:** Candidate forgets they're in an interview or has audio issues.

**Root Causes:**

- Microphone muted
- User went AFK
- Audio processing stopped
- Candidate nervous/thinking

**Solutions:**

1. **Monitor silence duration**:

```typescript
class InactivityMonitor {
  private lastSpeechTime: number = Date.now();
  private warningIssued: boolean = false;
  private checkInterval: NodeJS.Timeout;

  constructor(
    private onWarning: () => void,
    private onTimeout: () => void
  ) {
    this.checkInterval = setInterval(() => this.check(), 5000);
  }

  onUserSpeaking(): void {
    this.lastSpeechTime = Date.now();
    this.warningIssued = false;
  }

  private check(): void {
    const silenceDuration = Date.now() - this.lastSpeechTime;

    if (silenceDuration > 60000 && !this.warningIssued) {
      // 1 minute of silence
      this.onWarning();
      this.warningIssued = true;
    }

    if (silenceDuration > 180000) {
      // 3 minutes of silence - end interview
      this.onTimeout();
    }
  }
}
```

2. **UI indicators**:

```tsx
{
  silenceWarning && (
    <div className="warning-banner">
      ⚠️ We haven't heard from you in a while. Please check your microphone.
    </div>
  );
}
```

### Challenge 7: Large Video File Sizes

**Problem:** Interview recordings become 100MB+ for 10-minute interviews.

**Root Causes:**

- High bitrate settings
- Inefficient codec
- Uncompressed audio
- High resolution (1080p)

**Solutions:**

1. **Optimize recording settings**:

```typescript
const recordingConfig = {
  video: {
    width: 1280,
    height: 720, // 720p is enough
    frameRate: 30, // Not 60fps
  },
  videoBitsPerSecond: 2500000, // 2.5 Mbps (not 5+ Mbps)
  audioBitsPerSecond: 128000, // 128 Kbps (not 320 Kbps)
  mimeType: 'video/webm;codecs=vp9', // VP9 is more efficient than VP8
};
```

2. **Consider server-side transcoding** (future enhancement):

```typescript
// After upload, trigger Azure Media Services transcoding
async function transcodeVideo(blobUrl: string): Promise<string> {
  // Transcode to H.264 with adaptive bitrate
  // Reduces file size by 40-60%
}
```

---

## API Endpoints

### POST /api/interview/start-session

**Purpose:** Create new interview session.

**Request:**

```json
{
  "jobId": "string",
  "applicationId": "string",
  "questions": [
    {
      "id": "string",
      "category": "technical",
      "question": "string",
      "expectedDuration": 120,
      "difficulty": "medium"
    }
  ]
}
```

**Response:**

```json
{
  "ok": true,
  "value": {
    "sessionId": "uuid",
    "status": "preparing",
    "questions": [...],
    "createdAt": "2025-11-03T..."
  }
}
```

### POST /api/interview/realtime-token

**Purpose:** Get ephemeral OpenAI Realtime API token.

**Request:**

```json
{
  "sessionId": "uuid"
}
```

**Response:**

```json
{
  "ok": true,
  "value": {
    "token": "eyJhbGc...",
    "expiresAt": "2025-11-03T..."
  }
}
```

**Server Implementation:**

```typescript
export async function POST(req: NextRequest) {
  const { sessionId } = await req.json();

  // Verify user owns this session
  const session = await interviewSessionRepo.findBySessionId(sessionId);
  if (!session || session.userId !== currentUser._id) {
    return json({ ok: false, error: 'Unauthorized' }, 401);
  }

  // Get ephemeral token from OpenAI
  const response = await fetch('https://api.openai.com/v1/realtime/sessions', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${process.env.OPENAI_API_KEY}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      model: 'gpt-4o-realtime-preview-2024-10-01',
      voice: 'alloy',
    }),
  });

  const data = await response.json();

  return json({
    ok: true,
    value: {
      token: data.client_secret.value,
      expiresAt: data.expires_at,
    },
  });
}
```

### POST /api/interview/upload-chunk

**Purpose:** Upload video chunk to Azure Blob Storage.

**Request:** multipart/form-data

- `sessionId`: string
- `blockId`: string (base64)
- `blockIndex`: number
- `chunk`: Blob

**Response:**

```json
{
  "ok": true,
  "value": {
    "blockId": "base64-string"
  }
}
```

**Server Implementation:**

```typescript
export async function POST(req: NextRequest) {
  const formData = await req.formData();
  const sessionId = formData.get('sessionId') as string;
  const blockId = formData.get('blockId') as string;
  const chunk = formData.get('chunk') as Blob;

  // Get session
  const session = await interviewSessionRepo.findBySessionId(sessionId);
  if (!session) {
    return json({ ok: false, error: 'Session not found' }, 404);
  }

  // Upload to Azure
  const buffer = Buffer.from(await chunk.arrayBuffer());
  const blobClient = containerClient.getBlockBlobClient(session.recordingPath);

  await blobClient.stageBlock(blockId, buffer, buffer.length);

  logger.info({
    event: 'chunk_uploaded',
    sessionId,
    blockId,
    size: buffer.length,
  });

  return json({ ok: true, value: { blockId } });
}
```

### POST /api/interview/finalize-upload

**Purpose:** Commit block list and finalize video.

**Request:**

```json
{
  "sessionId": "uuid",
  "blockIds": ["base64-1", "base64-2", ...],
  "totalSize": 12345678
}
```

**Response:**

```json
{
  "ok": true,
  "value": {
    "blobUrl": "https://...",
    "fileSize": 12345678
  }
}
```

**Server Implementation:**

```typescript
export async function POST(req: NextRequest) {
  const { sessionId, blockIds, totalSize } = await req.json();

  const session = await interviewSessionRepo.findBySessionId(sessionId);
  const blobClient = containerClient.getBlockBlobClient(session.recordingPath);

  // Commit blocks
  await blobClient.commitBlockList(blockIds, {
    blobHTTPHeaders: {
      blobContentType: 'video/webm',
    },
  });

  // Update session
  await interviewSessionRepo.update(sessionId, {
    'metadata.fileSize': totalSize,
    'metadata.uploadCompleted': true,
  });

  return json({
    ok: true,
    value: {
      blobUrl: blobClient.url,
      fileSize: totalSize,
    },
  });
}
```

### POST /api/interview/end-session

**Purpose:** End interview and trigger scoring.

**Request:**

```json
{
  "sessionId": "uuid",
  "duration": 600
}
```

**Response:**

```json
{
  "ok": true,
  "value": {
    "status": "completed",
    "scores": {
      "technical": 85,
      "communication": 90,
      "experience": 80,
      "overall": 85,
      "confidence": 88
    }
  }
}
```

**Server Implementation:**

```typescript
export async function POST(req: NextRequest) {
  const { sessionId, duration } = await req.json();

  const session = await interviewSessionRepo.findBySessionId(sessionId);

  // Generate scores using GPT-4
  const scores = await scoreInterview(session);

  // Update session
  await interviewSessionRepo.update(sessionId, {
    status: 'completed',
    scores,
    completedAt: new Date(),
    'metadata.duration': duration,
  });

  // Update application scores
  await applicationRepo.updateInterviewScores(
    session.applicationId,
    scores.overall
  );

  return json({
    ok: true,
    value: { status: 'completed', scores },
  });
}
```

### GET /api/interview/recording/[sessionId]

**Purpose:** Get signed URL for video playback.

**Response:**

```json
{
  "ok": true,
  "value": {
    "recordingUrl": "https://...?sv=2021-08-06&ss=b&srt=o&sp=r&sig=...",
    "expiresAt": "2025-11-03T..."
  }
}
```

**Server Implementation:**

```typescript
export async function GET(
  req: NextRequest,
  { params }: { params: { sessionId: string } }
) {
  const session = await interviewSessionRepo.findBySessionId(params.sessionId);

  // Generate SAS token (1 hour expiry)
  const blobClient = containerClient.getBlockBlobClient(session.recordingPath);
  const sasToken = await blobClient.generateSasUrl({
    permissions: 'r', // read-only
    expiresOn: new Date(Date.now() + 3600000), // 1 hour
  });

  return json({
    ok: true,
    value: {
      recordingUrl: sasToken,
      expiresAt: new Date(Date.now() + 3600000).toISOString(),
    },
  });
}
```

---

## Storage Strategy

### Azure Blob Storage Structure

```
container: interview-recordings
├── {userId}/
│   ├── {applicationId}/
│   │   ├── {sessionId}/
│   │   │   ├── recording.webm
│   │   │   └── metadata.json (optional)
```

### Block Blob Upload Strategy

**Why Block Blobs?**

- Supports streaming upload (up to 50,000 blocks)
- Can upload chunks in parallel (we do sequential for reliability)
- Commit at the end ensures atomic operation
- Maximum file size: 190.7 TiB

**Block ID Format:**

```typescript
// Block IDs must be base64-encoded and same length
const blockId = btoa(`block-${index.toString().padStart(6, '0')}`);
// Example: btoa('block-000000') => 'YmxvY2stMDAwMDAw'
```

**Upload Flow:**

1. `stageBlock(blockId, data, length)` - Stage each chunk
2. `commitBlockList(blockIds)` - Commit all blocks in order
3. Azure concatenates blocks into final blob

### Cost Optimization

**Azure Blob Storage Pricing (Hot tier):**

- First 50 TB: $0.0184 per GB/month
- Write operations: $0.05 per 10,000
- Read operations: $0.004 per 10,000

**Example Interview Cost:**

- 10-minute interview = ~50 MB video
- Upload: 50 MB / 5 MB chunks = 10 write operations = $0.00005
- Storage: 50 MB \* $0.0184 = $0.00092/month
- Playback: 1 read operation = $0.0000004
- **Total per interview: ~$0.001**

**100 interviews/month:**

- Storage: 5 GB \* $0.0184 = $0.092
- Operations: ~$0.01
- **Total: ~$0.10/month**

### Alternative Storage Options

**AWS S3:**

- Similar block upload via Multipart Upload API
- Use `createMultipartUpload()`, `uploadPart()`, `completeMultipartUpload()`
- Slightly cheaper at scale

**Google Cloud Storage:**

- Use resumable uploads
- Supports chunk-based uploads via `upload()` with `chunkSize` option

**Cloudflare R2:**

- S3-compatible API
- Zero egress fees (good for video playback)
- Cheaper than Azure/AWS for high-traffic scenarios

---

## Testing & Debugging

### Browser DevTools Console Logging

**Add extensive logging during development:**

```typescript
const DEBUG = process.env.NODE_ENV === 'development';

function log(category: string, message: string, data?: any) {
  if (DEBUG) {
    console.log(`[${category}] ${message}`, data || '');
  }
}

// Usage
log('WebSocket', 'Connected to OpenAI', { sessionId });
log('AudioProcessor', 'Sending audio chunk', { size: pcm16.length });
log('VideoRecorder', 'Chunk ready', { index, size: chunk.size });
```

### Network Tab Monitoring

**Check for:**

- API call success/failure
- Upload chunk timing (should be sequential, not parallel)
- WebSocket connection establishment
- Token refresh requests

### Simulating Errors

**Test error handling:**

```typescript
// Simulate network failure
if (Math.random() < 0.1) {
  // 10% chance
  throw new Error('Simulated network error');
}

// Simulate token expiration
if (Date.now() - tokenIssuedAt > 60000) {
  websocket.disconnect();
  await refreshToken();
}
```

### Manual Testing Checklist

- [ ] Camera permission prompt appears
- [ ] Microphone permission prompt appears
- [ ] Video preview shows before starting
- [ ] AI voice is clear and natural
- [ ] User speech is detected (audio levels move)
- [ ] Video chunks upload during interview
- [ ] Interview can be ended manually
- [ ] Interview auto-ends after time limit
- [ ] Recording appears in Azure Blob Storage
- [ ] Video plays back correctly
- [ ] Scores are generated after completion
- [ ] Works in Chrome, Firefox, Safari, Edge
- [ ] Works on mobile devices
- [ ] Handles network interruptions gracefully

---

## Cost Considerations

### OpenAI Realtime API Pricing

**Audio Streaming (Input + Output):**

- $100 / 1 million audio tokens
- ~1 audio token = 0.25 seconds of audio
- 10-minute interview: ~2,400 tokens (10 min \* 60 sec / 0.25)
- **Cost: $0.24 per 10-minute interview**

**Text Input (Instructions):**

- $5 / 1 million input tokens
- Interview instructions: ~500 tokens
- **Cost: $0.0025 per interview**

**Total OpenAI per interview: ~$0.25**

### Azure Blob Storage (Hot Tier)

**Storage:**

- $0.0184 per GB/month
- 10-minute interview: ~50 MB
- **Cost: ~$0.001/month per interview**

**Operations:**

- Write (upload chunks): $0.05 per 10,000
- Read (playback): $0.004 per 10,000
- **Cost: <$0.001 per interview**

### GPT-4 Scoring

**Post-interview analysis:**

- Input: ~500 tokens (questions + metadata)
- Output: ~200 tokens (scores + brief analysis)
- Cost: $0.03 per 1,000 input tokens + $0.06 per 1,000 output
- **Cost: ~$0.027 per interview**

### Total Cost per Interview

| Component       | Cost      |
| --------------- | --------- |
| OpenAI Realtime | $0.24     |
| Azure Storage   | $0.002    |
| GPT-4 Scoring   | $0.027    |
| **Total**       | **$0.27** |

### Monthly Cost Projections

| Interviews/Month | Total Cost |
| ---------------- | ---------- |
| 10               | $2.70      |
| 100              | $27.00     |
| 1,000            | $270.00    |
| 10,000           | $2,700.00  |

### Cost Optimization Strategies

1. **Shorten interviews**: 5-minute interviews = ~$0.14 each (48% savings)
2. **Use cheaper voice model**: OpenAI's `echo` or `shimmer` (same price, but future models may vary)
3. **Batch scoring**: Score multiple interviews together (minimal savings)
4. **Move to Cool storage**: After 30 days, move recordings to Cool tier ($0.01/GB vs $0.0184/GB)
5. **Compression**: Transcode to H.264 (reduces storage by 40-60%)

---

## Technology-Agnostic Tips

### For React Developers (Non-Next.js)

**Express.js API Server:**

```javascript
// server.js
const express = require('express');
const multer = require('multer');
const { BlobServiceClient } = require('@azure/storage-blob');

const app = express();
const upload = multer({ storage: multer.memoryStorage() });

app.post(
  '/api/interview/upload-chunk',
  upload.single('chunk'),
  async (req, res) => {
    const { sessionId, blockId } = req.body;
    const chunk = req.file.buffer;

    // Upload to Azure
    const blobClient = containerClient.getBlockBlobClient(
      `${sessionId}/recording.webm`
    );
    await blobClient.stageBlock(blockId, chunk, chunk.length);

    res.json({ ok: true, blockId });
  }
);

app.listen(3001);
```

### For Replit Users

**Challenges:**

- Replit uses HTTP (not HTTPS) by default
- getUserMedia requires HTTPS or localhost
- Solution: Replit provides `*.repl.co` domains with HTTPS

**Setup:**

```javascript
// Use Replit's HTTPS URL
const SITE_URL = process.env.REPL_SLUG
  ? `https://${process.env.REPL_SLUG}.${process.env.REPL_OWNER}.repl.co`
  : 'http://localhost:3000';
```

### For v0 (Vercel AI) Users

**Challenges:**

- v0 focuses on UI generation, not backend
- Need to add API routes manually

**Solution:**

- Use v0 to generate UI components (InterviewInterface, VideoPlayer)
- Manually create API routes in `pages/api/` or `app/api/`
- Deploy to Vercel for automatic HTTPS

### For Python/Flask Developers

**WebSocket Alternative:**

```python
from flask import Flask, request, jsonify
from flask_socketio import SocketIO, emit
import openai

app = Flask(__name__)
socketio = SocketIO(app)

@socketio.on('audio_chunk')
def handle_audio(data):
    # Forward to OpenAI Realtime API
    # Note: Python SDK doesn't support Realtime API yet
    # Use websocket-client library directly
    pass

if __name__ == '__main__':
    socketio.run(app)
```

**Note:** OpenAI Realtime API is WebSocket-based. Python requires `websocket-client` or `aiohttp` for client-side connections.

### For Node.js + Socket.io Users

**Server-side WebSocket proxy:**

```javascript
const io = require('socket.io')(server);
const WebSocket = require('ws');

io.on('connection', socket => {
  // Create OpenAI WebSocket connection
  const openaiWs = new WebSocket('wss://api.openai.com/v1/realtime', {
    headers: {
      Authorization: `Bearer ${process.env.OPENAI_API_KEY}`,
      'OpenAI-Beta': 'realtime=v1',
    },
  });

  // Forward audio from client to OpenAI
  socket.on('audio_chunk', data => {
    openaiWs.send(
      JSON.stringify({
        type: 'input_audio_buffer.append',
        audio: data.base64Audio,
      })
    );
  });

  // Forward AI audio to client
  openaiWs.on('message', message => {
    const event = JSON.parse(message);
    if (event.type === 'response.audio.delta') {
      socket.emit('ai_audio', { audio: event.delta });
    }
  });
});
```

### For Vue.js Developers

**Composition API example:**

```vue
<script setup>
import { ref, onMounted, onUnmounted } from 'vue';

const mediaStream = ref(null);
const isRecording = ref(false);
const websocket = ref(null);

async function startInterview() {
  // Get permissions
  mediaStream.value = await navigator.mediaDevices.getUserMedia({
    video: true,
    audio: true,
  });

  // Initialize WebSocket
  const token = await fetch('/api/interview/realtime-token')
    .then(r => r.json())
    .then(d => d.token);

  websocket.value = new WebSocket(`wss://api.openai.com/v1/realtime`, [
    'realtime',
    `openai-insecure-api-key.${token}`,
    'openai-beta.realtime-v1',
  ]);

  websocket.value.onopen = () => {
    isRecording.value = true;
  };
}

onUnmounted(() => {
  if (websocket.value) websocket.value.close();
  if (mediaStream.value) {
    mediaStream.value.getTracks().forEach(track => track.stop());
  }
});
</script>

<template>
  <div>
    <button @click="startInterview" :disabled="isRecording">
      Start Interview
    </button>
    <video ref="videoPreview" autoplay muted></video>
  </div>
</template>
```

### For Mobile App Developers (React Native)

**Challenges:**

- No WebRTC getUserMedia (use `react-native-webrtc`)
- No direct WebSocket to OpenAI (use native WebSocket)

**Libraries:**

- `react-native-webrtc` - Camera/mic access
- `react-native-blob-util` - File upload
- Native WebSocket API for OpenAI connection

**Example:**

```javascript
import { mediaDevices, RTCView } from 'react-native-webrtc';

async function getMediaStream() {
  const stream = await mediaDevices.getUserMedia({
    audio: true,
    video: {
      width: 1280,
      height: 720,
      frameRate: 30,
      facingMode: 'user',
    },
  });

  return stream;
}
```

---

## Conclusion

Implementing a real-time AI interview system is complex but achievable with the right architecture. The key challenges are:

1. **Media permissions** - Requires HTTPS and proper headers
2. **Audio processing** - PCM16 conversion and sequential playback
3. **WebSocket management** - Connection stability and reconnection
4. **Video upload** - Streaming upload with sequential chunks
5. **Browser compatibility** - Different codec support

**Critical Success Factors:**

- ✅ Extensive error handling
- ✅ Clear user feedback (audio levels, connection status)
- ✅ Comprehensive logging for debugging
- ✅ Sequential processing (audio playback, video upload)
- ✅ Graceful degradation (reconnection, retry logic)

**Estimated Development Time:**

- Basic POC: 2-3 days
- Production-ready: 2-3 weeks
- Full featured (transcription, scoring): 4-6 weeks

**Resources:**

- OpenAI Realtime API Docs: https://platform.openai.com/docs/guides/realtime
- MDN WebRTC Guide: https://developer.mozilla.org/en-US/docs/Web/API/WebRTC_API
- Azure Blob Storage Docs: https://learn.microsoft.com/en-us/azure/storage/blobs/

Good luck with your implementation! 🚀
