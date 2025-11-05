'use client';

import React, { Suspense, useRef, useState, useEffect } from 'react';
import { Canvas, useFrame } from '@react-three/fiber';
import { OrbitControls, useGLTF } from '@react-three/drei';
import * as THREE from 'three';

interface AIAvatarCanvasProps {
  isSpeaking: boolean;
}

interface AvatarProps {
  isSpeaking: boolean;
}

/**
 * Avatar component that renders and animates the 3D model
 */
const Avatar: React.FC<AvatarProps> = ({ isSpeaking }) => {
  const groupRef = useRef<THREE.Group>(null);
  const [error, setError] = useState<Error | null>(null);

  // Load the GLB model
  let scene: THREE.Group | undefined;
  try {
    const gltf = useGLTF('/avatars/interviewer.glb');
    scene = gltf.scene;
  } catch (err) {
    if (error !== err) {
      setError(err as Error);
      // eslint-disable-next-line no-console
      console.error('[Avatar] Failed to load GLB:', err);
    }
  }

  // Animation loop
  useFrame(state => {
    if (!groupRef.current || !scene) return;

    const elapsed = state.clock.elapsedTime;

    // Subtle breathing animation (always active)
    groupRef.current.position.y = Math.sin(elapsed * 0.5) * 0.02;

    // Speaking animation: lip-sync approximation
    if (isSpeaking) {
      // Find the head mesh with morph targets
      scene.traverse(child => {
        if (child instanceof THREE.SkinnedMesh || child instanceof THREE.Mesh) {
          const mesh = child as THREE.Mesh | THREE.SkinnedMesh;
          if (mesh.morphTargetInfluences && mesh.morphTargetDictionary) {
            // Try common morph target names for mouth
            const mouthTargets = [
              'mouthOpen',
              'mouth_open',
              'viseme_aa',
              'jawOpen',
              'jaw_open',
            ];

            for (const targetName of mouthTargets) {
              const index = mesh.morphTargetDictionary[targetName];
              if (index !== undefined && mesh.morphTargetInfluences) {
                // Sine wave for rhythmic mouth movement
                const mouthOpen = Math.sin(elapsed * 8) * 0.3 + 0.3;
                mesh.morphTargetInfluences[index] = Math.max(
                  0,
                  Math.min(1, mouthOpen)
                );
                break;
              }
            }

            // Try blink animation (occasional)
            const blinkTargets = [
              'eyesClosed',
              'eyes_closed',
              'blink',
              'eyeBlinkLeft',
              'eyeBlinkRight',
            ];
            const shouldBlink = Math.sin(elapsed * 0.3) > 0.98; // Occasional blinks
            for (const targetName of blinkTargets) {
              const index = mesh.morphTargetDictionary[targetName];
              if (index !== undefined && mesh.morphTargetInfluences) {
                mesh.morphTargetInfluences[index] = shouldBlink ? 1 : 0;
              }
            }
          }
        }
      });

      // Subtle head nod while speaking
      groupRef.current.rotation.x = Math.sin(elapsed * 2) * 0.05;
    } else {
      // Idle: gentle head sway
      groupRef.current.rotation.y = Math.sin(elapsed * 0.3) * 0.1;

      // Occasional blink when idle
      scene.traverse(child => {
        if (child instanceof THREE.SkinnedMesh || child instanceof THREE.Mesh) {
          const mesh = child as THREE.Mesh | THREE.SkinnedMesh;
          if (mesh.morphTargetInfluences && mesh.morphTargetDictionary) {
            const blinkTargets = ['eyesClosed', 'eyes_closed', 'blink'];
            const shouldBlink = Math.sin(elapsed * 0.4) > 0.97;
            for (const targetName of blinkTargets) {
              const index = mesh.morphTargetDictionary[targetName];
              if (index !== undefined && mesh.morphTargetInfluences) {
                mesh.morphTargetInfluences[index] = shouldBlink ? 1 : 0;
              }
            }
          }
        }
      });
    }
  });

  if (error || !scene) {
    // Return null to trigger Suspense fallback or error boundary
    return null;
  }

  return (
    <group ref={groupRef}>
      <primitive object={scene} scale={1.5} position={[0, -1.5, 0]} />
    </group>
  );
};

/**
 * Loading fallback component
 */
const LoadingPlaceholder: React.FC = () => {
  return (
    <group>
      <mesh>
        <sphereGeometry args={[0.5, 32, 32]} />
        <meshStandardMaterial color="#6366f1" wireframe />
      </mesh>
    </group>
  );
};

