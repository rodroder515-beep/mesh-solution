import React, { useState, useEffect, useRef } from 'react';
import { Play, Pause, RotateCcw, Volume2, AlertCircle } from 'lucide-react';
import { base64ToAudioUrl } from '../../utils/audio';

interface AudioPlayerProps {
  base64Audio?: string;
  blobUrl?: string;
  format?: string;
  autoPlay?: boolean;
}

export const AudioPlayer: React.FC<AudioPlayerProps> = ({
  base64Audio,
  blobUrl,
  format = 'mp3',
  autoPlay = false,
}) => {
  const [isPlaying, setIsPlaying] = useState<boolean>(false);
  const [audioUrl, setAudioUrl] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [currentTime, setCurrentTime] = useState<number>(0);
  const [duration, setDuration] = useState<number>(0);

  const audioRef = useRef<HTMLAudioElement | null>(null);

  // Initialize audio URL from base64 or blobUrl
  useEffect(() => {
    let createdUrl: string | null = null;

    if (blobUrl) {
      setAudioUrl(blobUrl);
    } else if (base64Audio) {
      try {
        createdUrl = base64ToAudioUrl(base64Audio, format);
        setAudioUrl(createdUrl);
        setError(null);
      } catch {
        setError('Audio format not supported or data corrupted.');
      }
    } else {
      setAudioUrl(null);
    }

    return () => {
      if (createdUrl) {
        URL.revokeObjectURL(createdUrl);
      }
    };
  }, [base64Audio, blobUrl, format]);

  // Handle HTMLAudioElement lifecycle
  useEffect(() => {
    const audio = audioRef.current;
    if (!audio) return;

    const handlePlay = () => setIsPlaying(true);
    const handlePause = () => setIsPlaying(false);
    const handleEnded = () => {
      setIsPlaying(false);
      setCurrentTime(0);
    };
    const handleTimeUpdate = () => setCurrentTime(audio.currentTime);
    const handleLoadedMetadata = () => {
      setDuration(audio.duration || 0);
      if (autoPlay) {
        audio.play().catch(() => {
          // Autoplay policy blocked; user must interact
          setIsPlaying(false);
        });
      }
    };
    const handleError = () => {
      setError('Failed to play audio stream.');
      setIsPlaying(false);
    };

    audio.addEventListener('play', handlePlay);
    audio.addEventListener('pause', handlePause);
    audio.addEventListener('ended', handleEnded);
    audio.addEventListener('timeupdate', handleTimeUpdate);
    audio.addEventListener('loadedmetadata', handleLoadedMetadata);
    audio.addEventListener('error', handleError);

    return () => {
      audio.removeEventListener('play', handlePlay);
      audio.removeEventListener('pause', handlePause);
      audio.removeEventListener('ended', handleEnded);
      audio.removeEventListener('timeupdate', handleTimeUpdate);
      audio.removeEventListener('loadedmetadata', handleLoadedMetadata);
      audio.removeEventListener('error', handleError);
    };
  }, [audioUrl, autoPlay]);

  if (error) {
    return (
      <div className="flex items-center space-x-2 text-xs text-[#9A453D] bg-[#FDF3F2] p-2 border border-[#9A453D]/30 mt-2">
        <AlertCircle className="w-4 h-4 shrink-0 text-[#9A453D]" />
        <span>{error}</span>
      </div>
    );
  }

  if (!audioUrl) {
    return null;
  }

  const togglePlayPause = () => {
    const audio = audioRef.current;
    if (!audio) return;

    if (isPlaying) {
      audio.pause();
    } else {
      audio.play().catch((err) => {
        console.error('Audio playback error:', err);
        setError('Playback failed. Tap to retry.');
      });
    }
  };

  const handleReplay = () => {
    const audio = audioRef.current;
    if (!audio) return;
    audio.currentTime = 0;
    audio.play().catch((err) => {
      console.error('Audio replay error:', err);
    });
  };

  return (
    <div className="mt-3 flex flex-wrap items-center gap-3 pt-2 border-t border-[#D8CCBC]">
      <audio ref={audioRef} src={audioUrl} preload="auto" />

      {/* Main Play/Pause Button with Chamfer */}
      <button
        type="button"
        onClick={togglePlayPause}
        aria-label={isPlaying ? 'Pause assistant audio' : 'Play assistant audio'}
        className={`chamfer-btn-sm inline-flex items-center space-x-2 px-3.5 py-1.5 text-xs font-bold uppercase tracking-wider transition-colors cursor-pointer ${
          isPlaying
            ? 'bg-[#64756A] text-[#FFFDF8]'
            : 'bg-[#704832] text-[#FFFDF8] hover:bg-[#865A40]'
        }`}
      >
        {isPlaying ? (
          <>
            <Pause className="w-3.5 h-3.5 fill-current" />
            <span>PAUSE</span>
          </>
        ) : (
          <>
            <Play className="w-3.5 h-3.5 fill-current" />
            <span>PLAY VOICE</span>
          </>
        )}
      </button>

      {/* Replay Button */}
      <button
        type="button"
        onClick={handleReplay}
        title="Replay from start"
        aria-label="Replay audio from start"
        className="p-1.5 text-[#756A60] hover:text-[#704832] transition-colors cursor-pointer"
      >
        <RotateCcw className="w-3.5 h-3.5" />
      </button>

      {/* Audio Waveform Indicator */}
      <div className="flex items-center space-x-1.5 px-2 py-1 bg-[#E9DDCA]/60 border border-[#D8CCBC] rounded-xs">
        <Volume2 className={`w-3.5 h-3.5 ${isPlaying ? 'text-[#64756A]' : 'text-[#756A60]'}`} />
        <div className="flex items-end h-4 space-x-0.5 px-1">
          <span
            className={`w-1 rounded-xs bg-[#64756A] ${isPlaying ? 'animate-waveform-1' : 'h-1'}`}
          />
          <span
            className={`w-1 rounded-xs bg-[#64756A] ${isPlaying ? 'animate-waveform-2' : 'h-2'}`}
          />
          <span
            className={`w-1 rounded-xs bg-[#64756A] ${isPlaying ? 'animate-waveform-3' : 'h-1.5'}`}
          />
          <span
            className={`w-1 rounded-xs bg-[#64756A] ${isPlaying ? 'animate-waveform-4' : 'h-1'}`}
          />
        </div>
        <span className="text-[10px] font-mono text-[#756A60] ml-1">
          {Math.floor(currentTime)}s / {Math.max(1, Math.floor(duration))}s
        </span>
      </div>
    </div>
  );
};
