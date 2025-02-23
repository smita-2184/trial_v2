import { ReactNode } from 'react';
import { Expression } from 'mathjs';

export interface Solution {
  practiceProblems: Array<{
    question: string;
    answer: string;
  }>;
  furtherReading: Array<{
    title: string;
    url: string;
  }>;
}

export interface MathExpression {
  type: "function" | "text" | "vector";
  content?: string;
  fn?: ((x: number) => number) | Expression;
  start?: [number, number];
  end?: [number, number];
  x?: number[];
  y?: number[];
  angle?: number[];
  scale?: number[];
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