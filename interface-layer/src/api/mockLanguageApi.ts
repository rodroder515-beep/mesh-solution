import {
  TextInputPayload,
  BackendResponse,
  ConfirmationDecisionPayload,
  ConfirmationResultResponse,
  SupportedLanguage,
} from '../types/api';
import { generateMockAudioBase64 } from '../utils/audio';

// Simulated artificial network latency for realistic feel
const SIMULATED_LATENCY_MS = 600;

const delay = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

// Pre-defined multilingual responses for standard queries
const MULTILINGUAL_RESPONSES: Record<SupportedLanguage, { sugarStock: string; attaStock: string; defaultReply: string }> = {
  en: {
    sugarStock: 'You have 42 kg of sugar in stock.',
    attaStock: 'You have 18 packets of atta remaining.',
    defaultReply: 'Request processed: verified inventory and pricing in store registry.',
  },
  kn: {
    sugarStock: 'ನಮ್ಮ ಅಂಗಡಿಯ ದಾಸ್ತಾನಿನಲ್ಲಿ 42 ಕೆಜಿ ಸಕ್ಕರೆ ಲಭ್ಯವಿದೆ.',
    attaStock: '18 ಪ್ಯಾಕೆಟ್ ಆಟಾ ದಾಸ್ತಾನು ಉಳಿದಿದೆ.',
    defaultReply: 'ವಿನಂತಿಯನ್ನು ಪರಿಶೀಲಿಸಲಾಗಿದೆ: ದಾಸ್ತಾನು ದಾಖಲೆಗಳು ನವೀಕರಿಸಲ್ಪಟ್ಟಿವೆ.',
  },
  hi: {
    sugarStock: 'स्टॉक में 42 किलोग्राम चीनी उपलब्ध है।',
    attaStock: 'दुकान में 18 पैकेट आटा शेष है।',
    defaultReply: 'अनुरोध संसाधित: इन्वेंटरी और मूल्य सूची सत्यापित की गई।',
  },
  ml: {
    sugarStock: 'സ്റ്റോക്കിൽ 42 കിലോഗ്രാം പഞ്ചസാര ലഭ്യമാണ്.',
    attaStock: '18 പാക്കറ്റ് ആട്ട ബാക്കിയുണ്ട്.',
    defaultReply: 'അഭ്യർത്ഥന പ്രോസസ്സ് ചെയ്തു: സ്റ്റോക്ക് വിവരങ്ങൾ പരിശോധിച്ചു.',
  },
};

export class MockLanguageApi {
  private isSimulatingOffline = false;

  public setSimulateOffline(offline: boolean) {
    this.isSimulatingOffline = offline;
  }

  public getSimulateOffline(): boolean {
    return this.isSimulatingOffline;
  }

  /**
   * Process a text input request
   */
  public async sendTextInput(payload: TextInputPayload): Promise<BackendResponse> {
    await delay(SIMULATED_LATENCY_MS);

    if (this.isSimulatingOffline) {
      throw new Error("Unable to connect to Language Layer API (Connection refused).");
    }

    const lower = payload.text.toLowerCase().trim();
    const lang = payload.language || 'en';
    const langReplies = MULTILINGUAL_RESPONSES[lang] || MULTILINGUAL_RESPONSES.en;

    // Test case 4: Stock update trigger
    if (
      lower.includes('add') ||
      lower.includes('update') ||
      lower.includes('stock') && (lower.includes('add') || lower.includes('increase') || lower.includes('to 62') || lower.includes('to 42'))
    ) {
      return {
        type: 'confirmation_required',
        action: 'update_stock',
        prompt: 'Update sugar stock to 62 kg?',
        details: 'This action will modify store inventory records in the POS database.',
        session_id: payload.session_id,
        audio_base64: generateMockAudioBase64(1.4, 520),
        format: 'wav',
      };
    }

    // Test case 4: Place order trigger
    if (lower.includes('order') || lower.includes('atta') || lower.includes('packets')) {
      return {
        type: 'confirmation_required',
        action: 'place_order',
        prompt: 'Place an order for 50 packets of atta?',
        details: 'This action will generate a pending purchase order to Supplier Alpha.',
        session_id: payload.session_id,
        audio_base64: generateMockAudioBase64(1.4, 480),
        format: 'wav',
      };
    }

    // Test case 4: Create bill trigger
    if (lower.includes('bill') || lower.includes('invoice') || lower.includes('total')) {
      return {
        type: 'confirmation_required',
        action: 'create_bill',
        prompt: 'Create a bill for 3 items totaling ₹850?',
        details: 'This action will generate invoice #INV-1094 and deduct registered items.',
        session_id: payload.session_id,
        audio_base64: generateMockAudioBase64(1.4, 600),
        format: 'wav',
      };
    }

    // Standard queries (e.g., "How much sugar do we have?")
    let textResponse = langReplies.defaultReply;
    if (lower.includes('sugar') || lower.includes('sakkar') || lower.includes('cheeni') || lower.includes('panchasara')) {
      textResponse = langReplies.sugarStock;
    } else if (lower.includes('atta') || lower.includes('flour')) {
      textResponse = langReplies.attaStock;
    } else {
      textResponse = `${langReplies.defaultReply} Query: "${payload.text}"`;
    }

    return {
      type: 'audio_output',
      text_display: textResponse,
      session_id: payload.session_id,
      audio_base64: generateMockAudioBase64(1.5, 440),
      format: 'wav',
    };
  }

  /**
   * Process an audio input request (e.g. from microphone)
   */
  public async sendAudioInput(
    _audioBlob: Blob,
    language: SupportedLanguage,
    sessionId: string
  ): Promise<BackendResponse> {
    await delay(SIMULATED_LATENCY_MS + 200);

    if (this.isSimulatingOffline) {
      throw new Error("Unable to connect to Language Layer API (Audio service unreachable).");
    }

    const lang = language || 'en';
    const langReplies = MULTILINGUAL_RESPONSES[lang] || MULTILINGUAL_RESPONSES.en;

    // Simulate speech-to-text resolution
    return {
      type: 'audio_output',
      text_display: langReplies.sugarStock,
      session_id: sessionId,
      audio_base64: generateMockAudioBase64(1.6, 523.25),
      format: 'wav',
    };
  }

  /**
   * Process a confirmation decision (true or false)
   */
  public async sendConfirmation(payload: ConfirmationDecisionPayload): Promise<ConfirmationResultResponse> {
    await delay(SIMULATED_LATENCY_MS);

    if (this.isSimulatingOffline) {
      throw new Error("Unable to connect to Language Layer API during confirmation.");
    }

    if (payload.confirmed) {
      return {
        type: 'confirmation_result',
        status: 'success',
        message: 'Action confirmed. Store data updated successfully.',
        session_id: payload.session_id,
      };
    } else {
      return {
        type: 'confirmation_result',
        status: 'cancelled',
        message: 'Action cancelled. Store data was not modified.',
        session_id: payload.session_id,
      };
    }
  }

  /**
   * Check mock health status
   */
  public async checkHealth(): Promise<boolean> {
    await delay(150);
    return !this.isSimulatingOffline;
  }
}

export const mockLanguageApi = new MockLanguageApi();
