import React, { useState } from 'react';
import { SessionLogEntry } from '../../types/messages';
import { Terminal, Trash2, Copy, Check, ChevronRight, ChevronDown, AlertCircle } from 'lucide-react';

interface SessionLogProps {
  logs: SessionLogEntry[];
  sessionId: string;
  isOpen: boolean;
  onToggle: () => void;
  onClear: () => void;
}

export const SessionLog: React.FC<SessionLogProps> = ({
  logs,
  sessionId,
  isOpen,
  onToggle,
  onClear,
}) => {
  const [copied, setCopied] = useState(false);
  const [expandedLogId, setExpandedLogId] = useState<string | null>(null);

  const handleCopy = () => {
    const text = logs
      .map(
        (l) =>
          `[${l.timestamp}] ${l.category.padEnd(12)} ${l.summary}${
            l.payload ? ' | ' + JSON.stringify(l.payload) : ''
          }`
      )
      .join('\n');
    navigator.clipboard.writeText(`SESSION ID: ${sessionId}\n\n${text}`);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const getBadgeColor = (category: string) => {
    switch (category) {
      case 'INPUT':
        return 'text-[#D8CCBC] border-[#5A483C] bg-[#362B23]';
      case 'RESPONSE':
        return 'text-[#85A68B] border-[#55705A]/40 bg-[#55705A]/20';
      case 'CONFIRMATION':
        return 'text-[#B96F4A] border-[#B96F4A]/40 bg-[#B96F4A]/15';
      case 'CONFIRMED':
        return 'text-[#85A68B] border-[#55705A]/40 bg-[#55705A]/20';
      case 'CANCELLED':
        return 'text-[#A6998C] border-[#5A483C] bg-[#362B23]';
      case 'ERROR':
        return 'text-[#D87D74] border-[#9A453D]/40 bg-[#9A453D]/20';
      case 'LANGUAGE':
        return 'text-[#C59A5A] border-[#C59A5A]/40 bg-[#C59A5A]/15';
      default:
        return 'text-[#A6998C] border-[#3E322A] bg-[#241C17]';
    }
  };

  return (
    <aside
      className={`border-l border-[#D8CCBC] lg:border-[#3E322A] bg-[#241C17] text-[#FFFDF8] flex flex-col transition-all duration-300 ${
        isOpen
          ? 'w-full lg:w-84 xl:w-96 h-full'
          : 'w-full lg:w-12 h-12 lg:h-full overflow-hidden'
      }`}
      aria-label="Internal session debugging log"
    >
      {/* Panel Header */}
      <div className="flex items-center justify-between p-3.5 border-b border-[#3E322A] bg-[#1C1612] shrink-0">
        <button
          type="button"
          onClick={onToggle}
          aria-expanded={isOpen}
          className="flex items-center space-x-2 text-xs font-bold uppercase tracking-widest text-[#D8CCBC] hover:text-[#FFFDF8] cursor-pointer"
        >
          <Terminal className="w-4 h-4 text-[#C59A5A]" />
          {isOpen && <span>SESSION LOG</span>}
          {!isOpen && <span className="lg:hidden">VIEW SESSION LOG ({logs.length})</span>}
        </button>

        {isOpen && (
          <div className="flex items-center space-x-1.5">
            <button
              type="button"
              onClick={handleCopy}
              disabled={logs.length === 0}
              title="Copy session logs to clipboard"
              aria-label="Copy session logs to clipboard"
              className="p-1.5 text-[#A6998C] hover:text-[#FFFDF8] disabled:opacity-30 cursor-pointer transition-colors"
            >
              {copied ? <Check className="w-3.5 h-3.5 text-[#55705A]" /> : <Copy className="w-3.5 h-3.5" />}
            </button>
            <button
              type="button"
              onClick={onClear}
              disabled={logs.length === 0}
              title="Clear session log"
              aria-label="Clear session log"
              className="p-1.5 text-[#A6998C] hover:text-[#D87D74] disabled:opacity-30 cursor-pointer transition-colors"
            >
              <Trash2 className="w-3.5 h-3.5" />
            </button>
            <button
              type="button"
              onClick={onToggle}
              title="Collapse panel"
              aria-label="Collapse session log panel"
              className="p-1.5 text-[#A6998C] hover:text-[#FFFDF8] cursor-pointer"
            >
              <ChevronRight className="w-4 h-4 hidden lg:block" />
              <ChevronDown className="w-4 h-4 lg:hidden" />
            </button>
          </div>
        )}
      </div>

      {isOpen && (
        <>
          {/* Metadata banner */}
          <div className="px-3.5 py-2.5 bg-[#241C17] border-b border-[#3E322A] text-[11px] font-mono text-[#756A60]">
            <div className="flex items-center justify-between">
              <span>SESSION:</span>
              <span className="text-[#C59A5A] font-bold select-all">{sessionId}</span>
            </div>
            <div className="text-[10px] text-[#A6998C] mt-1 flex items-center gap-1">
              <AlertCircle className="w-3 h-3 text-[#C59A5A] shrink-0" />
              <span>Internal test telemetry. Not authoritative audit log.</span>
            </div>
          </div>

          {/* Scrollable Event Log List */}
          <div className="flex-1 overflow-y-auto p-3 space-y-2.5 font-mono text-xs">
            {logs.length === 0 ? (
              <div className="text-center py-12 text-[#756A60] text-[11px]">
                No session events recorded yet.
                <br />
                Events appear here on every speech or text action.
              </div>
            ) : (
              logs.map((entry) => {
                const isExpanded = expandedLogId === entry.id;
                return (
                  <div
                    key={entry.id}
                    className="p-2 bg-[#1C1612] border border-[#3E322A] hover:border-[#704832] transition-colors"
                  >
                    <div className="flex items-center justify-between text-[10px] text-[#756A60] mb-1">
                      <span>{entry.timestamp}</span>
                      <span
                        className={`px-1.5 py-0.5 border text-[9px] font-bold uppercase tracking-wider ${getBadgeColor(
                          entry.category
                        )}`}
                      >
                        {entry.category}
                      </span>
                    </div>

                    <div className="text-[#FFFDF8] text-[11px] leading-snug">
                      {entry.summary}
                    </div>

                    {entry.payload !== undefined && (
                      <div className="mt-1.5 pt-1.5 border-t border-[#3E322A]">
                        <button
                          type="button"
                          onClick={() =>
                            setExpandedLogId(isExpanded ? null : entry.id)
                          }
                          className="text-[10px] text-[#C59A5A] hover:underline flex items-center gap-1 cursor-pointer"
                        >
                          <span>{isExpanded ? 'Hide Payload' : 'View Payload'}</span>
                        </button>

                        {isExpanded && (
                          <pre className="mt-1.5 p-2 bg-[#140F0D] text-[#D8CCBC] text-[10px] overflow-x-auto max-h-32 border border-[#3E322A]">
                            {typeof entry.payload === 'string'
                              ? entry.payload
                              : JSON.stringify(entry.payload, null, 2)}
                          </pre>
                        )}
                      </div>
                    )}
                  </div>
                );
              })
            )}
          </div>
        </>
      )}
    </aside>
  );
};
