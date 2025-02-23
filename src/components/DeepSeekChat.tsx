import React, { useState, useRef, useEffect } from 'react';
import type { ChatMessageProps } from '../types/shared';
import { SendHorizontal, Brain, RefreshCw, ChevronRight } from 'lucide-react';
import ReactMarkdown from 'react-markdown';
import remarkMath from 'remark-math';
import rehypeKatex from 'rehype-katex';
import 'katex/dist/katex.min.css';
import { Volume2, VolumeX } from 'lucide-react';

interface Particle {
  x: number;
  y: number;
  vx: number;
  vy: number;
  life: number;
  size: number;
}

interface Message {
  role: 'user' | 'assistant';
  content: string;
  thoughts?: string;
}

interface ChatState {
  messages: Message[];
  isLoading: boolean;
  error: string | null;
}

interface ThinkingAnimationProps {
  onFadeOutRef: (fadeOut: () => void) => void;
}

function ThinkingAnimation({ onFadeOutRef }: ThinkingAnimationProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const particlesRef = useRef<Particle[]>([]);
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const fadeOutIntervalRef = useRef<number | null>(null);
  const animationFrameRef = useRef<number>();
  const isAudioInitialized = useRef(false);
  const timeRef = useRef(0);
  const [isMuted, setIsMuted] = useState(false);

  const fadeOutAudio = () => {
    if (!audioRef.current || fadeOutIntervalRef.current) return;
    
    fadeOutIntervalRef.current = window.setInterval(() => {
      if (!audioRef.current) {
        if (fadeOutIntervalRef.current) {
          clearInterval(fadeOutIntervalRef.current);
          fadeOutIntervalRef.current = null;
        }
        return;
      }

      if (audioRef.current.volume > 0.02) {
        audioRef.current.volume = Math.max(0, audioRef.current.volume - 0.02);
      } else {
        audioRef.current.pause();
        audioRef.current.volume = 0.5; // Reset volume for next time
        if (fadeOutIntervalRef.current) {
          clearInterval(fadeOutIntervalRef.current);
          fadeOutIntervalRef.current = null;
        }
      }
    }, 50); // Update every 50ms for smooth fade
  };

  // Pass the fadeOutAudio function to parent
  useEffect(() => {
    onFadeOutRef(fadeOutAudio);
  }, [onFadeOutRef]);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    // Initialize audio
    const initAudio = () => {
      if (!isAudioInitialized.current) {
        audioRef.current = new Audio('https://www.dropbox.com/scl/fi/dd589u39l86vvnzz8abnl/Thinking-Fast.mp3?rlkey=qtoixc3uveemgprmm6y29owhz&raw=1');
        audioRef.current.loop = true;
        audioRef.current.volume = 0.5;
        isAudioInitialized.current = true;
      }
    };

    // Initialize audio on first user interaction
    const handleUserInteraction = () => {
      initAudio();
      if (!isMuted && audioRef.current) {
        audioRef.current.play().catch(error => {
          if (error.name !== 'AbortError') {
            console.error('Audio playback error:', error);
          }
        });
      }
      document.removeEventListener('click', handleUserInteraction);
    }
    document.addEventListener('click', handleUserInteraction);

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    // Set canvas size
    const updateSize = () => {
      canvas.width = 200;
      canvas.height = 200;
    };
    updateSize();

    const createParticle = () => {
      const angle = Math.random() * Math.PI * 2;
      const speed = 0.5 + Math.random() * 1;
      return {
        x: canvas.width / 2,
        y: canvas.height / 2,
        vx: Math.cos(angle) * speed,
        vy: Math.sin(angle) * speed,
        life: 1,
        size: 2 + Math.random() * 2
      };
    };

    const animate = () => {
      if (!ctx || !canvas) return;

      // Clear canvas with semi-transparent black
      ctx.fillStyle = 'rgba(28, 28, 30, 0.2)';
      ctx.fillRect(0, 0, canvas.width, canvas.height);

      // Update time
      timeRef.current += 0.02;

      // Draw brain icon
      const scale = 1 + Math.sin(timeRef.current * 2) * 0.1;
      const brainSize = 40;
      ctx.save();
      ctx.translate(canvas.width / 2, canvas.height / 2);
      ctx.scale(scale, scale);
      ctx.strokeStyle = '#60A5FA';
      ctx.lineWidth = 2;
      ctx.beginPath();
      // Simplified brain path
      ctx.arc(-brainSize/4, 0, brainSize/4, 0, Math.PI * 2);
      ctx.arc(brainSize/4, 0, brainSize/4, 0, Math.PI * 2);
      ctx.stroke();
      ctx.restore();

      // Add new particles occasionally
      if (Math.random() < 0.2) {
        particlesRef.current.push(createParticle());
      }

      // Update and draw particles
      particlesRef.current = particlesRef.current.filter(particle => {
        particle.x += particle.vx;
        particle.y += particle.vy;
        particle.life -= 0.02;

        if (particle.life > 0) {
          const alpha = particle.life;
          ctx.fillStyle = `rgba(96, 165, 250, ${alpha})`;
          ctx.beginPath();
          ctx.arc(particle.x, particle.y, particle.size, 0, Math.PI * 2);
          ctx.fill();
          return true;
        }
        return false;
      });

      // Draw pulsing circles
      const numCircles = 3;
      for (let i = 0; i < numCircles; i++) {
        const progress = (timeRef.current + i / numCircles) % 1;
        const radius = progress * 50;
        const alpha = 1 - progress;
        ctx.strokeStyle = `rgba(96, 165, 250, ${alpha * 0.5})`;
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.arc(canvas.width / 2, canvas.height / 2, radius, 0, Math.PI * 2);
        ctx.stroke();
      }

      animationFrameRef.current = requestAnimationFrame(animate);
    };

    animate();

    return () => {
      // Clean up audio
      if (audioRef.current) {
        if (fadeOutIntervalRef.current) {
          clearInterval(fadeOutIntervalRef.current);
          fadeOutIntervalRef.current = null;
        }
        audioRef.current.pause();
        audioRef.current = null;
      }

      if (animationFrameRef.current) {
        cancelAnimationFrame(animationFrameRef.current);
      }
    };
  }, [isMuted]);

  const toggleMute = () => {
    if (audioRef.current) {
      if (isMuted) {
        audioRef.current.play().catch(error => {
          if (error.name !== 'AbortError') {
            console.error('Audio playback error:', error);
          }
        });
      } else {
        audioRef.current.pause();
      }
    }
    setIsMuted(!isMuted);
  };

  return (
    <div className="flex flex-col items-center justify-center p-8">
      <canvas
        ref={canvasRef}
        className="w-[200px] h-[200px]"
        style={{ background: 'transparent' }}
      />
      <button
        onClick={toggleMute}
        className="mt-4 p-2 rounded-lg hover:bg-[#3A3A3C] transition-colors"
        title={isMuted ? "Unmute thinking sound" : "Mute thinking sound"}
      >
        {isMuted ? (
          <VolumeX className="w-5 h-5" />
        ) : (
          <Volume2 className="w-5 h-5" />
        )}
      </button>
    </div>
  );
}

