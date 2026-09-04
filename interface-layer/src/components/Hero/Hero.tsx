import React from 'react';

interface HeroProps {
  hasConversation?: boolean;
}

export const Hero: React.FC<HeroProps> = ({ hasConversation = false }) => {
  return (
    <div
      className={`transition-all duration-300 ${
        hasConversation ? 'py-4 sm:py-6' : 'py-8 sm:py-12'
      }`}
    >
      <div className="max-w-3xl">
        {/* Editorial Subtitle Eyebrow */}
        <div className="flex items-center space-x-2 text-xs font-mono uppercase tracking-widest text-[#756A60] mb-3">
          <span className="w-2 h-2 bg-[#704832] inline-block" />
          <span>VOICE-FIRST STORE ASSISTANT</span>
          <span className="text-[#D8CCBC]">/</span>
          <span className="text-[#704832] font-bold">INTERNAL TEST LAYER</span>
        </div>

        {/* Targo-style Staircase / Indented Headline */}
        <div className="targo-heading text-[#241C17] select-none font-bold">
          <div className="text-4xl sm:text-6xl md:text-7xl tracking-tighter text-[#241C17]">
            YOUR
          </div>
          <div className="text-4xl sm:text-6xl md:text-7xl tracking-tighter pl-6 sm:pl-12 md:pl-16 text-[#241C17]">
            STORE
          </div>
          <div className="text-4xl sm:text-6xl md:text-7xl tracking-tighter pl-12 sm:pl-24 md:pl-32 text-[#241C17]">
            ASSISTANT<span className="text-[#B96F4A]">.</span>
          </div>
        </div>

        {/* Supporting Line */}
        <div className="mt-5 flex flex-wrap items-center gap-2 text-sm sm:text-base font-bold uppercase tracking-wider text-[#241C17]">
          <span className="text-[#704832]">ASK.</span>
          <span>CONFIRM.</span>
          <span className="text-[#241C17]">GET IT DONE.</span>
          <span className="text-[#756A60] font-normal text-xs normal-case ml-2 hidden sm:inline">
            — Speak naturally in English, Kannada, Hindi, or Malayalam.
          </span>
        </div>
      </div>
    </div>
  );
};
