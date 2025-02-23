import { ReactNode } from 'react';
import { Expression } from 'mathjs';

export interface Solution {
  question: string;
  steps: Array<{
    explanation: string;
    latex?: string;
    hint?: string;
  }>;
  finalAnswer: string;
  relatedConcepts: string[];
  difficulty: 'Easy' | 'Medium' | 'Hard';
  practiceProblems: Array<{
    question: string;
    answer: string;
    difficulty?: string;
    solution?: string;
  }>;
  furtherReading: Array<{
    title: string;
    url: string;
    topic?: string;
    description?: string;
    resources?: string[];
  }>;
  metadata?: {
    difficulty: string;
  };
  problemStatement?: string;
  solutionSteps?: Array<{
    explanation: string;
    latex?: string;
    hint?: string;
  }>;
}

export interface MathExpression {
  type: "function" | "text" | "vector";
  content?: string;
  fn?: ((x: number) => number) | Expression;
  start?: [number, number];
  end?: [number, number];
  x?: number;
  y?: number;
  angle?: number;
  scale?: number;
}

export interface PointProps {
  x: number;
  y: number;
  color: string;
  size: number;
}

export interface ChatMessageProps {
  message: Message;
  isStreaming?: boolean;
  inline?: boolean;
} 