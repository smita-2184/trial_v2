import React, { useState, useRef, useEffect } from 'react';
import { SendHorizontal, RefreshCw, Link, Image, FileText } from 'lucide-react';
import { useOpenAIStore } from '../store/openai';
import ReactMarkdown from 'react-markdown';
import remarkMath from 'remark-math';
import rehypeKatex from 'rehype-katex';

interface Message {
  role: 'user' | 'assistant';
  content: string;
  resources?: {
    links?: string[];
    images?: string[];
    references?: string[];
  };
}

interface PresentationChatProps {
  onUpdateSlide?: (slideIndex: number, updates: any) => void;
  currentSlide?: number;
}

export function PresentationChat({ onUpdateSlide, currentSlide }: PresentationChatProps) {
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const service = useOpenAIStore((state) => state.service);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!input.trim() || !service || loading) return;

    const userMessage: Message = {
      role: 'user',
      content: input
    };

    setMessages(prev => [...prev, userMessage]);
    setInput('');
    setLoading(true);

    try {
      const prompt = `Help with presentation editing and enhancement. Current slide: ${currentSlide !== undefined ? currentSlide + 1 : 'N/A'}

User request: ${input}

Provide:
1. Direct response to the request
2. Relevant web resources (if needed)
3. Suggested images or diagrams (if applicable)
4. Academic references (if relevant)

Format response as JSON:
{
  "content": "Your response text",
  "resources": {
    "links": ["URL1", "URL2"],
    "images": ["Image description 1", "Image description 2"],
    "references": ["Reference 1", "Reference 2"]
  }
}`;

      const response = await service.generateResponse(prompt);
      const parsedResponse = JSON.parse(response);

      const assistantMessage: Message = {
        role: 'assistant',
        content: parsedResponse.content,
        resources: parsedResponse.resources
      };

      setMessages(prev => [...prev, assistantMessage]);
    } catch (error) {
      console.error('Failed to get response:', error);
      setMessages(prev => [...prev, {
        role: 'assistant',
        content: 'Sorry, I encountered an error. Please try again.'
      }]);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="h-full flex flex-col bg-[#2C2C2E] rounded-lg overflow-hidden">
      {/* Messages */}
      <div className="flex-1 overflow-y-auto p-4 space-y-4 pr-2">
        {messages.map((message, index) => (
          <div
            key={index}
            className={`p-4 rounded-lg ${
              message.role === 'user' 
                ? 'bg-[#1C1C1E] ml-12' 
                : 'bg-[#3A3A3C] mr-12'
            }`}
          >
            <div className="prose prose-invert max-w-none">
              <ReactMarkdown
                remarkPlugins={[remarkMath]}
                rehypePlugins={[rehypeKatex]}
              >
                {message.content}
              </ReactMarkdown>
            </div>

            {message.resources && (
              <div className="mt-4 pt-4 border-t border-[#4A4A4C] space-y-4">
                {/* Web Resources */}
                {message.resources.links && message.resources.links.length > 0 && (
                  <div>
                    <h4 className="text-sm font-medium flex items-center gap-2 mb-2">
                      <Link className="w-4 h-4" />
                      Web Resources
                    </h4>
                    <ul className="space-y-1">
                      {message.resources.links.map((link, i) => (
                        <li key={i}>
                          <a
                            href={link}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="text-sm text-blue-400 hover:text-blue-300 transition-colors"
                          >
                            {link}
                          </a>
                        </li>
                      ))}
                    </ul>
                  </div>
                )}

                {/* Suggested Images */}
                {message.resources.images && message.resources.images.length > 0 && (
                  <div>
                    <h4 className="text-sm font-medium flex items-center gap-2 mb-2">
                      <Image className="w-4 h-4" />
                      Suggested Images
                    </h4>
                    <ul className="space-y-1 text-sm text-gray-400">
                      {message.resources.images.map((image, i) => (
                        <li key={i} className="flex items-center gap-2">
                          <span className="w-1.5 h-1.5 rounded-full bg-blue-400" />
                          {image}
                        </li>
                      ))}
                    </ul>
                  </div>
                )}

                {/* References */}
                {message.resources.references && message.resources.references.length > 0 && (
                  <div>
                    <h4 className="text-sm font-medium flex items-center gap-2 mb-2">
                      <FileText className="w-4 h-4" />
                      Academic References
                    </h4>
                    <ul className="space-y-1 text-sm text-gray-400">
                      {message.resources.references.map((ref, i) => (
                        <li key={i} className="flex items-center gap-2">
                          <span className="w-1.5 h-1.5 rounded-full bg-blue-400" />
                          {ref}
                        </li>
                      ))}
                    </ul>
                  </div>
                )}
              </div>
            )}
          </div>
        ))}
        <div ref={messagesEndRef} />
      </div>

      {/* Input Form */}
      <form onSubmit={handleSubmit} className="flex-none p-4 border-t border-[#3A3A3C]">
        <div className="flex items-center gap-2">
          <input
            type="text"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder="Ask for help with your presentation..."
            className="flex-1 bg-[#1C1C1E] rounded-lg px-4 py-2 focus:outline-none focus:ring-2 focus:ring-[#3A3A3C]"
            disabled={loading}
          />
          <button
            type="submit"
            disabled={loading || !input.trim()}
            className="p-2 bg-[#1C1C1E] rounded-lg hover:bg-[#3A3A3C] transition-colors disabled:opacity-50"
          >
            {loading ? (
              <RefreshCw className="w-5 h-5 animate-spin" />
            ) : (
              <SendHorizontal className="w-5 h-5" />
            )}
          </button>
        </div>
        <p className="text-sm text-gray-500 mt-2">
          {loading ? 'Assistant is thinking...' : 'Ask for help with content, resources, or editing'}
        </p>
      </form>
    </div>
  );
}