import { useState, useRef, useEffect } from 'react';
import { Play, Pause, RotateCcw, ChevronRight, ChevronLeft } from 'lucide-react';
import { BlockMath } from 'react-katex';
import { useOpenAIStore } from '../store/openai';
import { Mafs, Coordinates, Plot, Theme, Point, Text, Transform, Vector } from 'mafs';
import { Calculator } from 'lucide-react';
import 'mafs/core.css';
import * as math from 'mathjs';

interface DerivationStep {
  latex: string;
  explanation: string;
  visualization?: {
    type: 'function' | 'transform' | 'vector' | 'point';
    data: {
      before: {
        type: 'text' | 'function' | 'vector';
        content?: string;
        fn?: (x: number) => number;
        start?: [number, number];
        end?: [number, number];
      };
      after: {
        type: 'text' | 'function' | 'vector';
        content?: string;
        fn?: (x: number) => number;
        start?: [number, number];
        end?: [number, number];
      };
      intermediates?: Array<{
        type: 'text' | 'function' | 'vector';
        content?: string;
        fn?: (x: number) => number;
        start?: [number, number];
        end?: [number, number];
      }>;
    };
    transformType?: 'translation' | 'rotation' | 'scale';
  };
}

const EXAMPLE_DERIVATIONS = [
  {
    title: 'Product Rule',
    description: 'Derivation of the product rule for derivatives',
    initial: 'd/dx[f(x)g(x)]'
  },
  {
    title: 'Chain Rule',
    description: 'Derivation of the chain rule',
    initial: 'd/dx[f(g(x))]'
  },
  {
    title: 'Integration by Parts',
    description: 'Derivation of integration by parts formula',
    initial: '\\int u\\,dv'
  },
  {
    title: 'Euler\'s Formula',
    description: 'Derivation of Euler\'s formula',
    initial: 'e^{ix}'
  }
];

