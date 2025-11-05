'use client';

import React, { Suspense, useRef, useState, useEffect } from 'react';
import { Canvas, useFrame } from '@react-three/fiber';
import { OrbitControls, useGLTF } from '@react-three/drei';
import * as THREE from 'three';
import {
  AudioLipSyncAnalyzer,
  type VisemeWeights,
} from './AudioLipSyncAnalyzer';

interface AIAvatarCanvasProps {
  isSpeaking: boolean;
  audioStream?: MediaStream | null;
}

interface AvatarProps {
  isSpeaking: boolean;
  audioStream?: MediaStream | null;
}

/**
 * Avatar component that renders and animates the 3D model
 */
const Avatar: React.FC<AvatarProps> = ({ isSpeaking, audioStream }) => {
  const groupRef = useRef<THREE.Group>(null);
  const jawBoneRef = useRef<THREE.Bone | null>(null);
  const headBoneRef = useRef<THREE.Bone | null>(null);
  const morphMeshRef = useRef<THREE.SkinnedMesh | null>(null);
  const [bonesScanned, setBonesScanned] = useState(false);

  // Audio analysis for advanced lip-sync
  const analyzerRef = useRef<AudioLipSyncAnalyzer | null>(null);

  // Debug logging
  const lastDebugLog = useRef<number>(0);

  // Load the GLB model (useGLTF hook - only loads once)
  const { scene } = useGLTF('/avatars/interviewer.glb');

  // Log isSpeaking state changes
  useEffect(() => {
    // eslint-disable-next-line no-console
    console.log(
      '[Avatar Animation]',
      isSpeaking
        ? '🎤 Starting lip-sync animation'
        : '🔇 Stopping lip-sync animation',
      'timestamp:',
      new Date().toISOString()
    );
  }, [isSpeaking]);

  // Setup audio analyzer when audio stream is available
  useEffect(() => {
    if (!audioStream) {
      // eslint-disable-next-line no-console
      console.log('[Avatar] No audio stream available for analysis');
      return;
    }

    try {
      // eslint-disable-next-line no-console
      console.log('[Avatar] 🎵 Initializing audio analyzer for lip-sync');

      const analyzer = new AudioLipSyncAnalyzer(256);
      analyzer.connectStream(audioStream);
      analyzerRef.current = analyzer;

      // eslint-disable-next-line no-console
      console.log('[Avatar] ✅ Audio analyzer connected successfully');

      return () => {
        // Cleanup on unmount or stream change
        if (analyzerRef.current) {
          // eslint-disable-next-line no-console
          console.log('[Avatar] 🧹 Disposing audio analyzer');
          analyzerRef.current.dispose();
          analyzerRef.current = null;
        }
      };
    } catch (err) {
      // eslint-disable-next-line no-console
      console.error('[Avatar] Failed to initialize audio analyzer:', err);
    }
  }, [audioStream]);

  // Find jaw and head bones + morph targets for animation (only once)
  useEffect(() => {
    if (scene && !bonesScanned) {
      // eslint-disable-next-line no-console
      console.log('[Avatar] 🔍 Scanning avatar skeleton and morph targets...');

      scene.traverse((child: THREE.Object3D) => {
        // Look for bones
        if (child instanceof THREE.Bone) {
          const boneName = child.name.toLowerCase();
          // eslint-disable-next-line no-console
          console.log('[Avatar] 🦴 Found bone:', child.name);

          // Look for jaw bone
          if (
            boneName.includes('jaw') ||
            boneName.includes('chin') ||
            boneName === 'cc_base_jawroot'
          ) {
            jawBoneRef.current = child;
            // eslint-disable-next-line no-console
            console.log('[Avatar] ✅ Jaw bone found:', child.name);
          }

          // Look for head bone
          if (
            boneName.includes('head') &&
            !boneName.includes('neck') &&
            !headBoneRef.current
          ) {
            headBoneRef.current = child;
            // eslint-disable-next-line no-console
            console.log('[Avatar] ✅ Head bone found:', child.name);
          }
        }

        // Look for meshes with morph targets
        if (child instanceof THREE.SkinnedMesh || child instanceof THREE.Mesh) {
          const mesh = child as THREE.SkinnedMesh | THREE.Mesh;
          if (mesh.morphTargetDictionary && mesh.morphTargetInfluences) {
            if (!morphMeshRef.current) {
              morphMeshRef.current = mesh as THREE.SkinnedMesh;
              // eslint-disable-next-line no-console
              console.log(
                '[Avatar] 🎭 Found morph targets on mesh:',
                mesh.name,
                '- Available targets:',
                Object.keys(mesh.morphTargetDictionary)
              );
            }
          }
        }
      });

      setBonesScanned(true);

      if (!jawBoneRef.current && !morphMeshRef.current) {
        // eslint-disable-next-line no-console
        console.warn(
          '[Avatar] ⚠️ No jaw bone or morph targets found - using fallback animation'
        );
      } else if (morphMeshRef.current) {
        // eslint-disable-next-line no-console
        console.log('[Avatar] ✅ Will use morph target animation for lip-sync');
      } else if (jawBoneRef.current) {
        // eslint-disable-next-line no-console
        console.log('[Avatar] ✅ Will use jaw bone animation for lip-sync');
      }
    }
  }, [scene, bonesScanned]);

  // Animation loop
  useFrame(state => {
    if (!groupRef.current || !scene) return;

    const elapsed = state.clock.elapsedTime;

    // Subtle breathing animation (always active)
    groupRef.current.position.y = Math.sin(elapsed * 0.5) * 0.02;

    // Speaking animation
    if (isSpeaking) {
      // Get real-time audio analysis if available
      let audioWeights: VisemeWeights = {};
      if (analyzerRef.current) {
        audioWeights = analyzerRef.current.getVisemeWeights();
      }

      // Priority 1: Try morph target animation with audio analysis
      if (morphMeshRef.current?.morphTargetDictionary) {
        const dict = morphMeshRef.current.morphTargetDictionary;
        const influences = morphMeshRef.current.morphTargetInfluences;

        if (influences) {
          // Use audio-derived weights if available, else fallback to sine wave
          const useAudioAnalysis =
            Object.keys(audioWeights).length > 0 &&
            audioWeights.jawOpen !== undefined;

          if (useAudioAnalysis) {
            // Apply audio-derived viseme weights
            Object.entries(audioWeights).forEach(([viseme, weight]) => {
              const idx = dict[viseme];
              if (idx !== undefined && weight !== undefined) {
                influences[idx] = weight;
              }
            });

            // Debug logging (throttled to every 1 second)
            const now = Date.now();
            if (now - lastDebugLog.current > 1000) {
              const appliedWeights: Record<string, string> = {};
              Object.entries(audioWeights).forEach(([viseme, weight]) => {
                if (weight !== undefined && weight > 0.05) {
                  appliedWeights[viseme] = weight.toFixed(3);
                }
              });
              if (Object.keys(appliedWeights).length > 0) {
                // eslint-disable-next-line no-console
                console.log(
                  '[Avatar Debug] Applied morph targets:',
                  appliedWeights
                );
              }
              lastDebugLog.current = now;
            }
          } else {
            // Fallback: sine wave for rhythmic mouth movement
            const mouthValue = Math.sin(elapsed * 8) * 0.5 + 0.5; // 0 to 1
            const jawOpenIdx = dict['jawOpen'];
            const mouthOpenIdx = dict['mouthOpen'];

            if (jawOpenIdx !== undefined) {
              influences[jawOpenIdx] = mouthValue * 0.6;
            } else if (mouthOpenIdx !== undefined) {
              influences[mouthOpenIdx] = mouthValue * 0.6;
            }
          }
        }
      }
      // Priority 2: Try jaw bone rotation
      else if (jawBoneRef.current) {
        const jawRotation =
          audioWeights.jawOpen !== undefined
            ? audioWeights.jawOpen * 0.3
            : Math.sin(elapsed * 8) * 0.15;
        jawBoneRef.current.rotation.x = jawRotation;
      }
      // Priority 3: Fallback to whole head rotation
      else if (groupRef.current) {
        groupRef.current.rotation.x = Math.sin(elapsed * 8) * 0.03;
      }

      // Subtle head nod while speaking
      if (headBoneRef.current) {
        headBoneRef.current.rotation.x = Math.sin(elapsed * 2) * 0.03;
      }
    } else {
      // Idle: reset animations
      if (morphMeshRef.current?.morphTargetInfluences) {
        const dict = morphMeshRef.current.morphTargetDictionary;
        const influences = morphMeshRef.current.morphTargetInfluences;

        if (dict && influences) {
          // Reset all morph targets
          Object.keys(dict).forEach(key => {
            const idx = dict[key];
            if (idx !== undefined) {
              influences[idx] = 0;
            }
          });
        }
      }

      if (jawBoneRef.current) {
        jawBoneRef.current.rotation.x = 0;
      }

      // Idle: gentle head sway
      if (headBoneRef.current) {
        headBoneRef.current.rotation.y = Math.sin(elapsed * 0.3) * 0.05;
      } else if (groupRef.current) {
        groupRef.current.rotation.y = Math.sin(elapsed * 0.3) * 0.1;
      }
    }
  });

  if (!scene) {
    return null;
  }

  return (
    <group ref={groupRef}>
      {/* Position avatar higher to show seated upper body, scale to fill frame better */}
      <primitive object={scene} scale={2.0} position={[0, -2.5, 0]} />
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
  audioStream,
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
        {/* Brighter lighting setup for better visibility */}
        <ambientLight intensity={0.8} />
        <directionalLight position={[5, 5, 5]} intensity={1.2} castShadow />
        <directionalLight position={[-3, 3, 3]} intensity={0.6} />
        <pointLight position={[-5, 5, -5]} intensity={0.5} />
        <pointLight position={[0, 2, 2]} intensity={0.4} color="#ffffff" />

        {/* Avatar with Suspense for loading */}
        <Suspense fallback={<LoadingPlaceholder />}>
          <Avatar isSpeaking={isSpeaking} audioStream={audioStream} />
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
