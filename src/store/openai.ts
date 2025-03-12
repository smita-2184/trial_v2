import { create } from 'zustand';
import { createAIService } from '../lib/openai';
import { db } from '../lib/firebase';
import { doc, getDoc } from 'firebase/firestore';

interface OpenAIStore {
  apiKey: string | null;
  service: ReturnType<typeof createAIService> | null;
  error: string | null;
  setApiKey: (key: string, provider?: 'openai' | 'deepseek') => void;
  initializeService: () => Promise<void>;
  clearError: () => void;
}

export const useOpenAIStore = create<OpenAIStore>((set) => ({
  apiKey: null,
  service: null,
  error: null,
  setApiKey: (key: string, provider: 'openai' | 'deepseek' = 'openai') => {
    try {
      const service = createAIService(key, provider);
      set({ apiKey: key, service, error: null });
    } catch (error) {
      set({ 
        error: error instanceof Error ? error.message : 'Invalid API key',
        service: null,
        apiKey: null
      });
    }
  },
  initializeService: async () => {
    try {
      const apiKeyDoc = await getDoc(doc(db, 'api_keys', 'current'));
      if (!apiKeyDoc.exists()) {
        throw new Error('API keys not found in database. Please check the configuration.');
      }

      const key = apiKeyDoc.data()['deepseek-key'] || apiKeyDoc.data()['openai-key'];
      const provider = apiKeyDoc.data()['deepseek-key'] ? 'deepseek' : 'openai';
      
      if (!key) {
        throw new Error('API key is missing from the configuration.');
      }

      const service = createAIService(key, provider);
      set({ apiKey: key, service, error: null });
    } catch (error) {
      console.error('AI service initialization error:', error);
      set({ 
        error: error instanceof Error ? error.message : 'Failed to initialize AI service',
        service: null,
        apiKey: null
      });
    }
  },
  clearError: () => set({ error: null }),
}));