import axios from 'axios';
import { chunkText } from './utils';

interface APIConfig {
  baseURL: string;
  apiKey: string;
  model: string;
}

class AIService {
  private config: APIConfig;
  private validateApiKey(key: string): boolean {
    // Support both OpenAI and DeepSeek API keys
    return /^(sk-|ds-)[\w-]{10,}$/.test(key);
  }

  constructor(apiKey: string, provider: 'openai' | 'deepseek' = 'openai') {
    if (!this.validateApiKey(apiKey)) {
      throw new Error('Invalid API key format');
    }

    this.config = {
      baseURL: provider === 'deepseek' ? 'https://api.deepseek.com/v1' : 'https://api.openai.com/v1',
      apiKey,
      model: provider === 'deepseek' ? 'deepseek-chat' : 'gpt-3.5-turbo'
    };
  }

  async generateStreamingResponse(prompt: string, onChunk: (chunk: string) => void) {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 30000);

    try {
      const response = await fetch(`${this.config.baseURL}/chat/completions`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${this.config.apiKey}`
        },
        body: JSON.stringify({
          model: this.config.model,
          messages: [{ role: 'user', content: prompt }],
          temperature: 0.7,
          max_tokens: 1000,
          stream: true
        }),
        signal: controller.signal
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(`HTTP error! status: ${response.status}, message: ${errorData.error?.message || 'Unknown error'}`);
      }

      const reader = response.body?.getReader();
      if (!reader) throw new Error('No reader available');

      const decoder = new TextDecoder();
      let buffer = '';

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split('\n');
        buffer = lines.pop() || '';

        for (const line of lines) {
          if (line.startsWith('data: ') && line !== 'data: [DONE]') {
            try {
              const json = JSON.parse(line.slice(6));
              const content = json.choices[0]?.delta?.content;
              if (content) onChunk(content);
            } catch (e) {
              console.error('Error parsing streaming response:', e);
            }
          }
        }
      }
    } catch (error) {
      if (error.name === 'AbortError') {
        throw new Error('Request timed out. Please try again.');
      }
      throw error;
    } finally {
      clearTimeout(timeoutId);
    }
  }

  async generateResponse(prompt: string) {
    if (!prompt.trim()) {
      return 'No content to analyze. Please provide input.';
    }

    try {
      const response = await axios.post(
        `${this.config.baseURL}/chat/completions`,
        {
          model: this.config.model,
          messages: [{ role: 'user', content: prompt }],
          temperature: 0.7,
          max_tokens: 1000,
        },
        {
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${this.config.apiKey}`
          },
          timeout: 30000
        }
      );

      return response.data.choices[0].message.content;
    } catch (error) {
      if (axios.isAxiosError(error)) {
        if (error.code === 'ECONNABORTED') {
          throw new Error('Request timed out. Please try again.');
        }
        if (error.response?.status === 401) {
          throw new Error('Invalid API key. Please check your API key and try again.');
        }
        if (error.response?.status === 429) {
          throw new Error('Rate limit exceeded. Please try again in a few moments.');
        }
        throw new Error(`API error: ${error.response?.data?.error?.message || error.message}`);
      }
      throw new Error('Failed to connect to API. Please try again.');
    }
  }

  async generateSummary(text: string) {
    const chunks = chunkText(text);
    const summaries = await Promise.all(
      chunks.map(chunk => 
        this.generateResponse(`Please provide a very concise summary of this text section:\n\n${chunk}`)
      )
    );
    
    const combinedSummary = summaries.join('\n\n');
    if (combinedSummary.length > 4000) {
      return this.generateResponse(
        `Please provide a final concise summary combining these section summaries:\n\n${combinedSummary}`
      );
    }
    return combinedSummary;
  }

  async generateQuiz(text: string) {
    const chunks = chunkText(text);
    const prompt = `Generate 5 multiple choice questions based on this text section:\n\n${chunks[0]}`;
    return this.generateResponse(prompt);
  }

  async generateFlashcards(text: string) {
    const chunks = chunkText(text);
    const prompt = `Create 5 flashcards based on this text section. Format each flashcard as follows:
Q: [Question]
A: [Concise Answer]

Make sure each question-answer pair is separated by a blank line. Here's the text:

${chunks[0]}`;
    return this.generateResponse(prompt);
  }

  async generateKeyConcepts(text: string) {
    const chunks = chunkText(text);
    const conceptsList = await Promise.all(
      chunks.map(chunk =>
        this.generateResponse(`Extract and briefly explain the key concepts from this text section:\n\n${chunk}`)
      )
    );
    
    return this.generateResponse(
      `Please combine and organize these key concepts, removing any duplicates:\n\n${conceptsList.join('\n\n')}`
    );
  }
}

export const createAIService = (apiKey: string, provider: 'openai' | 'deepseek' = 'openai') => 
  new AIService(apiKey, provider);