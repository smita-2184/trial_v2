import React, { useState, useRef } from 'react';
import { useOpenAIStore } from '../store/openai';
import { ChevronLeft, ChevronRight, Calculator, Beaker, Atom, Microscope, Play, RefreshCw, Sparkles } from 'lucide-react';
import { InlineMath, BlockMath } from 'react-katex';
import * as math from 'mathjs';
import { Mafs, Coordinates, Plot, Theme, Line, Point } from 'mafs';
import 'mafs/core.css';
import { useResizable } from '../hooks/useResizable';
import { useEffect } from 'react';

declare global {
  interface Window {
    webkitAudioContext: typeof AudioContext;
  }
}

interface Step {
  explanation: string;
  latex?: string;
  result?: string;
  detailedExplanation?: string;
  visualization?: {
    type: string;
    data: any;
  };
}

interface MathResult {
  input: string;
  result: string;
  steps?: Step[];
  plot?: {
    type: 'function' | 'point' | 'line';
    data: any;
  };
  latex?: string;
  alternativeForms?: string[];
  relatedConcepts?: string[];
  properties?: { [key: string]: string };
  molecularFormula?: string;
  structuralFormula?: string;
  reactions?: string[];
  balancedEquation?: string;
}

const MATH_EXAMPLES = [
  { label: 'Solve equation', example: 'solve x^2 + 2x + 1 = 0' },
  { label: 'Calculate derivative', example: 'derivative of x^3 + 2x with respect to x' },
  { label: 'Evaluate integral', example: 'integrate sin(x) from 0 to pi' },
  { label: 'Plot function', example: 'plot y = sin(x)' },
  { label: 'Matrix operations', example: 'inverse of [[1,2],[3,4]]' }
];

