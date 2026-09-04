/**
 * Language Layer API Client
 *
 * Dedicated client for communication with the team's Language Layer service.
 * Base URL configurable via VITE_LANGUAGE_API environment variable.
 */

import {
  TextInputPayload,
  AudioInputPayload,
  BackendResponse,
  ConfirmationDecisionPayload,
  ConfirmationResultResponse,
  SupportedLanguage,
} from '../types/api';
import { blobToBase64 } from '../utils/audio';
import { mockLanguageApi } from './mockLanguageApi';

export class LanguageApiClient {
  private baseUrl: string;
  private forceMock: boolean;

  constructor() {
    this.baseUrl = import.meta.env.VITE_LANGUAGE_API || 'http://localhost:5001';
    // Default to true if not explicitly set to "false"
    const envMock = import.meta.env.VITE_USE_MOCK;
    this.forceMock = envMock !== undefined ? envMock === 'true' : true;
  }

  public getBaseUrl(): string {
    return this.baseUrl;
  }

  public setBaseUrl(url: string) {
    this.baseUrl = url.replace(/\/$/, '');
  }

  public isMockMode(): boolean {
    return this.forceMock;
  }

  public setMockMode(useMock: boolean) {
    this.forceMock = useMock;
  }

  /**
   * Health check to test backend connection
   */
  public async checkHealth(): Promise<boolean> {
    if (this.forceMock) {
      return mockLanguageApi.checkHealth();
    }

    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 3000);

      const res = await fetch(`${this.baseUrl}/health`, {
        method: 'GET',
        signal: controller.signal,
      });
      clearTimeout(timeoutId);
      return res.ok;
    } catch {
      return false;
    }
  }

  /**
   * Section 13: Text Input Request
   * Sends text input payload strictly conforming to the contract:
   * {
   *   "type": "text_input",
   *   "text": "How much sugar do we have?",
   *   "language": "en",
   *   "session_id": "sess_001"
   * }
   */
  public async sendTextInput(payload: TextInputPayload): Promise<BackendResponse> {
    if (this.forceMock) {
      return mockLanguageApi.sendTextInput(payload);
    }

    try {
      const response = await fetch(`${this.baseUrl}/api/v1/message`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Accept: 'application/json',
        },
        body: JSON.stringify(payload),
      });

      if (!response.ok) {
        const errorText = await response.text().catch(() => '');
        throw new Error(
          `Language Layer error (${response.status}): ${errorText || response.statusText}`
        );
      }

      return (await response.json()) as BackendResponse;
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Unknown communication error';
      throw new Error(`Failed to connect to Language Layer: ${message}`);
    }
  }

  /**
   * Section 14: Audio Input Request
   * Sends audio recorded by the frontend to the Language Layer.
   * Conforms to the team's audio_input contract.
   */
  public async sendAudioInput(
    audioBlob: Blob,
    language: SupportedLanguage,
    sessionId: string
  ): Promise<BackendResponse> {
    if (this.forceMock) {
      return mockLanguageApi.sendAudioInput(audioBlob, language, sessionId);
    }

    try {
      // Convert to Base64 payload conforming to JSON spec
      const base64Data = await blobToBase64(audioBlob);
      const payload: AudioInputPayload = {
        type: 'audio_input',
        audio_base64: base64Data,
        format: audioBlob.type.includes('wav') ? 'wav' : 'webm',
        language,
        session_id: sessionId,
      };

      const response = await fetch(`${this.baseUrl}/api/v1/audio`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Accept: 'application/json',
        },
        body: JSON.stringify(payload),
      });

      if (!response.ok) {
        const errorText = await response.text().catch(() => '');
        throw new Error(
          `Language Layer audio error (${response.status}): ${errorText || response.statusText}`
        );
      }

      return (await response.json()) as BackendResponse;
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Audio processing error';
      throw new Error(`Failed to process audio with Language Layer: ${message}`);
    }
  }

  /**
   * Section 17: Confirmation Decision Request
   * Sends:
   * {
   *   "confirmed": true,
   *   "session_id": "sess_001"
   * }
   */
  public async sendConfirmation(
    payload: ConfirmationDecisionPayload
  ): Promise<ConfirmationResultResponse> {
    if (this.forceMock) {
      return mockLanguageApi.sendConfirmation(payload);
    }

    try {
      const response = await fetch(`${this.baseUrl}/api/v1/confirm`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Accept: 'application/json',
        },
        body: JSON.stringify(payload),
      });

      if (!response.ok) {
        const errorText = await response.text().catch(() => '');
        throw new Error(
          `Language Layer confirmation error (${response.status}): ${errorText || response.statusText}`
        );
      }

      return (await response.json()) as ConfirmationResultResponse;
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Confirmation error';
      throw new Error(`Failed to send confirmation to Language Layer: ${message}`);
    }
  }
}

export const languageApiClient = new LanguageApiClient();