const API_KEY = 'sk-84bedb070f484479be0d09dca0bf142b';
const API_URL = 'https://api.deepseek.com/v1/chat/completions';

function ChatMessage({ message, isStreaming, inline }: ChatMessageProps) {
  const [showThoughts, setShowThoughts] = useState(false);
  const [messages, setMessages] = useState<Message[]>([]);

  return (
    <div
      className={`p-4 rounded-lg ${
        message.role === 'user' 
          ? 'bg-[#2C2C2E] ml-12' 
          : 'bg-[#3A3A3C] mr-12'
      }`}
      data-inline={inline}
    >
      <div className="prose prose-invert max-w-none">
        <ReactMarkdown
          remarkPlugins={[remarkMath]}
          rehypePlugins={[rehypeKatex]}
          components={{
            h1: ({ children }) => <h1 className="text-2xl font-bold mb-4">{children}</h1>,
            h2: ({ children }) => <h2 className="text-xl font-bold mb-3">{children}</h2>,
            h3: ({ children }) => <h3 className="text-lg font-bold mb-2">{children}</h3>,
            code: ({ inline, children }) => 
              inline ? (
                <code className="bg-[#2C2C2E] px-1 rounded">{children}</code>
              ) : (
                <pre className="bg-[#2C2C2E] p-4 rounded-lg overflow-x-auto">
                  <code>{children}</code>
                </pre>
              ),
            blockquote: ({ children }) => (
              <blockquote className="border-l-4 border-blue-500 pl-4 italic">
                {children}
              </blockquote>
            ),
          }}
        >
          {message.content}
        </ReactMarkdown>

        {message.thoughts && !isStreaming && (
          <>
            <button
              onClick={() => setShowThoughts(!showThoughts)}
              className="flex items-center gap-2 mt-4 text-blue-400 hover:text-blue-300 transition-colors"
            >
              <ChevronRight 
                className={`w-4 h-4 transition-transform ${showThoughts ? 'rotate-90' : ''}`} 
              />
              <Brain className="w-4 h-4" />
              <span className="text-sm font-medium">View Reasoning Process</span>
            </button>
            
            <div className={`overflow-hidden transition-all duration-300 ${
              showThoughts ? 'max-h-[1000px] opacity-100' : 'max-h-0 opacity-0'
            }`}>
              <div className="mt-4 pt-4 border-t border-[#4A4A4C]">
                <div className="text-gray-400 text-sm">
                  <ReactMarkdown
                    remarkPlugins={[remarkMath]}
                    rehypePlugins={[rehypeKatex]}
                  >
                    {message.thoughts}
                  </ReactMarkdown>
                </div>
              </div>
            </div>
          </>
        )}

        {isStreaming && (
          <span className="ml-1 inline-block w-2 h-4 bg-blue-500 animate-pulse" />
        )}
      </div>
    </div>
  );
}

