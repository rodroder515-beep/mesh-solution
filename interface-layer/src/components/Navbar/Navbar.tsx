import React, { useState } from 'react';
import { SupportedLanguage, ConnectionStatus } from '../../types/api';
import { LanguageSelector } from '../LanguageSelector/LanguageSelector';
import { Terminal, Settings2, Wifi, WifiOff } from 'lucide-react';

interface NavbarProps {
  currentLanguage: SupportedLanguage;
  onLanguageChange: (lang: SupportedLanguage) => void;
  connectionStatus: ConnectionStatus;
  isMockMode: boolean;
  onToggleMockMode: (mock: boolean) => void;
  isSimulateOffline: boolean;
  onToggleSimulateOffline: (offline: boolean) => void;
  sessionLogCount: number;
  isSessionLogOpen: boolean;
  onToggleSessionLog: () => void;
  onResetSession: () => void;
  backendUrl: string;
}

export const Navbar: React.FC<NavbarProps> = ({
  currentLanguage,
  onLanguageChange,
  connectionStatus,
  isMockMode,
  onToggleMockMode,
  isSimulateOffline,
  onToggleSimulateOffline,
  sessionLogCount,
  isSessionLogOpen,
  onToggleSessionLog,
  onResetSession,
  backendUrl,
}) => {
  const [showConfigModal, setShowConfigModal] = useState(false);

  // Status Indicator formatting
  const renderStatusBadge = () => {
    if (connectionStatus === 'CONNECTED') {
      return (
        <span
          className="inline-flex items-center space-x-1.5 px-2.5 py-1 text-xs font-mono font-bold tracking-widest bg-[#55705A]/20 text-[#85A68B] border border-[#55705A]/40"
          title="Connected to real Language Layer backend"
        >
          <span className="w-2 h-2 rounded-full bg-[#55705A] animate-pulse" />
          <span>CONNECTED</span>
        </span>
      );
    }

    if (connectionStatus === 'MOCK_MODE') {
      return (
        <span
          className="inline-flex items-center space-x-1.5 px-2 py-0.5 text-[11px] font-mono font-semibold tracking-wider bg-[#362B23] text-[#D8CCBC] border border-[#5A483C]"
          title="Running in local Mock Mode for testing"
        >
          <span className="w-1.5 h-1.5 rounded-full bg-[#82705F]" />
          <span>MOCK MODE</span>
        </span>
      );
    }

    return (
      <span
        className="inline-flex items-center space-x-1.5 px-2.5 py-1 text-xs font-mono font-bold tracking-widest bg-[#9A453D]/20 text-[#D87D74] border border-[#9A453D]/40"
        title="Backend unavailable or offline"
      >
        <span className="w-2 h-2 rounded-full bg-[#9A453D]" />
        <span>OFFLINE</span>
      </span>
    );
  };

  return (
    <header className="w-full bg-[#241C17] text-[#FFFDF8] border-b border-[#3E322A] sticky top-0 z-30">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
        {/* Left: Geometric Custom Logo */}
        <div className="flex items-center space-x-4">
          <div className="flex items-center space-x-2.5">
            {/* Minimalist Geometric Mark */}
            <div className="w-7 h-7 bg-[#704832] chamfer-btn-sm flex items-center justify-center text-[#FFFDF8] font-black text-xs">
              <span className="tracking-tighter">SA</span>
            </div>
            {/* Text Logo */}
            <div className="leading-tight select-none">
              <div className="text-xs font-extrabold uppercase tracking-widest text-[#FFFDF8]">
                STORE
              </div>
              <div className="text-[10px] font-bold uppercase tracking-wider text-[#C59A5A]">
                ASSISTANT
              </div>
            </div>
          </div>

          <span className="hidden md:inline-block text-[#5A483C] text-sm">/</span>
          <span className="hidden md:inline-block text-[11px] font-mono uppercase tracking-wider text-[#A6998C]">
            CHUNK 1: INTERFACE LAYER
          </span>
        </div>

        {/* Right: Language Selector + Status + Developer Controls */}
        <div className="flex items-center space-x-2 sm:space-x-3">
          {/* Status Indicator */}
          {renderStatusBadge()}

          {/* Language Selector */}
          <div className="hidden sm:block">
            <LanguageSelector
              currentLanguage={currentLanguage}
              onLanguageChange={onLanguageChange}
            />
          </div>

          {/* Dev Test Config Toggle */}
          <button
            type="button"
            onClick={() => setShowConfigModal(!showConfigModal)}
            title="Configure Language Layer API / Mock Mode"
            aria-label="Open API settings dialog"
            className="p-1.5 text-[#A6998C] hover:text-[#FFFDF8] hover:bg-[#362B23] transition-colors border border-transparent hover:border-[#5A483C] cursor-pointer"
          >
            <Settings2 className="w-4 h-4" />
          </button>

          {/* Session Log Drawer Button */}
          <button
            type="button"
            onClick={onToggleSessionLog}
            aria-label="Toggle Session Debug Log"
            className={`p-1.5 flex items-center space-x-1.5 text-xs font-mono border transition-colors cursor-pointer ${
              isSessionLogOpen
                ? 'bg-[#704832] text-[#FFFDF8] border-[#704832]'
                : 'text-[#A6998C] hover:text-[#FFFDF8] border-[#3E322A] hover:bg-[#362B23]'
            }`}
          >
            <Terminal className="w-4 h-4" />
            <span className="hidden lg:inline text-[10px] font-bold uppercase tracking-wider">
              LOG ({sessionLogCount})
            </span>
          </button>
        </div>
      </div>

      {/* Mobile Language Selector Bar */}
      <div className="sm:hidden px-4 py-2 border-t border-[#3E322A] bg-[#1C1612] flex items-center justify-between">
        <span className="text-[10px] font-mono text-[#A6998C] uppercase tracking-wider">
          LANGUAGE:
        </span>
        <LanguageSelector
          currentLanguage={currentLanguage}
          onLanguageChange={onLanguageChange}
        />
      </div>

      {/* Internal Test / API Config Modal */}
      {showConfigModal && (
        <div
          className="fixed inset-0 z-50 bg-black/60 flex items-center justify-center p-4"
          role="dialog"
          aria-modal="true"
          aria-labelledby="api-settings-title"
        >
          <div className="bg-[#241C17] text-[#FFFDF8] max-w-md w-full p-6 border-2 border-[#704832] chamfer-panel shadow-2xl">
            <div className="flex items-center justify-between pb-3 border-b border-[#3E322A]">
              <h4 id="api-settings-title" className="text-sm font-extrabold uppercase tracking-widest text-[#C59A5A]">
                API &amp; TEST CONTROLS
              </h4>
              <button
                type="button"
                onClick={() => setShowConfigModal(false)}
                className="text-[#756A60] hover:text-white text-sm font-mono cursor-pointer"
              >
                ✕ CLOSE
              </button>
            </div>

            <div className="space-y-4 my-5 text-xs font-mono">
              <div>
                <label className="block text-[#A6998C] uppercase mb-1">
                  Configured Language API Base URL:
                </label>
                <div className="p-2.5 bg-[#1C1612] border border-[#3E322A] text-[#C59A5A] select-all">
                  {backendUrl}
                </div>
                <span className="text-[10px] text-[#756A60] mt-1 block">
                  Configured via VITE_LANGUAGE_API in .env
                </span>
              </div>

              {/* Mock Mode Toggle */}
              <div className="p-3 bg-[#1C1612] border border-[#3E322A] flex items-center justify-between">
                <div>
                  <span className="font-bold text-white block">USE MOCK MODE</span>
                  <span className="text-[10px] text-[#A6998C]">
                    Simulate Language Layer responses locally
                  </span>
                </div>
                <button
                  type="button"
                  onClick={() => onToggleMockMode(!isMockMode)}
                  className={`chamfer-btn-sm px-3 py-1 font-bold text-xs uppercase tracking-wider cursor-pointer ${
                    isMockMode
                      ? 'bg-[#704832] text-[#FFFDF8]'
                      : 'bg-[#362B23] text-[#A6998C] hover:text-white'
                  }`}
                >
                  {isMockMode ? 'ENABLED' : 'DISABLED'}
                </button>
              </div>

              {/* Offline Simulation Toggle (For Acceptance Test 6) */}
              <div className="p-3 bg-[#1C1612] border border-[#3E322A] flex items-center justify-between">
                <div>
                  <span className="font-bold text-white flex items-center gap-1">
                    {isSimulateOffline ? (
                      <WifiOff className="w-3.5 h-3.5 text-red-400" />
                    ) : (
                      <Wifi className="w-3.5 h-3.5 text-emerald-400" />
                    )}
                    SIMULATE OFFLINE BACKEND
                  </span>
                  <span className="text-[10px] text-[#A6998C]">
                    Test 6: Verify friendly error handling &amp; retry
                  </span>
                </div>
                <button
                  type="button"
                  onClick={() => onToggleSimulateOffline(!isSimulateOffline)}
                  className={`chamfer-btn-sm px-3 py-1 font-bold text-xs uppercase tracking-wider cursor-pointer ${
                    isSimulateOffline
                      ? 'bg-[#9A453D] text-white'
                      : 'bg-[#362B23] text-[#A6998C] hover:text-white'
                  }`}
                >
                  {isSimulateOffline ? 'OFFLINE' : 'ONLINE'}
                </button>
              </div>

              {/* Reset Session */}
              <div className="pt-2 border-t border-[#3E322A] flex items-center justify-between">
                <span className="text-[#A6998C]">Start fresh conversation:</span>
                <button
                  type="button"
                  onClick={() => {
                    onResetSession();
                    setShowConfigModal(false);
                  }}
                  className="px-3 py-1 text-xs text-[#D8CCBC] border border-[#704832] hover:bg-[#704832] hover:text-[#FFFDF8] transition-colors uppercase font-bold tracking-wider cursor-pointer"
                >
                  RESET SESSION ID
                </button>
              </div>
            </div>

            <div className="pt-2 border-t border-[#3E322A] flex justify-end">
              <button
                type="button"
                onClick={() => setShowConfigModal(false)}
                className="chamfer-btn-sm px-4 py-1.5 bg-[#704832] hover:bg-[#865A40] text-[#FFFDF8] text-xs font-bold uppercase cursor-pointer"
              >
                DONE
              </button>
            </div>
          </div>
        </div>
      )}
    </header>
  );
};
