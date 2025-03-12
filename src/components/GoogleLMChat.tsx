import React, { useState } from 'react';
import { SendHorizontal } from 'lucide-react';
import axios from 'axios';
import { InlineMath, BlockMath } from 'react-katex';
import { useEffect, useRef, useCallback } from 'react';
import { useResizable } from '../hooks/useResizable';
import { Maximize2, Minimize2 } from 'lucide-react';

const API_KEY = 'AIzaSyCjn_3f5-ZAKh9GPIw_8qpinz_uU_28mlc';
const API_URL = 'https://generativelanguage.googleapis.com/v1beta/models/learnlm-1.5-pro-experimental:generateContent';

interface Message {
  role: 'user' | 'assistant';
  content: string;
}

export function GoogleLMChat() {
  const [dimensions, setDimensions] = useState({
    width: window.innerWidth - 700,
    height: window.innerHeight - 200
  });
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const verticalResizeRef = useRef<HTMLDivElement>(null);
  const horizontalResizeRef = useRef<HTMLDivElement>(null);
  const cornerResizeRef = useRef<HTMLDivElement | null>(null);
  const chatContainerRef = useRef<HTMLDivElement>(null);
  const previousDimensions = useRef<{ width: number; height: number }>(dimensions);

  const { startResize: startVerticalResize } = useResizable({
    resizeRef: verticalResizeRef,
    minWidth: 0,
    maxWidth: 0,
    minHeight: 100,
    maxHeight: 800,
    direction: 'vertical',
    onHeightResize: (height) => setDimensions(prev => ({ ...prev, height })),
  });

  const { startResize: startHorizontalResize } = useResizable({
    resizeRef: horizontalResizeRef,
    minWidth: 300,
    maxWidth: window.innerWidth - 400,
    onResize: (width) => setDimensions(prev => ({ ...prev, width })),
  });

  useEffect(() => {
    if (error) {
      const timer = setTimeout(() => setError(null), 5000);
      return () => clearTimeout(timer);
    }
  }, [error]);

  const toggleFullscreen = useCallback(() => {
    if (!isFullscreen) {
      previousDimensions.current = dimensions;
      setDimensions({
        width: window.innerWidth - 32,
        height: window.innerHeight - 32
      });
    } else {
      setDimensions(previousDimensions.current);
    }
    setIsFullscreen(!isFullscreen);
  }, [isFullscreen, dimensions]);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && isFullscreen) {
        toggleFullscreen();
      }
    };

    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [isFullscreen, toggleFullscreen]);

  const formatMathContent = (content: string): React.ReactNode[] => {
    const parts = content.split(/(\$\$.*?\$\$|\$.*?\$)/gs);
    return parts.map((part, index) => {
      if (part.startsWith('$$') && part.endsWith('$$')) {
        const math = part.slice(2, -2);
        return <BlockMath key={index} math={math} />;
      } else if (part.startsWith('$') && part.endsWith('$')) {
        const math = part.slice(1, -1);
        return <InlineMath key={index} math={math} />;
      }
      return <span key={index}>{part}</span>;
    });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!input.trim() || loading) return;

    const userMessage = { role: 'user' as const, content: input };
    setMessages(prev => [...prev, userMessage]);
    setInput('');
    setLoading(true);

    try {
      // Create a serializable message history
      const messageHistory = messages.map(msg => ({
        role: msg.role,
        parts: [{ text: msg.content }]
      }));

      const response = await axios.post(
        `${API_URL}?key=${API_KEY}`,
        {
          contents: [
            ...messageHistory,
            {
              role: 'user',
              parts: [{ text: input.trim() }]
            }
          ],
          generationConfig: {
            temperature: 0.7,
            candidateCount: 1,
            maxOutputTokens: 1024,
            topP: 0.8,
            topK: 40
          }
        },
        {
          headers: {
            'Content-Type': 'application/json'
          }
        }
      );

      if (response.data?.candidates?.[0]?.content?.parts?.[0]?.text) {
        const text = response.data.candidates[0].content.parts[0].text;
        setMessages(prev => [...prev, { role: 'assistant', content: text }]);
      } else {
        throw new Error('Invalid response format from API');
      }
    } catch (err) {
      console.error('Google LM API error:', err);
      const errorMessage = err instanceof Error 
        ? err.message
        : 'Failed to get response from Google LM';
      setError(errorMessage);
      setMessages(prev => [...prev, { 
        role: 'assistant', 
        content: 'Sorry, I encountered an error. Please try again.' 
      }]);
    } finally {
      setLoading(false);
    }
  };

  // Handle corner resize
  const handleCornerResize = (e: React.MouseEvent) => {
    e.preventDefault();
    const startX = e.clientX;
    const startY = e.clientY;
    const startWidth = dimensions.width;
    const startHeight = dimensions.height;

    const handleMouseMove = (e: MouseEvent) => {
      const deltaX = e.clientX - startX;
      const deltaY = e.clientY - startY;
      
      setDimensions({
        width: Math.max(300, Math.min(window.innerWidth - 400, startWidth + deltaX)),
        height: Math.max(300, Math.min(window.innerHeight - 100, startHeight + deltaY))
      });
    };

    const handleMouseUp = () => {
      document.removeEventListener('mousemove', handleMouseMove);
      document.removeEventListener('mouseup', handleMouseUp);
      document.body.style.cursor = 'default';
    };

    document.addEventListener('mousemove', handleMouseMove);
    document.addEventListener('mouseup', handleMouseUp);
    document.body.style.cursor = 'se-resize';
  };

  return (
    <div 
      ref={chatContainerRef}
      className={`relative flex flex-col bg-[#2C2C2E] rounded-lg transition-all duration-300 ${
        isFullscreen ? 'fixed inset-4 z-50' : ''
      }`}
      style={!isFullscreen ? { height: dimensions.height, width: dimensions.width } : undefined}
    >
      {/* Fullscreen toggle button */}
      <button
        onClick={toggleFullscreen}
        className="absolute top-4 right-4 p-2 rounded-lg bg-[#1C1C1E] hover:bg-[#3A3A3C] transition-colors z-10"
      >
        {isFullscreen ? (
          <Minimize2 className="w-5 h-5" />
        ) : (
          <Maximize2 className="w-5 h-5" />
        )}
      </button>

      {/* Chat messages */}
      <div className="flex-1 overflow-y-auto space-y-4 p-4 bg-[#1C1C1E] rounded-t-lg">
        {messages.map((message, i) => (
          <div
            key={i}
            className={`p-4 rounded-lg ${
              message.role === 'user' ? 'bg-[#2C2C2E] ml-12 shadow-lg' : 'bg-[#3A3A3C] mr-12 shadow-lg'
            }`}
          >
            {formatMathContent(message.content)}
          </div>
        ))}
      </div>

      {/* Input form */}
      <form onSubmit={handleSubmit} className="p-4 border-t border-[#3A3A3C]">
        <div className="flex items-center gap-2">
          <input
            aria-label="Message input"
            type="text"
            value={input}
            disabled={loading}
            onKeyDown={(e) => {
              if (e.key === 'Enter' && !e.shiftKey) {
                e.preventDefault();
                handleSubmit(e);
              }
            }}
            onChange={(e) => setInput(e.target.value)}
            placeholder="Ask Google LM anything..."
            className={`flex-1 bg-[#1C1C1E] rounded-lg px-4 py-2 focus:outline-none focus:ring-2 focus:ring-[#3A3A3C] ${
              loading ? 'opacity-50 cursor-not-allowed' : ''
            }`}
          />
          <button
            type="submit"
            disabled={loading}
            aria-label="Send message"
            className={`p-2 bg-[#1C1C1E] rounded-lg transition-colors ${
              loading ? 'opacity-50 cursor-not-allowed' : 'hover:bg-[#3A3A3C]'
            }`}
          >
            <SendHorizontal className="w-5 h-5" />
          </button>
        </div>
        <p className="text-sm text-gray-500 mt-2 flex items-center justify-between">
          {loading ? 'Google LM is thinking...' : 'Powered by Google Generative AI'}
          <span className="text-xs text-gray-600">
            {isFullscreen ? 'Press Esc to exit fullscreen' : 'Drag handles or corner to resize'}
          </span>
        </p>
        {error && (
          <p className="text-sm text-red-500 mt-2">
            {error}
          </p>
        )}
      </form>

      {/* Resize handles */}
      {!isFullscreen && (
        <>
          {/* Vertical resize handle */}
          <div
            ref={verticalResizeRef}
            className="absolute bottom-0 left-1/2 -translate-x-1/2 w-20 h-1 cursor-row-resize group"
            onMouseDown={startVerticalResize}
          >
            <div className="absolute bottom-0 left-0 w-full h-1 bg-transparent group-hover:bg-blue-500/20" />
          </div>

          {/* Horizontal resize handle */}
          <div
            ref={horizontalResizeRef}
            className="absolute top-1/2 right-0 h-20 w-1 -translate-y-1/2 cursor-col-resize group"
            onMouseDown={startHorizontalResize}
          >
            <div className="absolute right-0 top-0 h-full w-1 bg-transparent group-hover:bg-blue-500/20" />
          </div>

          {/* Corner resize handle */}
          <div
            ref={cornerResizeRef}
            className="absolute bottom-0 right-0 w-4 h-4 cursor-se-resize"
            onMouseDown={handleCornerResize}
          >
            <div className="absolute bottom-0 right-0 w-0 h-0 border-8 border-transparent border-r-[#3A3A3C] border-b-[#3A3A3C] hover:border-r-blue-500/20 hover:border-b-blue-500/20" />
          </div>
        </>
      )}
    </div>
  );
}