import { useState, useRef, useCallback, useEffect } from 'react';

interface AudioPlayerState {
  isPlaying: boolean;
  currentTime: number;
  duration: number;
  progress: number;
}

export const useAudioPlayer = () => {
  const [state, setState] = useState<AudioPlayerState>({
    isPlaying: false,
    currentTime: 0,
    duration: 0,
    progress: 0,
  });
  
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const animationFrameRef = useRef<number | null>(null);

  const load = useCallback((url: string) => {
    if (audioRef.current) {
      audioRef.current.pause();
      audioRef.current.src = url;
    } else {
      audioRef.current = new Audio(url);
    }
    
    audioRef.current.onloadedmetadata = () => {
      setState(prev => ({
        ...prev,
        duration: audioRef.current?.duration || 0,
      }));
    };
    
    audioRef.current.onended = () => {
      setState(prev => ({
        ...prev,
        isPlaying: false,
        currentTime: 0,
        progress: 0,
      }));
    };
  }, []);

  const play = useCallback(() => {
    if (audioRef.current) {
      audioRef.current.play();
      setState(prev => ({ ...prev, isPlaying: true }));
      
      const updateProgress = () => {
        if (audioRef.current) {
          const currentTime = audioRef.current.currentTime;
          const duration = audioRef.current.duration;
          setState(prev => ({
            ...prev,
            currentTime,
            progress: duration ? (currentTime / duration) * 100 : 0,
          }));
        }
        animationFrameRef.current = requestAnimationFrame(updateProgress);
      };
      
      animationFrameRef.current = requestAnimationFrame(updateProgress);
    }
  }, []);

  const pause = useCallback(() => {
    if (audioRef.current) {
      audioRef.current.pause();
      setState(prev => ({ ...prev, isPlaying: false }));
      
      if (animationFrameRef.current) {
        cancelAnimationFrame(animationFrameRef.current);
      }
    }
  }, []);

  const toggle = useCallback(() => {
    if (state.isPlaying) {
      pause();
    } else {
      play();
    }
  }, [state.isPlaying, play, pause]);

  const seek = useCallback((progress: number) => {
    if (audioRef.current && audioRef.current.duration) {
      const time = (progress / 100) * audioRef.current.duration;
      audioRef.current.currentTime = time;
      setState(prev => ({
        ...prev,
        currentTime: time,
        progress,
      }));
    }
  }, []);

  useEffect(() => {
    return () => {
      if (audioRef.current) {
        audioRef.current.pause();
        audioRef.current = null;
      }
      if (animationFrameRef.current) {
        cancelAnimationFrame(animationFrameRef.current);
      }
    };
  }, []);

  return {
    ...state,
    load,
    play,
    pause,
    toggle,
    seek,
  };
};

export default useAudioPlayer;