export function MathDerivation() {
  const [currentStep, setCurrentStep] = useState(0);
  const [isPlaying, setIsPlaying] = useState(false);
  const [steps, setSteps] = useState<DerivationStep[]>([]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const dimensions = {
    width: window.innerWidth - 700,
    height: window.innerHeight - 100
  };
  const [animationTime, setAnimationTime] = useState(0);
  const animationSpeed = 1;
  const [currentTransform, setCurrentTransform] = useState({ x: 0, y: 0, angle: 0, scale: 1 });
  const [showGeoGebra, setShowGeoGebra] = useState(false);
  const _containerRef = useRef<HTMLDivElement>(null);
  const animationFrameRef = useRef<number>();
  const service = useOpenAIStore((state) => state.service);

  useEffect(() => {
    let lastTime = performance.now();
    
    const animate = (currentTime: number) => {
      const deltaTime = (currentTime - lastTime) / 1000; // Convert to seconds
      lastTime = currentTime;
      
      if (isPlaying) {
        setAnimationTime(prev => prev + deltaTime * animationSpeed);
      }
      
      animationFrameRef.current = requestAnimationFrame(animate);
    };
    
    animationFrameRef.current = requestAnimationFrame(animate);
    
    return () => {
      if (animationFrameRef.current) {
        cancelAnimationFrame(animationFrameRef.current);
      }
    };
  }, [isPlaying, animationSpeed]);

  useEffect(() => {
    if (steps[currentStep]?.visualization?.transformType) {
      const { before, after } = steps[currentStep].visualization.data;
      const progress = (Math.sin(animationTime) + 1) / 2; // Oscillate between 0 and 1
      
      switch (steps[currentStep].visualization.transformType) {
        case 'translation':
          setCurrentTransform({
            x: before.x + (after.x - before.x) * progress,
            y: before.y + (after.y - before.y) * progress,
            angle: 0,
            scale: 1
          });
          break;
        case 'rotation':
          setCurrentTransform({
            x: 0,
            y: 0,
            angle: before.angle + (after.angle - before.angle) * progress,
            scale: 1
          });
          break;
        case 'scale':
          setCurrentTransform({
            x: 0,
            y: 0,
            angle: 0,
            scale: before.scale + (after.scale - before.scale) * progress
          });
          break;
      }
    }
  }, [animationTime, currentStep, steps]);

  const renderVisualization = (step: DerivationStep) => {
    if (!step.visualization) return null;

    const { type, data, transformType } = step.visualization;
    const viewBox = { x: [-5, 5], y: [-5, 5] };
    const t = animationTime % (2 * Math.PI);

    try {
      const { type, data } = step.visualization;
      const viewBox = { x: [-5, 5] as [number, number], y: [-5, 5] as [number, number] };
      const t = animationTime % (2 * Math.PI); // Cycle animation every 2π seconds
      const graphHeight = dimensions.height - 200; // Increased height for better visibility

      return (
        <div className="w-full bg-[#1C1C1E] rounded-lg overflow-hidden mb-8" style={{ height: graphHeight }}>
          <Mafs
            viewBox={{ x: [-5, 5], y: [-5, 5] }}
            preserveAspectRatio={false}
            width={dimensions.width - 48}
            height={graphHeight}
          >
            <Coordinates.Cartesian />
            
            {type === 'transform' && (
              <Transform matrix={[
                [Math.cos(currentTransform.angle) || 1, -Math.sin(currentTransform.angle) || 0, currentTransform.x || 0],
                [Math.sin(currentTransform.angle) || 0, Math.cos(currentTransform.angle) || 1, currentTransform.y || 0],
                [0, 0, 1]
              ]}>
                {/* Render the mathematical element being transformed */}
                {data.before.type === 'text' && (
                  <Text x={0} y={0} attach="w" size={20} color={Theme.blue}>
                    {data.before.content}
                  </Text>
                )}
                {data.before.type === 'function' && (
                  <Plot.OfX 
                    y={(x) => {
                      try {
                        const result = data.before.fn?.(x);
                        return typeof result === 'number' && isFinite(result) ? result : 0;
                      } catch {
                        return 0;
                      }
                    }}
                    color={Theme.blue}
                  />
                )}
              </Transform>
            )}
            
            {type === 'vector' && (
              <>
                <Vector
                  tip={[
                    (data.before.start?.[0] || 0) + ((data.after.end?.[0] || 0) - (data.before.start?.[0] || 0)) * ((1 + Math.sin(t)) / 2),
                    (data.before.start?.[1] || 0) + ((data.after.end?.[1] || 0) - (data.before.start?.[1] || 0)) * ((1 + Math.sin(t)) / 2)
                  ]}
                  tail={[0, 0]}
                  color={Theme.blue}
                />
                {/* Enhanced ripple effect */}
                {[0.5, 1, 1.5, 2].map((scale, i) => (
                  <Point
                    key={i}
                    x={data.before.start?.[0] || 0}
                    y={data.before.start?.[1] || 0}
                    color={{ ...Theme.blue, alpha: Math.max(0, (1 - (t % 1)) / scale) }}
                    size={15 * scale * (t % 1)}
                  />
                ))}
              </>
            )}

            {type === 'function' && data.before.fn && (
              <>
                {/* Animated function plot */}
                <Plot.OfX 
                  y={(x) => {
                    try {
                      const progress = (Math.sin(t) + 1) / 2;
                      const beforeY = typeof data.before.fn === 'function' ? data.before.fn(x) : 0;
                      const afterY = typeof data.after.fn === 'function' ? data.after.fn(x) : 0;
                      const result = beforeY + (afterY - beforeY) * progress;
                      return isFinite(result) ? result : 0;
                    } catch (error) {
                      return 0;
                    }
                  }}
                  color={Theme.blue}
                />
                {/* Multiple trace points for better visualization */}
                <Point 
                  x={Math.cos(t) * 3 || 0}
                  y={0}
                  color={Theme.red}
                  size={8}
                />
              </>
            )}
          </Mafs>
        </div>
      );
    } catch (error) {
      console.error('Error rendering visualization:', error);
      return null;
    }
  };

  // Rest of the code remains the same...

  const generateDerivation = async (expression: string) => {
    if (!service) return;
    
    setLoading(true);
    try {
      const prompt = `Generate a step-by-step mathematical derivation for this expression with reactive animations: ${expression}

      Format the response as JSON with this structure:
      Important: Include visualization data for animating transformations between steps.
      {
        "steps": [
          {
            "latex": "LaTeX formatted equation",
            "explanation": "Clear explanation of this step",
            "visualization": {
              "type": "transform|function|vector|point",
              "transformType": "translation|rotation|scale",
              "data": {
                "before": {
                  "type": "text|function|vector",
                  "content": "LaTeX string for text",
                  "fn": "x^2 + 2x + 1",
                  "start": [0, 0],
                  "end": [1, 1]
                },
                "after": {
                  // Same structure as before
                },
                "intermediates": [
                  // Optional intermediate states
                ]
              }
            }
          }
        ]
      }
      1. Each step should show one clear transformation with animation
      2. Use transformations to show:
         - Terms moving and combining
         - Functions being transformed
         - Variables being substituted
         - Equations being rearranged
      3. Include detailed explanations of each transformation
      4. Use proper LaTeX notation
      5. Show intermediate states during complex transformations
      6. Coordinate animations with the mathematical steps
      7. End with the final result
      
      Example transformations:
      1. Moving terms: translation transform of LaTeX content
      2. Combining like terms: scale transform with intermediates
      3. Function transformation: function plot with animated parameters
      4. Variable substitution: text transform with rotation
      5. Equation rearrangement: multiple coordinated translations`;

      const result = await service.generateResponse(prompt);
      const parsed = JSON.parse(result);
      
      const processedSteps = parsed.steps.map((step: DerivationStep) => {
        if (step.visualization?.type === 'function') {
          const { before, after } = step.visualization.data;
          try {
            if (before.fn) {
              const compiledBefore = math.compile(before.fn);
              before.fn = (x: number) => {
                try {
                  const result = compiledBefore.evaluate({ x });
                  return typeof result === 'number' && isFinite(result) ? result : NaN;
                } catch {
                  return NaN;
                }
              };
            }
            if (after.fn) {
              const compiledAfter = math.compile(after.fn);
              after.fn = (x: number) => {
                try {
                  const result = compiledAfter.evaluate({ x });
                  return typeof result === 'number' && isFinite(result) ? result : NaN;
                } catch {
                  return NaN;
                }
              };
            }
          } catch {
            delete step.visualization;
          }
        }
        return step;
      });

      setSteps(processedSteps);
      setCurrentStep(0);
    } catch (error) {
      console.error('Failed to generate derivation:', error);
    } finally {
      setLoading(false);
    }
  };

  // Rest of the code remains the same...

  return (
    <div className="h-full flex flex-col">
      {/* Header */}
      <div className="flex-none bg-[#2C2C2E] p-4 border-b border-[#3A3A3C]">
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-medium">Mathematical Derivation</h2>
          <button
            onClick={() => setShowGeoGebra(!showGeoGebra)}
            className={`flex items-center gap-2 px-3 py-1.5 rounded-lg transition-colors ${
              showGeoGebra ? 'bg-blue-500 hover:bg-blue-600' : 'bg-[#3A3A3C] hover:bg-[#4A4A4C]'
            }`}
            title="Toggle GeoGebra Calculator"
          >
            <Calculator className="w-4 h-4" />
            {showGeoGebra ? 'Hide Calculator' : 'Show Calculator'}
          </button>
        </div>
      </div>

      {/* Main Content */}
      <div className="flex-1 overflow-y-auto flex">
        {/* Derivation Panel */}
        <div className={`flex-1 transition-all ${showGeoGebra ? 'w-1/2' : 'w-full'}`}>
        <div className="p-4 space-y-4">
          {/* Input Form */}
          <form onSubmit={(e) => {
            e.preventDefault();
            if (!input.trim()) return;
            generateDerivation(input);
          }} className="space-y-4">
            <div className="flex gap-2">
              <input
                type="text"
                value={input}
                onChange={(e) => setInput(e.target.value)}
                placeholder="Enter a mathematical expression to derive..."
                className="flex-1 bg-[#1C1C1E] rounded-lg px-4 py-2"
              />
              <button
                type="submit"
                disabled={loading}
                className="px-4 py-2 bg-blue-500 rounded-lg hover:bg-blue-600 transition-colors disabled:opacity-50"
              >
                {loading ? 'Generating...' : 'Derive'}
              </button>
            </div>

            {/* Example Derivations */}
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-2">
              {EXAMPLE_DERIVATIONS.map(({ title, description, initial }) => (
                <button
                  key={title}
                  type="button"
                  onClick={() => {
                    setInput(initial);
                    generateDerivation(initial);
                  }}
                  className="text-left p-4 bg-[#1C1C1E] rounded-lg hover:bg-[#3A3A3C] transition-colors"
                >
                  <div className="font-medium">{title}</div>
                  <div className="text-sm text-gray-400">{description}</div>
                </button>
              ))}
            </div>
          </form>

          {/* Derivation Steps */}
          {steps.length > 0 && (
            <div className="space-y-8">
              {/* Controls */}
              <div className="flex items-center justify-center gap-4">
                <button
                  onClick={() => setCurrentStep(prev => Math.max(0, prev - 1))}
                  disabled={currentStep === 0}
                  className="p-2 rounded-lg hover:bg-[#3A3A3C] disabled:opacity-50"
                >
                  <ChevronLeft className="w-6 h-6" />
                </button>

                <button
                  onClick={() => setIsPlaying(!isPlaying)}
                  className="p-2 rounded-lg bg-blue-500 hover:bg-blue-600"
                >
                  {isPlaying ? <Pause className="w-6 h-6" /> : <Play className="w-6 h-6" />}
                </button>

                <button
                  onClick={() => {
                    setCurrentStep(0);
                    setIsPlaying(false);
                  }}
                  className="p-2 rounded-lg hover:bg-[#3A3A3C]"
                >
                  <RotateCcw className="w-6 h-6" />
                </button>

                <button
                  onClick={() => setCurrentStep(prev => Math.min(steps.length - 1, prev + 1))}
                  disabled={currentStep === steps.length - 1}
                  className="p-2 rounded-lg hover:bg-[#3A3A3C] disabled:opacity-50"
                >
                  <ChevronRight className="w-6 h-6" />
                </button>
              </div>

              {/* Current Step */}
              <div className="bg-[#2C2C2E] rounded-lg p-6">
                <div className="mb-4">
                  <BlockMath math={steps[currentStep].latex} />
                </div>
                <p className="text-gray-400">
                  {steps[currentStep].explanation}
                </p>
              </div>

              {/* Visualization */}
              {steps[currentStep].visualization && (
                <div className="bg-[#2C2C2E] rounded-lg p-6">
                  <h3 className="text-lg font-medium mb-4">Visualization</h3>
                  {renderVisualization(steps[currentStep])}
                </div>
              )}

              {/* Progress Bar */}
              <div className="h-2 bg-[#3A3A3C] rounded-full overflow-hidden">
                <div 
                  className="h-full bg-blue-500 transition-all duration-300"
                  style={{ width: `${((currentStep + 1) / steps.length) * 100}%` }}
                />
              </div>
            </div>
          )}
        </div>
        </div>

        {/* GeoGebra Panel */}
        {showGeoGebra && (
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