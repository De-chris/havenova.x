import { useState, useRef, useCallback } from 'react';
import type { RecordingState } from '@/types';

export const useRecording = () => {
  const [state, setState] = useState<RecordingState>({
    isRecording: false,
    duration: 0,
    mediaType: null,
    chunks: [],
  });
  
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const chunksRef = useRef<Blob[]>([]);

  const startRecording = useCallback(async (type: 'audio' | 'video') => {
    try {
      const constraints: MediaStreamConstraints = type === 'video' 
        ? { video: true, audio: true }
        : { audio: true };
      
      const stream = await navigator.mediaDevices.getUserMedia(constraints);
      streamRef.current = stream;
      
      const mimeType = type === 'video' 
        ? 'video/webm;codecs=vp9,opus'
        : 'audio/webm;codecs=opus';
      
      const mediaRecorder = new MediaRecorder(stream, { mimeType });
      mediaRecorderRef.current = mediaRecorder;
      chunksRef.current = [];
      
      mediaRecorder.ondataavailable = (e) => {
        if (e.data.size > 0) {
          chunksRef.current.push(e.data);
        }
      };
      
      mediaRecorder.start(100);
      
      setState({
        isRecording: true,
        duration: 0,
        mediaType: type,
        chunks: [],
        stream,
        recorder: mediaRecorder,
      });
      
      // Start duration timer
      timerRef.current = setInterval(() => {
        setState(prev => ({ ...prev, duration: prev.duration + 1 }));
      }, 1000);
      
      return true;
    } catch (error) {
      console.error('Recording error:', error);
      return false;
    }
  }, []);

  const stopRecording = useCallback(async (): Promise<{ blob: Blob; url: string; type: 'audio' | 'video' } | null> => {
    return new Promise((resolve) => {
      if (!mediaRecorderRef.current) {
        resolve(null);
        return;
      }
      
      const mediaType = state.mediaType!;
      
      mediaRecorderRef.current.onstop = () => {
        const blob = new Blob(chunksRef.current, { 
          type: mediaType === 'video' ? 'video/webm' : 'audio/webm' 
        });
        const url = URL.createObjectURL(blob);
        
        // Stop all tracks
        streamRef.current?.getTracks().forEach(track => track.stop());
        
        if (timerRef.current) {
          clearInterval(timerRef.current);
        }
        
        setState({
          isRecording: false,
          duration: 0,
          mediaType: null,
          chunks: [],
        });
        
        resolve({ blob, url, type: mediaType });
      };
      
      mediaRecorderRef.current.stop();
    });
  }, [state.mediaType]);

  const cancelRecording = useCallback(() => {
    if (mediaRecorderRef.current) {
      mediaRecorderRef.current.stop();
    }
    
    streamRef.current?.getTracks().forEach(track => track.stop());
    
    if (timerRef.current) {
      clearInterval(timerRef.current);
    }
    
    setState({
      isRecording: false,
      duration: 0,
      mediaType: null,
      chunks: [],
    });
  }, []);

  return {
    ...state,
    startRecording,
    stopRecording,
    cancelRecording,
  };
};

export default useRecording;
