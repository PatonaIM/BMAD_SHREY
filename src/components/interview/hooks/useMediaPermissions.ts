/**
 * useMediaPermissions Hook
 * Manages camera and microphone permission state and requests
 */

import { useState, useCallback } from 'react';

export interface MediaPermissionsState {
  camera: PermissionState | 'unknown';
  microphone: PermissionState | 'unknown';
  isChecking: boolean;
  error: string | null;
}

export interface UseMediaPermissionsReturn extends MediaPermissionsState {
  requestPermissions: () => Promise<boolean>;
  checkPermissions: () => Promise<void>;
}

export function useMediaPermissions(): UseMediaPermissionsReturn {
  const [state, setState] = useState<MediaPermissionsState>({
    camera: 'unknown',
    microphone: 'unknown',
    isChecking: false,
    error: null,
  });

  const checkPermissions = useCallback(async () => {
    setState(prev => ({ ...prev, isChecking: true, error: null }));

    try {
      if (!navigator.permissions) {
        setState(prev => ({ ...prev, isChecking: false }));
        return;
      }

      const [cameraPermission, microphonePermission] = await Promise.all([
        navigator.permissions.query({ name: 'camera' as PermissionName }),
        navigator.permissions.query({ name: 'microphone' as PermissionName }),
      ]);

      setState({
        camera: cameraPermission.state,
        microphone: microphonePermission.state,
        isChecking: false,
        error: null,
      });

      // Listen for permission changes
      cameraPermission.onchange = () => {
        setState(prev => ({
          ...prev,
          camera: cameraPermission.state,
        }));
      };

      microphonePermission.onchange = () => {
        setState(prev => ({
          ...prev,
          microphone: microphonePermission.state,
        }));
      };
    } catch (error) {
      setState(prev => ({
        ...prev,
        isChecking: false,
        error:
          error instanceof Error
            ? error.message
            : 'Failed to check permissions',
      }));
    }
  }, []);

  const requestPermissions = useCallback(async (): Promise<boolean> => {
    setState(prev => ({ ...prev, isChecking: true, error: null }));

    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: true,
        audio: true,
      });

      // Stop all tracks immediately after permission is granted
      stream.getTracks().forEach(track => track.stop());

      setState(prev => ({
        ...prev,
        camera: 'granted',
        microphone: 'granted',
        isChecking: false,
        error: null,
      }));

      return true;
    } catch (error) {
      setState(prev => ({
        ...prev,
        isChecking: false,
        error:
          error instanceof Error
            ? error.message
            : 'Failed to request permissions',
      }));

      return false;
    }
  }, []);

  return {
    ...state,
    requestPermissions,
    checkPermissions,
  };
}
