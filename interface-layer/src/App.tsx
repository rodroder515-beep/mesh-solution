/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { useState, useEffect, useCallback, useRef } from 'react';
import { SupportedLanguage, ConnectionStatus, WriteActionType } from './types/api';
import { ChatMessage } from './types/messages';
import { useSession } from './hooks/useSession';
import { useRecorder } from './hooks/useRecorder';
import { languageApiClient } from './api/languageApi';
import { mockLanguageApi } from './api/mockLanguageApi';
import { Navbar } from './components/Navbar/Navbar';
import { Hero } from './components/Hero/Hero';
import { ChatWindow } from './components/ChatWindow/ChatWindow';
import { InputBar } from './components/InputBar/InputBar';
import { SessionLog } from './components/SessionLog/SessionLog';

function getFormattedTime(): string {
  const now = new Date();
  const pad = (n: number) => n.toString().padStart(2, '0');
  return `${pad(now.getHours())}:${pad(now.getMinutes())}:${pad(now.getSeconds())}`;
}

export default function App() {
  const { sessionId, logs, addLog, resetSession, clearLogs } = useSession();

  const [currentLanguage, setCurrentLanguage] = useState<SupportedLanguage>('en');
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [isConfirmationProcessing, setIsConfirmationProcessing] = useState<boolean>(false);

  // Active confirmation state for write actions
  const [activeConfirmation, setActiveConfirmation] = useState<{
    action: WriteActionType;
    prompt: string;
    details?: string;
  } | null>(null);

  // Backend connection state
  const [isMockMode, setIsMockMode] = useState<boolean>(languageApiClient.isMockMode());
  const [isSimulateOffline, setIsSimulateOffline] = useState<boolean>(false);
  const [connectionStatus, setConnectionStatus] = useState<ConnectionStatus>('MOCK_MODE');

  // Session log panel visibility (auto open on large screens, closed on mobile)
  const [isSessionLogOpen, setIsSessionLogOpen] = useState<boolean>(() => {
    if (typeof window !== 'undefined') {
      return window.innerWidth >= 1024;
    }
    return false;
  });

  const lastFailedInputRef = useRef<{ type: 'text' | 'voice'; payload?: string } | null>(null);

  // Periodic health check
  const checkHealth = useCallback(async () => {
    if (isSimulateOffline) {
      setConnectionStatus('OFFLINE');
      return;
    }
    if (isMockMode) {
      setConnectionStatus('MOCK_MODE');
      return;
    }
    try {
      const healthy = await languageApiClient.checkHealth();
      setConnectionStatus(healthy ? 'CONNECTED' : 'OFFLINE');
    } catch {
      setConnectionStatus('OFFLINE');
    }
  }, [isMockMode, isSimulateOffline]);

  useEffect(() => {
    checkHealth();
    const interval = setInterval(checkHealth, 10000);
    return () => clearInterval(interval);
  }, [checkHealth]);

  const handleToggleMockMode = (useMock: boolean) => {
    setIsMockMode(useMock);
    languageApiClient.setMockMode(useMock);
    addLog('CONNECTION', `Switched Mode: ${useMock ? 'MOCK MODE' : 'REAL LANGUAGE LAYER'}`);
    checkHealth();
  };

  const handleToggleSimulateOffline = (offline: boolean) => {
    setIsSimulateOffline(offline);
    mockLanguageApi.setSimulateOffline(offline);
    addLog('CONNECTION', `Simulate Offline: ${offline ? 'ACTIVE (Error testing)' : 'INACTIVE'}`);
    checkHealth();
  };

  const handleLanguageChange = (lang: SupportedLanguage) => {
    setCurrentLanguage(lang);
    addLog('LANGUAGE', `Language switched to ${lang.toUpperCase()}`, { code: lang });
  };

  /**
   * Handle text input submission (Section 13)
   */
  const handleSendText = async (text: string) => {
    if (!text.trim() || isLoading) return;

    const userMessageId = `msg_${Date.now()}`;
    const newMsg: ChatMessage = {
      id: userMessageId,
      sender: 'user',
      text,
      timestamp: getFormattedTime(),
      language: currentLanguage,
      status: 'sent',
    };

    setMessages((prev) => [...prev, newMsg]);
    setIsLoading(true);
    lastFailedInputRef.current = null;

    // Log input event
    addLog('INPUT', `text_input: "${text.substring(0, 32)}${text.length > 32 ? '...' : ''}"`, {
      type: 'text_input',
      text,
      language: currentLanguage,
      session_id: sessionId,
    });

    try {
      const response = await languageApiClient.sendTextInput({
        type: 'text_input',
        text,
        language: currentLanguage,
        session_id: sessionId,
      });

      if (response.type === 'audio_output') {
        const assistantMsg: ChatMessage = {
          id: `msg_asst_${Date.now()}`,
          sender: 'assistant',
          text: response.text_display,
          timestamp: getFormattedTime(),
          audio: response.audio_base64
            ? { base64: response.audio_base64, format: response.format || 'mp3' }
            : undefined,
          status: 'received',
        };
        setMessages((prev) => [...prev, assistantMsg]);
        addLog('RESPONSE', `get_response: "${response.text_display.substring(0, 32)}..."`, response);
      } else if (response.type === 'confirmation_required') {
        setActiveConfirmation({
          action: response.action,
          prompt: response.prompt,
          details: response.details,
        });

        const assistantMsg: ChatMessage = {
          id: `msg_asst_${Date.now()}`,
          sender: 'assistant',
          text: `${response.prompt} ${response.details || ''}`,
          timestamp: getFormattedTime(),
          actionType: response.action,
          requiresConfirmation: true,
          audio: response.audio_base64
            ? { base64: response.audio_base64, format: response.format || 'mp3' }
            : undefined,
          status: 'received',
        };
        setMessages((prev) => [...prev, assistantMsg]);
        addLog('CONFIRMATION', `write_action: ${response.action}`, response);
      }
    } catch (err: unknown) {
      console.error('API send error:', err);
      const errorMessage = err instanceof Error ? err.message : 'Unknown communication error';
      lastFailedInputRef.current = { type: 'text', payload: text };

      const errorMsg: ChatMessage = {
        id: `msg_err_${Date.now()}`,
        sender: 'assistant',
        text: "Sorry, I couldn't connect to the assistant. Try again.",
        timestamp: getFormattedTime(),
        status: 'error',
      };
      setMessages((prev) => [...prev, errorMsg]);
      addLog('ERROR', `API failure: ${errorMessage}`);
    } finally {
      setIsLoading(false);
    }
  };

  /**
   * Handle microphone recording complete (Section 14)
   */
  const handleAudioRecordingComplete = async (audioBlob: Blob) => {
    const userMessageId = `msg_audio_${Date.now()}`;
    const blobUrl = URL.createObjectURL(audioBlob);

    const newMsg: ChatMessage = {
      id: userMessageId,
      sender: 'user',
      text: '🎤 [Voice Input Transmitted]',
      timestamp: getFormattedTime(),
      language: currentLanguage,
      audio: { blobUrl, format: audioBlob.type },
      status: 'sent',
    };

    setMessages((prev) => [...prev, newMsg]);
    setIsLoading(true);

    addLog('INPUT', `audio_input (${Math.round(audioBlob.size / 1024)} KB, ${audioBlob.type})`, {
      type: 'audio_input',
      mimeType: audioBlob.type,
      sizeBytes: audioBlob.size,
      language: currentLanguage,
      session_id: sessionId,
    });

    try {
      const response = await languageApiClient.sendAudioInput(
        audioBlob,
        currentLanguage,
        sessionId
      );

      if (response.type === 'audio_output') {
        const assistantMsg: ChatMessage = {
          id: `msg_asst_${Date.now()}`,
          sender: 'assistant',
          text: response.text_display,
          timestamp: getFormattedTime(),
          audio: response.audio_base64
            ? { base64: response.audio_base64, format: response.format || 'mp3' }
            : undefined,
          status: 'received',
        };
        setMessages((prev) => [...prev, assistantMsg]);
        addLog('RESPONSE', `audio_output: "${response.text_display.substring(0, 32)}..."`, response);
      } else if (response.type === 'confirmation_required') {
        setActiveConfirmation({
          action: response.action,
          prompt: response.prompt,
          details: response.details,
        });

        const assistantMsg: ChatMessage = {
          id: `msg_asst_${Date.now()}`,
          sender: 'assistant',
          text: `${response.prompt} ${response.details || ''}`,
          timestamp: getFormattedTime(),
          actionType: response.action,
          requiresConfirmation: true,
          audio: response.audio_base64
            ? { base64: response.audio_base64, format: response.format || 'mp3' }
            : undefined,
          status: 'received',
        };
        setMessages((prev) => [...prev, assistantMsg]);
        addLog('CONFIRMATION', `write_action: ${response.action}`, response);
      }
    } catch (err: unknown) {
      console.error('Audio processing error:', err);
      const errorMessage = err instanceof Error ? err.message : 'Unknown audio error';

      const errorMsg: ChatMessage = {
        id: `msg_err_${Date.now()}`,
        sender: 'assistant',
        text: "Sorry, I didn't catch that. Try again.",
        timestamp: getFormattedTime(),
        status: 'error',
      };
      setMessages((prev) => [...prev, errorMsg]);
      addLog('ERROR', `Audio failure: ${errorMessage}`);
    } finally {
      setIsLoading(false);
    }
  };

  /**
   * Voice Recorder Hook
   */
  const {
    state: recorderState,
    errorMessage: recorderError,
    recordingDuration,
    startRecording,
    stopRecording,
    resetError: resetRecorderError,
  } = useRecorder({
    onRecordingComplete: handleAudioRecordingComplete,
    onError: (err) => {
      addLog('ERROR', `Mic error: ${err.message}`);
    },
  });

  /**
   * Handle Confirmation Decisions (Section 17)
   */
  const handleConfirmAction = async () => {
    if (!activeConfirmation || isConfirmationProcessing) return;

    setIsConfirmationProcessing(true);
    const actionName = activeConfirmation.action;

    addLog('CONFIRMED', `User confirmed write action: ${actionName}`, {
      confirmed: true,
      session_id: sessionId,
    });

    try {
      const result = await languageApiClient.sendConfirmation({
        confirmed: true,
        session_id: sessionId,
      });

      // Update message status
      setMessages((prev) =>
        prev.map((m) =>
          m.requiresConfirmation && !m.isConfirmed && !m.isCancelled
            ? { ...m, isConfirmed: true }
            : m
        )
      );

      const resultMsg: ChatMessage = {
        id: `msg_result_${Date.now()}`,
        sender: 'assistant',
        text: `✔ ${result.message}`,
        timestamp: getFormattedTime(),
        status: 'received',
      };
      setMessages((prev) => [...prev, resultMsg]);
      addLog('RESULT', `Action success: ${result.message}`, result);
    } catch (err: unknown) {
      const errorMessage = err instanceof Error ? err.message : 'Confirmation error';
      addLog('ERROR', `Confirmation failure: ${errorMessage}`);
      const errorMsg: ChatMessage = {
        id: `msg_err_${Date.now()}`,
        sender: 'assistant',
        text: 'Failed to apply confirmation. Please retry.',
        timestamp: getFormattedTime(),
        status: 'error',
      };
      setMessages((prev) => [...prev, errorMsg]);
    } finally {
      setIsConfirmationProcessing(false);
      setActiveConfirmation(null);
    }
  };

  const handleCancelAction = async () => {
    if (!activeConfirmation || isConfirmationProcessing) return;

    setIsConfirmationProcessing(true);
    const actionName = activeConfirmation.action;

    addLog('CANCELLED', `User cancelled write action: ${actionName}`, {
      confirmed: false,
      session_id: sessionId,
    });

    try {
      const result = await languageApiClient.sendConfirmation({
        confirmed: false,
        session_id: sessionId,
      });

      // Update message status
      setMessages((prev) =>
        prev.map((m) =>
          m.requiresConfirmation && !m.isConfirmed && !m.isCancelled
            ? { ...m, isCancelled: true }
            : m
        )
      );

      const resultMsg: ChatMessage = {
        id: `msg_result_${Date.now()}`,
        sender: 'assistant',
        text: `✖ ${result.message}`,
        timestamp: getFormattedTime(),
        status: 'received',
      };
      setMessages((prev) => [...prev, resultMsg]);
      addLog('RESULT', `Action cancelled: ${result.message}`, result);
    } catch (err: unknown) {
      const errorMessage = err instanceof Error ? err.message : 'Cancellation error';
      addLog('ERROR', `Cancellation failure: ${errorMessage}`);
    } finally {
      setIsConfirmationProcessing(false);
      setActiveConfirmation(null);
    }
  };

  const handleRetryLastMessage = () => {
    if (lastFailedInputRef.current?.type === 'text' && lastFailedInputRef.current.payload) {
      handleSendText(lastFailedInputRef.current.payload);
    }
  };

  const handleResetSessionId = () => {
    resetSession();
    setMessages([]);
    setActiveConfirmation(null);
  };

  return (
    <div className="min-h-screen flex flex-col bg-[#F3EBDD] text-[#241C17] font-sans selection:bg-[#704832] selection:text-[#FFFDF8]">
      {/* Top Navigation */}
      <Navbar
        currentLanguage={currentLanguage}
        onLanguageChange={handleLanguageChange}
        connectionStatus={connectionStatus}
        isMockMode={isMockMode}
        onToggleMockMode={handleToggleMockMode}
        isSimulateOffline={isSimulateOffline}
        onToggleSimulateOffline={handleToggleSimulateOffline}
        sessionLogCount={logs.length}
        isSessionLogOpen={isSessionLogOpen}
        onToggleSessionLog={() => setIsSessionLogOpen(!isSessionLogOpen)}
        onResetSession={handleResetSessionId}
        backendUrl={languageApiClient.getBaseUrl()}
      />

      {/* Main Layout Area: Conversation + Debug Panel */}
      <div className="flex-1 flex flex-col lg:flex-row max-w-7xl w-full mx-auto overflow-hidden">
        {/* Main Conversation & Voice Area */}
        <main className="flex-1 flex flex-col min-w-0 px-4 sm:px-6 lg:px-8 py-6">
          {/* Editorial Hero Header */}
          <Hero hasConversation={messages.length > 0} />

          {/* Central Conversation Window */}
          <div className="flex-1 flex flex-col min-h-[360px] pb-6">
            <ChatWindow
              messages={messages}
              isLoading={isLoading}
              activeConfirmation={activeConfirmation}
              onConfirmAction={handleConfirmAction}
              onCancelAction={handleCancelAction}
              isConfirmationProcessing={isConfirmationProcessing}
              onRetryLastMessage={handleRetryLastMessage}
              onQuickPrompt={(p) => handleSendText(p)}
            />
          </div>

          {/* Bottom Voice & Text Input Section */}
          <InputBar
            onSendText={handleSendText}
            recorderState={recorderState}
            recorderDuration={recordingDuration}
            recorderError={recorderError}
            onStartRecording={startRecording}
            onStopRecording={stopRecording}
            onRetryRecording={resetRecorderError}
            isProcessing={isLoading}
            currentLanguage={currentLanguage}
          />
        </main>

        {/* Right Side / Drawer Session Log Panel */}
        <SessionLog
          logs={logs}
          sessionId={sessionId}
          isOpen={isSessionLogOpen}
          onToggle={() => setIsSessionLogOpen(!isSessionLogOpen)}
          onClear={clearLogs}
        />
      </div>
    </div>
  );
}
