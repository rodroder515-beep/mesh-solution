export type SupportedLanguage = 'en' | 'kn' | 'hi' | 'ml';

export interface LanguageOption {
  code: SupportedLanguage;
  label: string;
  nativeLabel: string;
}

export const SUPPORTED_LANGUAGES: LanguageOption[] = [
  { code: 'en', label: 'English', nativeLabel: 'English' },
  { code: 'kn', label: 'Kannada', nativeLabel: 'ಕನ್ನಡ' },
  { code: 'hi', label: 'Hindi', nativeLabel: 'हिन्दी' },
  { code: 'ml', label: 'Malayalam', nativeLabel: 'മലയാളം' },
];

export type WriteActionType = 'update_stock' | 'place_order' | 'create_bill' | string;

export interface TextInputPayload {
  type: 'text_input';
  text: string;
  language: SupportedLanguage;
  session_id: string;
}

export interface AudioInputPayload {
  type: 'audio_input';
  audio_base64: string;
  format: string;
  language: SupportedLanguage;
  session_id: string;
}

export interface AudioOutputResponse {
  type: 'audio_output';
  audio_base64?: string;
  format?: string;
  text_display: string;
  session_id: string;
  action?: string;
}

export interface ConfirmationRequiredResponse {
  type: 'confirmation_required';
  action: WriteActionType;
  prompt: string;
  details?: string;
  session_id: string;
  audio_base64?: string;
  format?: string;
}

export interface ConfirmationDecisionPayload {
  confirmed: boolean;
  session_id: string;
}

export interface ConfirmationResultResponse {
  type: 'confirmation_result';
  status: 'success' | 'cancelled' | 'rejected';
  message: string;
  session_id: string;
}

export type BackendResponse =
  | AudioOutputResponse
  | ConfirmationRequiredResponse
  | ConfirmationResultResponse;

export interface ApiError {
  code: string;
  message: string;
  details?: unknown;
  retryable?: boolean;
}

export type ConnectionStatus = 'CONNECTED' | 'MOCK_MODE' | 'OFFLINE';