async function sendMessage(
  messages: { role: string; content: string }[],
  onUpdate: (content: string, thoughts: string) => void
) {
  const response = await fetch(API_URL, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${API_KEY}`
    },
    body: JSON.stringify({
      model: 'deepseek-reasoner',
      messages,
      temperature: 0.7,
      max_tokens: 1000,
      stream: true
    })
  });

  if (!response.ok) {
    throw new Error(`HTTP error! status: ${response.status}`);
  }

  const reader = response.body?.getReader();
  if (!reader) throw new Error('No reader available');

  const decoder = new TextDecoder();
  let buffer = '';
  let currentContent = '';
  let currentThoughts = '';

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
          const content = json.choices[0]?.delta?.content || '';
          const thoughts = json.choices[0]?.delta?.reasoning_content || '';
          
          currentContent += content;
          currentThoughts += thoughts;
          onUpdate(currentContent, currentThoughts);
        } catch (e) {
          console.error('Error parsing streaming response:', e);
        }
      }
    }
  }

  setMessages(prev => [...prev, response]);
}

export function DeepSeekChat() {
  const [state, setState] = useState<ChatState>({
    messages: [],
    isLoading: false,
    error: null
  });
  const [input, setInput] = useState('');
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const audioFadeRef = useRef<(() => void) | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [state.messages]);

  useEffect(() => {
    // Store the fadeOutAudio function from ThinkingAnimation
    return () => {
      if (audioFadeRef.current) {
        audioFadeRef.current();
      }
    };
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!input.trim() || state.isLoading) return;

    const userMessage: Message = {
      role: 'user',
      content: input
    };

    setState(prev => ({
      ...prev,
      messages: [...prev.messages, userMessage],
      isLoading: true,
      error: null
    }));
    setInput('');

    try {
      const messages = [
        ...state.messages,
        userMessage
      ].map(({ role, content }) => ({ role, content }));

      let streamingMessage: Message = {
        role: 'assistant',
        content: '',
        thoughts: ''
      };

      setState(prev => ({
        ...prev,
        messages: [...prev.messages, streamingMessage]
      }));

      await sendMessage(messages, (content, thoughts) => {
        streamingMessage = {
          role: 'assistant',
          content,
          thoughts: thoughts || undefined
        };

        setState(prev => ({
          ...prev,
          messages: [...prev.messages.slice(0, -1), streamingMessage]
        }));
      });
    } catch (error) {
      console.error('Failed to send message:', error);
      setState(prev => ({
        ...prev,
        error: error instanceof Error ? error.message : 'Failed to send message'
      }));
    } finally {
      setState(prev => ({ ...prev, isLoading: false }));
    }
  };

  return (
    <div className="h-[calc(100vh-200px)] flex flex-col">
      <div className="flex-1 overflow-y-auto space-y-4 p-4">
        {state.messages.length === 0 && !state.isLoading && (
          <div className="text-center text-gray-400 mt-8">
            Start a conversation with DeepSeek AI
          </div>
        )}
        {state.messages.map((message, i) => (
          <ChatMessage
            key={i}
            message={message}
            isStreaming={i === state.messages.length - 1 && state.isLoading}
            inline={i === state.messages.length - 1 && state.isLoading}
          />
        ))}
        {state.isLoading && (
          <div className="flex flex-col items-center justify-center">
            <ThinkingAnimation 
              onFadeOutRef={(fadeOut) => {
                audioFadeRef.current = fadeOut;
              }}
            />
            <div className="text-blue-400 animate-pulse text-center">
              Thinking...
            </div>
          </div>
        )}
        {!state.isLoading && state.messages.length > 0 && (
          audioFadeRef.current?.()
        )}
        <div ref={messagesEndRef} />
      </div>

      <form onSubmit={handleSubmit} className="p-4 border-t border-[#3A3A3C]">
        <div className="flex items-center gap-2">
          <input
            type="text"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder="Ask DeepSeek anything..."
            className="flex-1 bg-[#2C2C2E] rounded-lg px-4 py-2 focus:outline-none focus:ring-2 focus:ring-[#3A3A3C]"
            disabled={state.isLoading}
          />
          <button
            type="submit"
            disabled={state.isLoading || !input.trim()}
            className="p-2 bg-[#2C2C2E] rounded-lg hover:bg-[#3A3A3C] transition-colors disabled:opacity-50"
          >
            {state.isLoading ? (
              <RefreshCw className="w-5 h-5 animate-spin" />
            ) : (
              <SendHorizontal className="w-5 h-5" />
            )}
          </button>
        </div>
        {state.error && (
          <p className="text-red-500 text-sm mt-2">{state.error}</p>
        )}
        <p className="text-sm text-gray-500 mt-2">
          {state.isLoading ? 'DeepSeek is thinking...' : 'Powered by DeepSeek AI'}
        </p>
      </form>
    </div>
  );
}