/**
 * Main canvas component that renders the 3D scene
 */
export const AIAvatarCanvas: React.FC<AIAvatarCanvasProps> = ({
  isSpeaking,
}) => {
  const [hasWebGL, setHasWebGL] = useState<boolean | null>(null);

  // Check WebGL support on mount
  useEffect(() => {
    try {
      const canvas = document.createElement('canvas');
      const gl =
        canvas.getContext('webgl') || canvas.getContext('experimental-webgl');
      setHasWebGL(!!gl);
    } catch (e) {
      setHasWebGL(false);
      // eslint-disable-next-line no-console
      console.error('[Avatar] WebGL not supported:', e);
    }
  }, []);

  // Show fallback if WebGL not supported
  if (hasWebGL === false) {
    return <StaticFallback isSpeaking={isSpeaking} reason="no_webgl" />;
  }

  // Show nothing while checking WebGL support
  if (hasWebGL === null) {
    return (
      <div className="w-full h-full flex items-center justify-center bg-neutral-900/60">
        <div className="animate-pulse text-neutral-500">
          Initializing 3D view...
        </div>
      </div>
    );
  }

  return (
    <div className="w-full h-full relative">
      <Canvas
        camera={{ position: [0, 0.5, 2], fov: 50 }}
        gl={{ antialias: true, alpha: true }}
        className="w-full h-full"
      >
        {/* Lighting setup */}
        <ambientLight intensity={0.5} />
        <directionalLight position={[5, 5, 5]} intensity={0.8} castShadow />
        <pointLight position={[-5, 5, -5]} intensity={0.3} />

        {/* Avatar with Suspense for loading */}
        <Suspense fallback={<LoadingPlaceholder />}>
          <Avatar isSpeaking={isSpeaking} />
        </Suspense>

        {/* Camera controls - limited for better UX */}
        <OrbitControls
          enableZoom={false}
          enablePan={false}
          minPolarAngle={Math.PI / 3}
          maxPolarAngle={Math.PI / 2}
          target={[0, 0.5, 0]}
        />
      </Canvas>

      {/* Speaking indicator overlay */}
      {isSpeaking && (
        <div className="absolute bottom-4 left-4 bg-indigo-600/80 backdrop-blur px-3 py-1 rounded-md text-[10px] font-medium text-white ring-1 ring-indigo-400/30 flex items-center gap-2">
          <span className="w-2 h-2 bg-white rounded-full animate-pulse" />
          Speaking
        </div>
      )}
    </div>
  );
};

/**
 * Static fallback when WebGL is unavailable or avatar fails to load
 */
interface StaticFallbackProps {
  isSpeaking: boolean;
  reason: 'no_webgl' | 'load_error';
}

const StaticFallback: React.FC<StaticFallbackProps> = ({
  isSpeaking,
  reason,
}) => {
  return (
    <div className="w-full h-full flex items-center justify-center bg-neutral-900/60 relative">
      <div className="text-center p-6">
        {/* Static avatar representation */}
        <div className="w-24 h-24 mx-auto mb-4 rounded-full bg-gradient-to-br from-indigo-500 via-purple-500 to-fuchsia-500 flex items-center justify-center relative">
          <span className="text-4xl">🤖</span>
          {isSpeaking && (
            <>
              {/* Animated rings when speaking */}
              <div className="absolute inset-0 rounded-full border-2 border-white/50 animate-ping" />
              <div className="absolute inset-0 rounded-full border-2 border-white/30 animate-pulse" />
            </>
          )}
        </div>

        <p className="text-sm text-neutral-300 font-medium">AI Interviewer</p>
        <p className="text-xs text-neutral-500 mt-1">
          {isSpeaking ? 'Speaking...' : 'Listening...'}
        </p>

        {/* Debug message */}
        {process.env.NEXT_PUBLIC_DEBUG_INTERVIEW === '1' && (
          <p className="text-[10px] text-amber-400 mt-3">
            {reason === 'no_webgl'
              ? 'WebGL not available'
              : 'Avatar failed to load'}
          </p>
        )}
      </div>

      {/* Speaking indicator */}
      {isSpeaking && (
        <div className="absolute bottom-4 left-4 bg-indigo-600/80 backdrop-blur px-3 py-1 rounded-md text-[10px] font-medium text-white ring-1 ring-indigo-400/30 flex items-center gap-2">
          <span className="w-2 h-2 bg-white rounded-full animate-pulse" />
          Speaking
        </div>
      )}
    </div>
  );
};

// Preload the avatar GLB
useGLTF.preload('/avatars/interviewer.glb');
