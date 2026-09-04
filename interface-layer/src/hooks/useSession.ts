import { useState, useCallback, useEffect } from 'react';
import { SessionLogEntry, SessionLogCategory } from '../types/messages';

function generateSessionId(): string {
  const randomPart = Math.random().toString(36).substring(2, 10);
  return `sess_${randomPart}`;
}

function getFormattedTime(): string {
  const now = new Date();
  const pad = (n: number) => n.toString().padStart(2, '0');
  return `${pad(now.getHours())}:${pad(now.getMinutes())}:${pad(now.getSeconds())}`;
}

export function useSession() {
  const [sessionId, setSessionId] = useState<string>(() => {
    // Check if session ID already exists in sessionStorage for tab persistence
    const existing = sessionStorage.getItem('store_assistant_session_id');
    if (existing) return existing;
    const newId = generateSessionId();
    sessionStorage.setItem('store_assistant_session_id', newId);
    return newId;
  });

  const [logs, setLogs] = useState<SessionLogEntry[]>([]);

  const addLog = useCallback(
    (category: SessionLogCategory, summary: string, payload?: unknown) => {
      const entry: SessionLogEntry = {
        id: `log_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
        timestamp: getFormattedTime(),
        category,
        summary,
        payload,
      };
      setLogs((prev) => [entry, ...prev]);
    },
    []
  );

  const resetSession = useCallback(() => {
    const newId = generateSessionId();
    sessionStorage.setItem('store_assistant_session_id', newId);
    setSessionId(newId);
    setLogs([]);
    addLog('CONNECTION', `New session initialized (${newId})`);
  }, [addLog]);

  useEffect(() => {
    // Initial session log
    addLog('CONNECTION', `Session established: ${sessionId}`);
  }, [sessionId, addLog]);

  return {
    sessionId,
    logs,
    addLog,
    resetSession,
    clearLogs: () => setLogs([]),
  };
}