export function MathExercises() {
  const [input, setInput] = useState('');
  const [history, setHistory] = useState<MathResult[]>([]);
  const [loading, setLoading] = useState(false);
  const [plotDimensions, setPlotDimensions] = useState({ width: 400, height: 300 });
  const [expandedSteps, setExpandedSteps] = useState<{ resultIndex: number; stepIndex: number }[]>([]);
  const [loadingExplanation, setLoadingExplanation] = useState<{ resultIndex: number; stepIndex: number } | null>(null);
  const [dimensions, setDimensions] = useState({
    width: window.innerWidth - 700,
    height: window.innerHeight - 100
  });
  const [showCalculator, setShowCalculator] = useState(false);
  const plotContainerRef = useRef<HTMLDivElement>(null);
  const molViewerRef = useRef<HTMLIFrameElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const viewerRef = useRef<HTMLDivElement>(null);
  const viewBox = { x: [-5, 5] as [number, number], y: [-5, 5] as [number, number] };
  const service = useOpenAIStore((state) => state.service);

  const processInput = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!input.trim() || !service || loading) return;

    setLoading(true);
    try {
      const prompt = `Process this math problem and provide:
        1. A clear explanation
        2. Step-by-step solution
        3. Final result in LaTeX format
        4. Alternative forms of the result
        5. Related concepts
        6. Important properties
        
        Problem: ${input}
        
        Format the response as JSON:
        {
          "explanation": "string",
          "steps": [
            {
              "explanation": "string",
              "latex": "string (optional)",
              "result": "string (optional)"
            }
          ],
          "result": "string",
          "latex": "string",
          "alternativeForms": ["form1", "form2", ...],
          "relatedConcepts": ["concept1", "concept2", ...],
          "properties": {
            "property1": "value1",
            "property2": "value2"
          }
        }`;

      const response = await service.generateResponse(prompt);
      const parsed = JSON.parse(response);

      setHistory(prev => [{
        input,
        ...parsed
      }, ...prev]);
      setInput('');
    } catch (error) {
      console.error('Failed to process input:', error);
    } finally {
      setLoading(false);
    }
  };

  const getDetailedExplanation = async (resultIndex: number, stepIndex: number) => {
    if (!service || !history[resultIndex]?.steps?.[stepIndex]) return;

    const step = history[resultIndex].steps![stepIndex];
    setLoadingExplanation({ resultIndex, stepIndex });

    try {
      const prompt = `Please provide a detailed, step-by-step explanation of this mathematical step:

Step: ${step.explanation}
${step.latex ? `Formula: ${step.latex}` : ''}
${step.result ? `Result: ${step.result}` : ''}

Explain:
1. The mathematical concepts involved
2. Why this step is necessary
3. How it connects to the previous and next steps
4. Any important rules or theorems being used
5. Common mistakes to avoid
6. Visual or intuitive way to understand this step

Make it clear and easy to understand for students.`;

      const detailedExplanation = await service.generateResponse(prompt);

      setHistory(prev => {
        const newHistory = [...prev];
        if (newHistory[resultIndex]?.steps?.[stepIndex]) {
          newHistory[resultIndex].steps![stepIndex].detailedExplanation = detailedExplanation;
        }
        return newHistory;
      });
    } catch (error) {
      console.error('Failed to get detailed explanation:', error);
    } finally {
      setLoadingExplanation(null);
    }
  };

  const isStepExpanded = (resultIndex: number, stepIndex: number) => {
    return expandedSteps.some(
      step => step.resultIndex === resultIndex && step.stepIndex === stepIndex
    );
  };

  const toggleStepExpansion = (resultIndex: number, stepIndex: number) => {
    if (isStepExpanded(resultIndex, stepIndex)) {
      setExpandedSteps(prev => 
        prev.filter(step => 
          !(step.resultIndex === resultIndex && step.stepIndex === stepIndex)
        )
      );
    } else {
      setExpandedSteps(prev => [...prev, { resultIndex, stepIndex }]);
      if (!history[resultIndex]?.steps?.[stepIndex]?.detailedExplanation) {
        getDetailedExplanation(resultIndex, stepIndex);
      }
    }
  };

  const renderPlot = (result: MathResult) => {
    if (!result.plot) return null;

    try {
      const { type, data } = result.plot;

      return (
        <div 
          ref={plotContainerRef}
          style={{ width: plotDimensions.width, height: plotDimensions.height }}
          className="relative bg-[#1C1C1E] rounded-lg overflow-hidden"
        >
          <Mafs
            viewBox={viewBox}
            preserveAspectRatio={false}
            width={plotDimensions.width}
            height={plotDimensions.height}
          >
            <Coordinates.Cartesian />
            {type === 'function' && (
              <Plot.OfX y={data} color={Theme.blue} />
            )}
            {type === 'point' && (
              <Point x={data.x} y={data.y} color={Theme.blue} />
            )}
            {type === 'line' && (
              <Line.Segment
                point1={[data.x1, data.y1]}
                point2={[data.x2, data.y2]}
                color={Theme.blue}
              />
            )}
          </Mafs>
        </div>
      );
    } catch (error) {
      console.error('Error rendering plot:', error);
      return null;
    }
  };

  return (
    <div className="h-full flex flex-col gap-4 p-4 bg-[#1C1C1E] rounded-lg">
      {/* Subject Selection */}
      <div className="bg-[#2C2C2E] p-4 rounded-lg sticky top-0 z-10">
        <h2 className="text-lg font-medium flex items-center gap-2">
          <Calculator className="w-5 h-5" />
          Mathematics Exercises
        </h2>
      </div>

      {/* Input Form */}
      <form onSubmit={processInput} className="space-y-4 bg-[#2C2C2E] p-4 rounded-lg">
        <div className="flex flex-col gap-4">
          <div className="flex items-center gap-2">
            <button
              onClick={() => setShowCalculator(!showCalculator)}
              className={`flex items-center gap-2 px-3 py-1.5 rounded-lg transition-colors ${
                showCalculator ? 'bg-blue-500 hover:bg-blue-600' : 'bg-[#3A3A3C] hover:bg-[#4A4A4C]'
              }`}
              title="Toggle GeoGebra Calculator"
            >
              <Calculator className="w-4 h-4" />
              {showCalculator ? 'Hide Calculator' : 'Show Calculator'}
            </button>
            <div className="relative flex-1">
              <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                <Calculator className="w-5 h-5 text-gray-400" />
              </div>
              <input
                type="text"
                value={input}
                onChange={(e) => setInput(e.target.value)}
                placeholder="Enter a math problem..."
                className="flex-1 bg-[#1C1C1E] rounded-lg pl-10 pr-4 py-3 w-full border-2 border-[#3A3A3C] focus:border-blue-500 focus:outline-none transition-colors"
              />
            </div>
            <button
              type="submit"
              disabled={loading || !input.trim()}
              className="px-6 py-3 bg-blue-500 rounded-lg hover:bg-blue-600 transition-colors disabled:opacity-50 disabled:hover:bg-blue-500 flex items-center gap-2 min-w-[140px] justify-center"
            >
              {loading ? (
                <>
                  <RefreshCw className="w-4 h-4 animate-spin" />
                  Processing...
                </>
              ) : (
                <>
                  <Play className="w-4 h-4" />
                  Solve
                </>
              )}
            </button>
          </div>

          <div className="text-sm text-gray-400">
            Try these examples or type your own question
          </div>
        </div>

        {/* Example Inputs */}
        <div className="grid grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-2">
          {MATH_EXAMPLES.map(({ label, example }) => (
            <button
              key={example}
              type="button"
              onClick={() => setInput(example)}
              className="text-left text-sm px-4 py-3 bg-[#1C1C1E] rounded-lg hover:bg-[#3A3A3C] transition-colors flex items-center gap-2 group border border-[#3A3A3C] hover:border-blue-500"
            >
              <Sparkles className="w-4 h-4 text-gray-400 group-hover:text-blue-400 transition-colors" />
              {label}
            </button>
          ))}
        </div>
      </form>

      {/* Results */}
      <div className="flex-1 flex gap-4">
        {/* Main Content */}
        <div className={`flex-1 space-y-6 overflow-y-auto ${showCalculator ? 'w-1/2' : 'w-full'}`}>
          {history.map((result, resultIndex) => (
            <div key={resultIndex} className="bg-[#2C2C2E] rounded-lg p-6 border border-[#3A3A3C]">
              <div className="space-y-6">
                {/* Input */}
                <div className="flex items-center gap-2 pb-4 border-b border-[#3A3A3C]">
                  <div className="p-2 rounded-lg bg-blue-500/10">
                    <Calculator className="w-5 h-5 text-blue-400" />
                  </div>
                  <div>
                    <div className="text-sm font-medium">Query</div>
                    <div className="text-gray-400">{result.input}</div>
                  </div>
                </div>
                
                {/* Result */}
                <div>
                  <h3 className="text-lg font-medium mb-3">Result</h3>
                  <div className="bg-[#1C1C1E] rounded-lg p-4 text-gray-300">
                    {result.latex ? (
                      <BlockMath math={result.latex} />
                    ) : (
                      result.result
                    )}
                  </div>
                </div>

                {/* Plot */}
                {result.plot && renderPlot(result)}

                {/* Steps */}
                {result.steps && result.steps.length > 0 && (
                  <div>
                    <h3 className="text-lg font-medium mb-3">Solution Steps</h3>
                    <div className="space-y-2">
                      {result.steps.map((step, stepIndex) => (
                        <div key={stepIndex} className="bg-[#1C1C1E] rounded-lg p-4 border border-[#3A3A3C]">
                          <div className="flex items-start gap-2">
                            <div className="flex-none w-6 h-6 rounded-full bg-blue-500/20 text-blue-400 flex items-center justify-center text-sm font-medium mt-1">
                              {stepIndex + 1}
                            </div>
                            <div className="flex-1">
                              <div className="flex items-start justify-between gap-4">
                                <div className="flex-1">
                                  <div className="text-sm text-gray-300 mb-2">
                                    {step.explanation}
                                  </div>
                                  {step.latex && (
                                    <div className="pl-0">
                                      <BlockMath math={step.latex} />
                                    </div>
                                  )}
                                </div>
                                <button
                                  onClick={() => toggleStepExpansion(resultIndex, stepIndex)}
                                  className={`p-2 rounded-lg transition-colors ${
                                    isStepExpanded(resultIndex, stepIndex)
                                      ? 'bg-blue-500 hover:bg-blue-600'
                                      : 'bg-[#3A3A3C] hover:bg-[#4A4A4C]'
                                  }`}
                                  title="Show detailed explanation"
                                >
                                  <ChevronRight 
                                    className={`w-4 h-4 transition-transform ${
                                      isStepExpanded(resultIndex, stepIndex) ? 'rotate-90' : ''
                                    }`} 
                                  />
                                </button>
                              </div>
                              
                              {/* Detailed Explanation */}
                              {isStepExpanded(resultIndex, stepIndex) && (
                                <div className="mt-4 pl-0 border-t border-[#3A3A3C] pt-4">
                                  {loadingExplanation?.resultIndex === resultIndex && 
                                   loadingExplanation?.stepIndex === stepIndex ? (
                                    <div className="flex items-center gap-2 text-gray-400">
                                      <RefreshCw className="w-4 h-4 animate-spin" />
                                      Generating detailed explanation...
                                    </div>
                                  ) : (
                                    <div className="text-gray-300 prose prose-invert max-w-none text-sm">
                                      {step.detailedExplanation || 'Loading explanation...'}
                                    </div>
                                  )}
                                </div>
                              )}
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Alternative Forms */}
                {result.alternativeForms && result.alternativeForms.length > 0 && (
                  <div>
                    <h3 className="font-medium mb-2">Alternative Forms:</h3>
                    <div className="space-y-2">
                      {result.alternativeForms.map((form, formIndex) => (
                        <div key={formIndex} className="text-gray-400">
                          <InlineMath math={form} />
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Related Concepts */}
                {result.relatedConcepts && result.relatedConcepts.length > 0 && (
                  <div>
                    <h3 className="font-medium mb-2">Related Concepts:</h3>
                    <div className="flex flex-wrap gap-2">
                      {result.relatedConcepts.map((concept, conceptIndex) => (
                        <span
                          key={conceptIndex}
                          className="px-2 py-1 bg-[#3A3A3C] rounded text-sm"
                        >
                          {concept}
                        </span>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            </div>
          ))}
        </div>

        {/* Calculator Panel */}
        {showCalculator && (
          <div className="w-1/2 border-l border-[#3A3A3C] bg-[#1C1C1E]">
            <iframe
              src="https://www.geogebra.org/calculator"
              className="w-full h-full"
              title="GeoGebra Calculator"
              allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope"
            />
          </div>
        )}
      </div>
    </div>
  );
}