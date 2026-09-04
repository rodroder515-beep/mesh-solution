import React, { useState, useRef, useEffect } from 'react';
import { Send, CornerDownLeft } from 'lucide-react';
import { MicButton } from '../MicButton/MicButton';
import { RecorderState } from '../../hooks/useRecorder';
import { SupportedLanguage } from '../../types/api';

interface InputBarProps {
  onSendText: (text: string) => void;
  recorderState: RecorderState;
  recorderDuration: number;
  recorderError: string | null;
  onStartRecording: () => void;
  onStopRecording: () => void;
  onRetryRecording: () => void;
  isProcessing: boolean;
  currentLanguage: SupportedLanguage;
}

export const InputBar: React.FC<InputBarProps> = ({
  onSendText,
  recorderState,
  recorderDuration,
  recorderError,
  onStartRecording,
  onStopRecording,
  onRetryRecording,
  isProcessing,
  currentLanguage,
}) => {
  const [text, setText] = useState('');
  const textareaRef = useRef<HTMLTextAreaElement | null>(null);

  // Auto resize textarea
  useEffect(() => {
    if (textareaRef.current) {
      textareaRef.current.style.height = 'auto';
      textareaRef.current.style.height = `${Math.min(textareaRef.current.scrollHeight, 120)}px`;
    }
  }, [text]);

  const handleSubmit = (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    const trimmed = text.trim();
    if (!trimmed || isProcessing) return;

    onSendText(trimmed);
    setText('');
    if (textareaRef.current) {
      textareaRef.current.style.height = 'auto';
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSubmit();
    }
  };

  const getLanguageHint = (lang: SupportedLanguage) => {
    switch (lang) {
      case 'kn':
        return 'ಕನ್ನಡದಲ್ಲಿ ಮಾತನಾಡಿ ಅಥವಾ ಟೈಪ್ ಮಾಡಿ...';
      case 'hi':
        return 'हिंदी में बोलें या टाइप करें...';
      case 'ml':
        return 'മലയാളത്തിൽ സംസാരിക്കുക അല്ലെങ്കിൽ ടൈപ്പ് ചെയ്യുക...';
      default:
        return 'Ask about stock, orders, prices... (or tap microphone to speak)';
    }
  };

  return (
    <div className="w-full bg-[#F3EBDD] border-t border-[#D8CCBC] pt-4 pb-6 px-4 sm:px-6">
      <div className="max-w-3xl mx-auto space-y-4">
        {/* Prominent Voice-First Microphone Section */}
        <div className="flex justify-center">
          <MicButton
            state={recorderState}
            duration={recorderDuration}
            errorMessage={recorderError}
            onStart={onStartRecording}
            onStop={onStopRecording}
            onRetry={onRetryRecording}
            disabled={isProcessing}
          />
        </div>

        {/* Fallback Text Input Form */}
        <form
          onSubmit={handleSubmit}
          className="relative flex items-end gap-2 bg-[#FFFDF8] p-2 border border-[#D8CCBC] focus-within:border-[#704832] transition-all shadow-xs"
        >
          <div className="flex-1 min-w-0">
            <textarea
              ref={textareaRef}
              rows={1}
              value={text}
              disabled={isProcessing || recorderState === 'recording'}
              onChange={(e) => setText(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder={getLanguageHint(currentLanguage)}
              aria-label="Type your store query or command"
              className="w-full resize-none bg-transparent px-3 py-2 text-sm text-[#241C17] placeholder-[#756A60] focus:outline-hidden disabled:opacity-50 font-normal leading-relaxed"
            />
          </div>

          {/* Send Button */}
          <button
            type="submit"
            disabled={!text.trim() || isProcessing || recorderState === 'recording'}
            aria-label="Send message"
            className="chamfer-btn-sm px-4 py-2.5 bg-[#704832] text-[#FFFDF8] hover:bg-[#865A40] disabled:opacity-30 disabled:hover:bg-[#704832] transition-all font-bold text-xs uppercase tracking-wider flex items-center gap-1.5 cursor-pointer disabled:cursor-not-allowed shrink-0"
          >
            <span className="hidden sm:inline">SEND</span>
            <Send className="w-3.5 h-3.5" />
          </button>
        </form>

        {/* Quick Keyboard Hint */}
        <div className="flex items-center justify-between text-[11px] font-mono text-[#756A60] px-1">
          <div className="flex items-center gap-1">
            <CornerDownLeft className="w-3 h-3 text-[#704832]" />
            <span>Enter to submit • Shift+Enter for new line</span>
          </div>
          <span className="uppercase text-[10px] tracking-wider text-[#704832] font-bold">
            Target: Language Layer (Chunk 2)
          </span>
        </div>
      </div>
    </div>
  );
};
