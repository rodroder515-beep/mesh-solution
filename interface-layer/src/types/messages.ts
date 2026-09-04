import { SupportedLanguage, WriteActionType } from './api';

export type MessageSender = 'user' | 'assistant' | 'system';

export interface AudioPlaybackData {
  base64?: string;
  blobUrl?: string;
  format?: string;
}

export interface ChatMessage {
  id: string;
  sender: MessageSender;
  text: string;
  timestamp: string;
  language?: SupportedLanguage;
  audio?: AudioPlaybackData;
  actionType?: WriteActionType;
  requiresConfirmation?: boolean;
  isConfirmed?: boolean;
  isCancelled?: boolean;
  status?: 'sending' | 'sent' | 'received' | 'error';
  rawPayload?: unknown;
}

export type SessionLogCategory =
  | 'INPUT'
  | 'LANGUAGE'
  | 'RESPONSE'
  | 'CONFIRMATION'
  | 'CONFIRMED'
  | 'CANCELLED'
  | 'RESULT'
  | 'AUDIO'
  | 'ERROR'
  | 'CONNECTION';

export interface SessionLogEntry {
  id: string;
  timestamp: string;
  category: SessionLogCategory;
  summary: string;
  payload?: unknown;
}
