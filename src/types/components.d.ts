import { ReactNode } from 'react';

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

export interface PointProps {
  x: number;
  y: number;
  color: string;
  size: number;
}

export interface MathExpression {
  type: "function" | "text" | "vector";
  content?: string;
  fn?: (x: number) => number;
  start?: [number, number];
  end?: [number, number];
  x?: number[];
  y?: number[];
  angle?: number[];
  scale?: number[];
}

export interface ExtraProps {
  inline?: boolean;
} 