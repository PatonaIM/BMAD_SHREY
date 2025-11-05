# EP5-S16: ReadyPlayerMe Avatar with Three.js Integration

As a candidate,
I want to see a realistic 3D avatar representing the AI interviewer that reacts when speaking,
So that the interview feels more engaging and human-like.

## Scope

- Integrate ReadyPlayerMe avatar GLB model into right panel
- Use Three.js for 3D rendering
- Animate avatar based on `aiSpeaking` state from `RealtimeSessionState`
- Implement subtle head movements, eye blinks, lip-sync approximation
- Provide fallback placeholder if avatar fails to load

## Acceptance Criteria

1. 3D avatar renders in right panel within 2 seconds of page load
2. Avatar responds to `controller.state.aiSpeaking` flag:
   - Speaking: Mouth opens/closes rhythmically, subtle head nods
   - Idle: Gentle breathing animation, occasional blinks
3. Smooth 60fps rendering on modern devices (≥M1 Mac, iPhone 12+)
4. Graceful degradation: Show static placeholder on low-end devices
5. Avatar lighting matches UI theme (dark mode)
6. No performance regression: max +5% CPU usage when idle

## Technical Stack

- **Three.js** (r157+): Core 3D rendering
- **@react-three/fiber**: React bindings for Three.js
- **@react-three/drei**: Helpers (OrbitControls, useGLTF, etc.)
- **ReadyPlayerMe SDK** (optional): Avatar loader and management
- **Blendshapes/Morph Targets**: For facial animation

## Avatar Selection

### Option 1: Pre-configured Avatar

Use a single professional-looking avatar GLB hosted on CDN or public storage.

- Faster implementation
- Consistent appearance
- Requires periodic updates if model changes

### Option 2: Dynamic Avatar API

Fetch avatar from ReadyPlayerMe API with query params for appearance.

- Example URL: `https://models.readyplayer.me/[avatarId].glb?quality=medium&pose=A`
- Customizable (gender, attire, accessories)
- Requires network request; add loading state

**Recommendation**: Start with Option 1 (static GLB) for MVP, refactor to Option 2 in S16.1 enhancement story.

## Implementation Plan

### 1. Three.js Scene Setup

```typescript
// src/components/interview/v2/AIAvatarCanvas.tsx
import { Canvas } from '@react-three/fiber';
import { OrbitControls, useGLTF } from '@react-three/drei';

export const AIAvatarCanvas: React.FC<{ isSpeaking: boolean }> = ({ isSpeaking }) => {
  return (
    <Canvas camera={{ position: [0, 0.5, 2], fov: 50 }}>
      <ambientLight intensity={0.5} />
      <directionalLight position={[5, 5, 5]} intensity={0.8} />
      <Avatar isSpeaking={isSpeaking} />
      <OrbitControls enableZoom={false} enablePan={false} />
    </Canvas>
  );
};
```

### 2. Avatar Model Component

```typescript
const Avatar: React.FC<{ isSpeaking: boolean }> = ({ isSpeaking }) => {
  const { scene } = useGLTF('/avatars/interviewer.glb');
  const meshRef = useRef<THREE.Group>(null);

  useFrame((state, delta) => {
    if (!meshRef.current) return;

    if (isSpeaking) {
      // Lip-sync approximation: sine wave mouth movement
      const mouthOpen = Math.sin(state.clock.elapsedTime * 8) * 0.3 + 0.3;
      // Apply to morph target "mouthOpen" if available
      const mesh = meshRef.current.getObjectByName('Head') as THREE.SkinnedMesh;
      if (mesh?.morphTargetInfluences) {
        mesh.morphTargetInfluences[0] = mouthOpen; // Adjust index based on GLB
      }
    }

    // Subtle breathing animation
    meshRef.current.position.y = Math.sin(state.clock.elapsedTime * 0.5) * 0.02;
  });

  return <primitive ref={meshRef} object={scene} />;
};
```

### 3. State Integration

```typescript
// In ModernInterviewPage.tsx
const AIAvatarPanel: React.FC<{ controller }> = ({ controller }) => {
  const isSpeaking = controller.state.aiSpeaking ?? false;

  return (
    <div className="relative w-full h-full bg-neutral-900/60 rounded-xl overflow-hidden">
      <AIAvatarCanvas isSpeaking={isSpeaking} />
      {controller.state.phase !== 'connected' && (
        <div className="absolute inset-0 flex items-center justify-center">
          <LoadingSpinner />
        </div>
      )}
    </div>
  );
};
```

## Performance Optimizations

1. **Lazy Load Three.js**: Dynamic import to reduce initial bundle size
2. **LOD (Level of Detail)**: Use medium-quality GLB (~2MB) for balance
3. **Texture Compression**: KTX2 or WebP textures if supported
4. **Throttle Animations**: Cap at 30fps on low-end devices (via `frameloop="demand"`)
5. **Memoization**: Wrap `AIAvatarCanvas` in `React.memo`

## Fallback Strategy

If WebGL unavailable or avatar fails to load:

1. Display static 2D image of avatar (fallback.jpg)
2. Show speaking indicator (animated pulse) synced to `aiSpeaking`
3. Log error to Sentry for monitoring

## Accessibility

- Add `aria-label="AI interviewer avatar"` to canvas container
- Provide text alternative: "The AI interviewer is [speaking/listening]"
- Ensure animations don't trigger motion sickness (subtle movements only)

## Edge Cases

- Mobile devices (limited GPU): Reduce polygon count, disable shadows
- Slow network: Show loading progress bar while GLB downloads
- Browser without WebGL2: Fall back to static image
- Avatar file 404: Retry once, then fallback

## Tests

- Unit: Avatar state transitions (speaking ↔ idle)
- Visual: Screenshot comparison of avatar at rest vs speaking
- Performance: Lighthouse audit (ensure <5% CPU increase)
- Integration: Verify `aiSpeaking` prop updates from controller state

## Definition of Done

3D avatar renders in right panel, animates mouth/head when `aiSpeaking=true`, maintains 60fps on target devices. Fallback displays correctly on WebGL-unsupported browsers. No bundle size increase >150KB (gzipped).

## Tasks

- [ ] Install Three.js dependencies (`npm install three @react-three/fiber @react-three/drei`)
- [ ] Source or create ReadyPlayerMe avatar GLB
- [ ] Implement `AIAvatarCanvas` component
- [ ] Add avatar loading/error states
- [ ] Integrate `aiSpeaking` state from controller
- [ ] Implement lip-sync and idle animations
- [ ] Add performance monitoring
- [ ] Test on mobile Safari, Chrome, Firefox
- [ ] Document avatar customization process

## Dependencies

- **Blocked by**: EP5-S15 (split-screen layout must be in place)
- **Blocks**: None

## Related Stories

- EP5-S15: Split-Screen Layout Refactor (provides right panel container)
- EP5-S16.1: Dynamic Avatar Selection (future enhancement)
- EP5-S16.2: Advanced Lip-Sync with Audio Analysis (future enhancement)

## Resources

- [ReadyPlayerMe Developer Hub](https://docs.readyplayer.me/)
- [React Three Fiber Docs](https://docs.pmnd.rs/react-three-fiber)
- [Three.js Morph Targets](https://threejs.org/docs/#api/en/objects/Mesh.morphTargetInfluences)
