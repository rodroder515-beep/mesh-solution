import { useState, useRef, useCallback, useEffect } from 'react';

export type RecorderState = 'idle' | 'recording' | 'processing' | 'error';

interface UseRecorderOptions {
  onRecordingComplete?: (blob: Blob) => void;
  onError?: (error: Error) => void;
}

export function useRecorder({ onRecordingComplete, onError }: UseRecorderOptions = {}) {
  const [state, setState] = useState<RecorderState>('idle');
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [recordingDuration, setRecordingDuration] = useState<number>(0);

  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);
  const streamRef = useRef<MediaStream | null>(null);
  const timerRef = useRef<number | null>(null);

  const clearTimer = () => {
    if (timerRef.current !== null) {
      window.clearInterval(timerRef.current);
      timerRef.current = null;
    }
  };

  const cleanupStream = () => {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach((track) => track.stop());
      streamRef.current = null;
    }
    clearTimer();
  };

  const resetError = useCallback(() => {
    setErrorMessage(null);
    setState('idle');
  }, []);

  const startRecording = useCallback(async () => {
    if (state === 'recording' || state === 'processing') return;

    resetError();
    audioChunksRef.current = [];
    setRecordingDuration(0);

    if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
      const err = new Error('Microphone API is not supported in this browser environment.');
      setErrorMessage(err.message);
      setState('error');
      onError?.(err);
      return;
    }

    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        audio: {
          echoCancellation: true,
          noiseSuppression: true,
          autoGainControl: true,
        },
      });
      streamRef.current = stream;

      // Determine supported mime type
      let mimeType = 'audio/webm';
      if (MediaRecorder.isTypeSupported('audio/webm;codecs=opus')) {
        mimeType = 'audio/webm;codecs=opus';
      } else if (MediaRecorder.isTypeSupported('audio/ogg;codecs=opus')) {
        mimeType = 'audio/ogg;codecs=opus';
      } else if (MediaRecorder.isTypeSupported('audio/mp4')) {
        mimeType = 'audio/mp4';
      }

      const recorder = new MediaRecorder(stream, { mimeType });
      mediaRecorderRef.current = recorder;

      recorder.ondataavailable = (event) => {
        if (event.data && event.data.size > 0) {
          audioChunksRef.current.push(event.data);
        }
      };

      recorder.onerror = (event) => {
        console.error('MediaRecorder error event:', event);
        const error = new Error('Recording session encountered a device error.');
        setErrorMessage(error.message);
        setState('error');
        cleanupStream();
        onError?.(error);
      };

      recorder.start(100); // 100ms chunks
      setState('recording');

      // Start duration counter
      const startTime = Date.now();
      timerRef.current = window.setInterval(() => {
        setRecordingDuration(Math.floor((Date.now() - startTime) / 1000));
      }, 250);
    } catch (err: unknown) {
      cleanupStream();
      let msg = "Couldn't access microphone.";
      if (err instanceof DOMException) {
        if (err.name === 'NotAllowedError' || err.name === 'PermissionDeniedError') {
          msg = 'Microphone permission denied. Please allow microphone access in browser settings.';
        } else if (err.name === 'NotFoundError' || err.name === 'DevicesNotFoundError') {
          msg = 'No microphone device found on this system.';
        } else if (err.name === 'NotReadableError') {
          msg = 'Microphone is already in use by another application.';
        }
      } else if (err instanceof Error) {
        msg = err.message;
      }
      setErrorMessage(msg);
      setState('error');
      onError?.(err instanceof Error ? err : new Error(msg));
    }
  }, [state, resetError, onError]);

  const stopRecording = useCallback((): Promise<Blob | null> => {
    return new Promise((resolve) => {
      const recorder = mediaRecorderRef.current;
      if (!recorder || recorder.state === 'inactive') {
        cleanupStream();
        setState('idle');
        resolve(null);
        return;
      }

      setState('processing');
      clearTimer();

      recorder.onstop = () => {
        const mimeType = recorder.mimeType || 'audio/webm';
        const audioBlob = new Blob(audioChunksRef.current, { type: mimeType });
        cleanupStream();

        if (audioBlob.size < 500) {
          // Empty or near-empty recording
          const err = new Error("Couldn't hear that. Audio was too short or silent.");
          setErrorMessage(err.message);
          setState('error');
          onError?.(err);
          resolve(null);
          return;
        }

        onRecordingComplete?.(audioBlob);
        resolve(audioBlob);
      };

      try {
        recorder.stop();
      } catch (err) {
        cleanupStream();
        const error = err instanceof Error ? err : new Error('Failed to stop recording');
        setErrorMessage(error.message);
        setState('error');
        resolve(null);
      }
    });
  }, [onRecordingComplete, onError]);

  const cancelRecording = useCallback(() => {
    if (mediaRecorderRef.current && mediaRecorderRef.current.state !== 'inactive') {
      try {
        mediaRecorderRef.current.stop();
      } catch {
        // ignore
      }
    }
    cleanupStream();
    audioChunksRef.current = [];
    setState('idle');
  }, []);

  const setProcessingState = useCallback(() => {
    setState('processing');
  }, []);

  const setIdleState = useCallback(() => {
    setState('idle');
  }, []);

  useEffect(() => {
    return () => {
      cleanupStream();
    };
  }, []);

  return {
    state,
    errorMessage,
    recordingDuration,
    startRecording,
    stopRecording,
    cancelRecording,
    resetError,
    setProcessingState,
    setIdleState,
  };
}
