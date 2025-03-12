import React, { useEffect } from 'react';
import { SendHorizontal } from 'lucide-react';
import { useOpenAIStore } from '../store/openai';

interface ChatProps {
  pdfText?: string;
}

export function Chat({ pdfText }: ChatProps) {
  const [messages, setMessages] = React.useState<Array<{ role: 'user' | 'assistant', content: string }>>([]);
  const [input, setInput] = React.useState('');
  const [loading, setLoading] = React.useState(false);
  const service = useOpenAIStore((state) => state.service);

  useEffect(() => {
    if (pdfText && service) {
      // Add initial context message about the PDF
      setMessages([{
        role: 'assistant',
        content: 'I have analyzed the uploaded PDF. Feel free to ask any questions about its content!'
      }]);
    }
  }, [pdfText, service]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!input.trim() || !service) return;

    const contextPrompt = pdfText 
      ? `Context from PDF:\n${pdfText}\n\nUser question: ${input}`
      : input;

    const newMessage = { role: 'user' as const, content: input };
    setMessages(prev => [...prev, newMessage]);
    setInput('');
    setLoading(true);

    try {
      const response = { 
        role: 'assistant' as const, 
        content: await service.generateResponse(contextPrompt.trim())
      };
      setMessages(prev => [...prev, response]);
    } catch (error) {
      console.error('Failed to get response:', error instanceof Error ? error.message : 'Unknown error');
      setMessages(prev => [...prev, { 
        role: 'assistant', 
        content: 'Sorry, I encountered an error. Please try again.' 
      }]);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="h-[calc(100vh-200px)] flex flex-col">
      <div className="flex-1 overflow-y-auto space-y-4 p-4">
        {messages.map((message, i) => (
          <div
            key={i}
            className={`p-4 rounded-lg ${
              message.role === 'user' ? 'bg-[#2C2C2E] ml-12' : 'bg-[#3A3A3C] mr-12'
            }`}
          >
            {message.content}
          </div>
        ))}
      </div>

      <form onSubmit={handleSubmit} className="p-4 border-t border-[#3A3A3C]">
        <div className="flex items-center gap-2">
          <input
            type="text"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder="Ask AI anything..."
            className="flex-1 bg-[#2C2C2E] rounded-lg px-4 py-2 focus:outline-none focus:ring-2 focus:ring-[#3A3A3C]"
          />
          <button
            type="submit"
            disabled={loading}
            className="p-2 bg-[#2C2C2E] rounded-lg hover:bg-[#3A3A3C] transition-colors"
          >
            <SendHorizontal className="w-5 h-5" />
          </button>
        </div>
        <p className="text-sm text-gray-500 mt-2">
          {loading ? 'AI is thinking...' : 'AI can make mistakes. Check important information.'}
        </p>
      </form>
    </div>
  );
}