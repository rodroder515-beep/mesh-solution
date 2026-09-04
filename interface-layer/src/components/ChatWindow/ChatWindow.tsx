import React, { useEffect, useRef } from 'react';
import { ChatMessage } from '../../types/messages';
import { AudioPlayer } from '../AudioPlayer/AudioPlayer';
import { ConfirmationDialog } from '../ConfirmationDialog/ConfirmationDialog';
import { WriteActionType } from '../../types/api';
import { AlertCircle, RotateCcw, Sparkles, CheckCircle2, XCircle } from 'lucide-react';

interface ChatWindowProps {
  messages: ChatMessage[];
  isLoading: boolean;
  activeConfirmation?: {
    action: WriteActionType;
    prompt: string;
    details?: string;
  } | null;
  onConfirmAction: () => void;
  onCancelAction: () => void;
  isConfirmationProcessing?: boolean;
  onRetryLastMessage?: () => void;
  onQuickPrompt?: (text: string) => void;
}

export const ChatWindow: React.FC<ChatWindowProps> = ({
  messages,
  isLoading,
  activeConfirmation,
  onConfirmAction,
  onCancelAction,
  isConfirmationProcessing = false,
  onRetryLastMessage,
  onQuickPrompt,
}) => {
  const bottomRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, isLoading, activeConfirmation]);

  return (
    <div
      className="flex-1 w-full flex flex-col justify-between"
      role="log"
      aria-live="polite"
      aria-label="Store Assistant conversation"
    >
      {/* Empty State / Suggested Prompts */}
      {messages.length === 0 && !isLoading && (
        <div className="py-6 sm:py-10 border border-[#D8CCBC] bg-[#FFFDF8] p-6 sm:p-8 chamfer-panel shadow-xs">
          <div className="flex items-center space-x-2 text-xs font-mono uppercase tracking-widest text-[#704832] mb-2 font-bold">
            <Sparkles className="w-4 h-4 text-[#704832]" />
            <span>QUICK STORE TEST PROMPTS</span>
          </div>
          <p className="text-xs sm:text-sm text-[#756A60] mb-5">
            Select a sample query or speak/type directly into the assistant:
          </p>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {[
              {
                label: 'Query Inventory',
                text: 'How much sugar do we have?',
                desc: 'Read action (Test 1)',
              },
              {
                label: 'Stock Update',
                text: 'Add 20 kg sugar to stock',
                desc: 'Write action (Test 4)',
              },
              {
                label: 'Purchase Order',
                text: 'Place an order for 50 packets of atta',
                desc: 'Write action (Test 4)',
              },
              {
                label: 'Create Invoice',
                text: 'Create a bill for 3 items',
                desc: 'Write action (Test 4)',
              },
            ].map((item, idx) => (
              <button
                key={idx}
                type="button"
                onClick={() => onQuickPrompt?.(item.text)}
                className="text-left p-3.5 bg-[#FFFDF8] hover:bg-[#E9DDCA]/60 group border border-[#D8CCBC] hover:border-[#704832] transition-all cursor-pointer shadow-xs"
              >
                <div className="flex items-center justify-between">
                  <span className="text-xs font-extrabold uppercase tracking-wider text-[#241C17] group-hover:text-[#704832] transition-colors">
                    {item.label}
                  </span>
                  <span className="text-[10px] font-mono text-[#756A60] group-hover:text-[#241C17]">
                    {item.desc}
                  </span>
                </div>
                <div className="text-xs text-[#756A60] group-hover:text-[#241C17] mt-1 font-mono">
                  "{item.text}"
                </div>
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Messages Stream */}
      <div className="space-y-6">
        {messages.map((msg) => {
          const isUser = msg.sender === 'user';
          const isError = msg.status === 'error';

          return (
            <div
              key={msg.id}
              className={`transition-all ${
                isUser ? 'pl-4 sm:pl-10 text-right' : 'pr-4 sm:pr-10 text-left'
              }`}
            >
              {/* Sender & Timestamp Label */}
              <div
                className={`flex items-center space-x-2 text-[11px] font-mono uppercase tracking-wider mb-1.5 ${
                  isUser
                    ? 'justify-end text-[#756A60]'
                    : 'justify-start text-[#82705F] font-bold'
                }`}
              >
                {!isUser && <span className="w-2 h-2 bg-[#82705F] inline-block" />}
                <span>{isUser ? 'YOU' : 'ASSISTANT'}</span>
                <span className="text-[#D8CCBC] font-normal">/</span>
                <span className="text-[#756A60] font-normal">{msg.timestamp}</span>
                {msg.language && msg.language !== 'en' && (
                  <span className="px-1.5 py-0.2 bg-[#E9DDCA] text-[#704832] text-[10px] font-mono border border-[#D8CCBC]">
                    {msg.language.toUpperCase()}
                  </span>
                )}
              </div>

              {/* Message Content Body */}
              <div
                className={`inline-block max-w-2xl text-left p-4 sm:p-5 border transition-all ${
                  isUser
                    ? 'bg-[#241C17] text-[#FFFDF8] border-[#3E322A] chamfer-panel shadow-xs'
                    : isError
                    ? 'bg-[#FDF3F2] text-[#9A453D] border border-[#9A453D]/30 shadow-xs'
                    : 'bg-[#FFFDF8] text-[#241C17] border border-[#D8CCBC] shadow-xs'
                }`}
              >
                {/* Text Content */}
                <p className="text-sm sm:text-base leading-relaxed whitespace-pre-wrap font-normal">
                  {msg.text}
                </p>

                {/* Error Banner with Retry */}
                {isError && (
                  <div className="mt-3 pt-3 border-t border-[#9A453D]/20 flex items-center justify-between text-xs text-[#9A453D]">
                    <div className="flex items-center gap-1.5">
                      <AlertCircle className="w-4 h-4 text-[#9A453D] shrink-0" />
                      <span>Request could not be delivered to Language Layer.</span>
                    </div>
                    {onRetryLastMessage && (
                      <button
                        type="button"
                        onClick={onRetryLastMessage}
                        className="chamfer-btn-sm px-3 py-1 bg-[#9A453D] text-[#FFFDF8] font-bold text-[10px] uppercase tracking-wider hover:bg-[#833830] flex items-center gap-1 cursor-pointer"
                      >
                        <RotateCcw className="w-3 h-3" />
                        <span>RETRY</span>
                      </button>
                    )}
                  </div>
                )}

                {/* Audio Player if Audio Output available */}
                {msg.audio && (msg.audio.base64 || msg.audio.blobUrl) && (
                  <AudioPlayer
                    base64Audio={msg.audio.base64}
                    blobUrl={msg.audio.blobUrl}
                    format={msg.audio.format || 'mp3'}
                  />
                )}

                {/* Status indicator for write action confirmation outcome */}
                {msg.isConfirmed && (
                  <div className="mt-3 pt-2 border-t border-[#D8CCBC] flex items-center text-xs text-[#55705A] font-mono">
                    <CheckCircle2 className="w-3.5 h-3.5 mr-1.5" />
                    <span>CONFIRMED &amp; EXECUTED</span>
                  </div>
                )}

                {msg.isCancelled && (
                  <div className="mt-3 pt-2 border-t border-[#D8CCBC] flex items-center text-xs text-[#756A60] font-mono">
                    <XCircle className="w-3.5 h-3.5 mr-1.5" />
                    <span>ACTION CANCELLED BY STORE OWNER</span>
                  </div>
                )}
              </div>
            </div>
          );
        })}

        {/* Loading Indicator */}
        {isLoading && (
          <div className="pr-4 sm:pr-10 text-left">
            <div className="flex items-center space-x-2 text-[11px] font-mono uppercase tracking-wider mb-1.5 text-[#82705F] font-bold">
              <span className="w-2 h-2 bg-[#82705F] animate-ping inline-block" />
              <span>ASSISTANT</span>
              <span className="text-[#D8CCBC] font-normal">/</span>
              <span className="text-[#756A60] font-normal">COMMUNICATING</span>
            </div>
            <div className="inline-block p-4 sm:p-5 bg-[#FFFDF8] border border-[#D8CCBC] text-[#756A60] text-xs font-mono shadow-xs">
              <div className="flex items-center space-x-3">
                <span className="w-2 h-2 rounded-full bg-[#704832] animate-bounce" />
                <span className="w-2 h-2 rounded-full bg-[#704832] animate-bounce [animation-delay:0.2s]" />
                <span className="w-2 h-2 rounded-full bg-[#704832] animate-bounce [animation-delay:0.4s]" />
                <span className="uppercase tracking-widest text-[#241C17] font-bold">
                  Awaiting Language Layer Response...
                </span>
              </div>
            </div>
          </div>
        )}

        {/* Active Confirmation Required Dialog */}
        {activeConfirmation && (
          <div className="my-6">
            <ConfirmationDialog
              action={activeConfirmation.action}
              prompt={activeConfirmation.prompt}
              details={activeConfirmation.details}
              isProcessing={isConfirmationProcessing}
              onConfirm={onConfirmAction}
              onCancel={onCancelAction}
            />
          </div>
        )}

        <div ref={bottomRef} />
      </div>
    </div>
  );
};
