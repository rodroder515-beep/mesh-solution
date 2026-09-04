import React from 'react';
import { Mic, MicOff, RotateCw, Square } from 'lucide-react';
import { RecorderState } from '../../hooks/useRecorder';

interface MicButtonProps {
  state: RecorderState;
  duration?: number;
  errorMessage?: string | null;
  onStart: () => void;
  onStop: () => void;
  onRetry: () => void;
  disabled?: boolean;
}

export const MicButton: React.FC<MicButtonProps> = ({
  state,
  duration = 0,
  errorMessage,
  onStart,
  onStop,
  onRetry,
  disabled = false,
}) => {
  const formatDuration = (secs: number) => {
    const mins = Math.floor(secs / 60);
    const s = secs % 60;
    return `${mins}:${s.toString().padStart(2, '0')}`;
  };

  if (state === 'error') {
    return (
      <div className="flex flex-col items-center justify-center p-2 text-center">
        <button
          type="button"
          onClick={onRetry}
          aria-label="Retry voice recording"
          className="chamfer-btn group relative flex items-center justify-center gap-3 px-8 py-4 bg-[#241C17] text-[#FFFDF8] border-2 border-[#9A453D] hover:border-[#B96F4A] transition-all cursor-pointer shadow-lg"
        >
          <MicOff className="w-6 h-6 text-[#9A453D] group-hover:text-[#B96F4A] transition-colors" />
          <div className="text-left">
            <span className="block text-xs font-mono uppercase tracking-widest text-[#9A453D]">
              COULDN'T HEAR THAT
            </span>
            <span className="block text-sm font-bold uppercase tracking-wider text-[#FFFDF8] group-hover:text-[#B96F4A]">
              TAP TO RETRY
            </span>
          </div>
          <RotateCw className="w-4 h-4 ml-2 text-[#756A60] group-hover:text-[#B96F4A] group-hover:rotate-180 transition-all" />
        </button>
        {errorMessage && (
          <p className="mt-2 text-xs text-[#9A453D] max-w-xs font-mono">{errorMessage}</p>
        )}
      </div>
    );
  }

  if (state === 'recording') {
    return (
      <div className="flex flex-col items-center justify-center p-2">
        <button
          type="button"
          onClick={onStop}
          aria-label="Stop voice recording"
          className="chamfer-btn recording-pulse relative flex items-center justify-center gap-4 px-10 py-5 bg-[#64756A] text-[#FFFDF8] border-2 border-[#55705A] hover:bg-[#58685E] transition-all cursor-pointer shadow-xl"
        >
          {/* Pulsing red dot */}
          <span className="w-3.5 h-3.5 rounded-full bg-[#9A453D] animate-ping inline-block absolute left-5" />
          <span className="w-3.5 h-3.5 rounded-full bg-[#9A453D] inline-block" />

          <div className="text-left">
            <span className="block text-xs font-mono uppercase tracking-widest text-[#E9DDCA] opacity-90 font-bold">
              LISTENING... {formatDuration(duration)}
            </span>
            <span className="block text-base font-extrabold uppercase tracking-wider text-[#FFFDF8]">
              TAP TO FINISH SPEAKING
            </span>
          </div>

          <Square className="w-5 h-5 fill-current ml-2 text-[#FFFDF8]" />
        </button>
        <span className="text-[11px] font-mono text-[#756A60] mt-2 uppercase tracking-wider">
          Speak now in your chosen language
        </span>
      </div>
    );
  }

  if (state === 'processing') {
    return (
      <div className="flex flex-col items-center justify-center p-2">
        <button
          type="button"
          disabled
          aria-label="Processing audio speech with language layer"
          className="chamfer-btn flex items-center justify-center gap-3 px-10 py-5 bg-[#362B23] text-[#FFFDF8] border border-[#5A483C] opacity-90 cursor-wait shadow-md"
        >
          <RotateCw className="w-5 h-5 text-[#C59A5A] animate-spin" />
          <div className="text-left">
            <span className="block text-xs font-mono uppercase tracking-widest text-[#C59A5A]">
              LANGUAGE LAYER
            </span>
            <span className="block text-sm font-bold uppercase tracking-wider text-[#FFFDF8]">
              PROCESSING...
            </span>
          </div>
        </button>
        <span className="text-[11px] font-mono text-[#756A60] mt-2 uppercase tracking-wider">
          Analyzing request & store context
        </span>
      </div>
    );
  }

  // Idle state
  return (
    <div className="flex flex-col items-center justify-center p-2">
      <button
        type="button"
        onClick={onStart}
        disabled={disabled}
        aria-label="Start voice recording"
        className="chamfer-btn group relative flex items-center justify-center gap-4 px-10 py-5 bg-[#241C17] text-[#FFFDF8] border-2 border-[#241C17] hover:border-[#64756A] hover:bg-[#2D231D] transition-all cursor-pointer shadow-lg active:scale-[0.99] disabled:opacity-50 disabled:cursor-not-allowed"
      >
        <div className="w-10 h-10 rounded-none bg-[#362B23] group-hover:bg-[#64756A] flex items-center justify-center transition-colors">
          <Mic className="w-5 h-5 text-[#D8CCBC] group-hover:text-[#FFFDF8] transition-colors" />
        </div>
        <div className="text-left">
          <span className="block text-xs font-mono uppercase tracking-widest text-[#64756A]">
            VOICE INPUT
          </span>
          <span className="block text-base font-extrabold uppercase tracking-wider text-[#FFFDF8] group-hover:text-[#FFFDF8] transition-colors">
            TAP TO SPEAK
          </span>
        </div>
      </button>
      <span className="text-[11px] font-mono text-[#756A60] mt-2 uppercase tracking-wider">
        Press to ask about stock, orders, or bills
      </span>
    </div>
  );
};
