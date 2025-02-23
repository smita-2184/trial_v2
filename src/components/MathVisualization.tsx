import React, { useState, useEffect, useRef } from 'react';
import { Info, Maximize2, Minimize2, RefreshCw, ZoomIn, ZoomOut } from 'lucide-react';
import { useOpenAIStore } from '../store/openai';
import p5 from 'p5';
import { BlockMath } from 'react-katex';

const EXAMPLE_EQUATIONS = [
  { label: 'Parabola', equation: 'x^2' },
  { label: 'Sine Wave', equation: 'sin(x)' },
  { label: 'Circle', equation: 'sqrt(25-x^2)' },
  { label: 'Exponential', equation: 'e^x' },
  { label: 'Cubic', equation: 'x^3' }
];

export function MathVisualization() {
  const [equation, setEquation] = useState(EXAMPLE_EQUATIONS[0].equation);
  const [aiPrompt, setAiPrompt] = useState('');
  const [dimensions, setDimensions] = useState({
    width: window.innerWidth - 500,
    height: window.innerHeight - 200
  });
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [zoom, setZoom] = useState(1);
  const [error, setError] = useState<string | null>(null);
  const [explanation, setExplanation] = useState<string>('');
  const service = useOpenAIStore((state) => state.service);
  const [loading, setLoading] = useState(false);
  const [aiLoading, setAiLoading] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);
  const canvasRef = useRef<HTMLDivElement>(null);
  const p5Instance = useRef<p5>();
  const [time, setTime] = useState(0);
  const previousDimensions = useRef(dimensions);

  useEffect(() => {
    if (!service || !equation) return;

    setLoading(true);
    service.generateResponse(`Explain this mathematical equation in simple terms: ${equation}
    Focus on:
    1. What the equation represents
    2. Key features (like intercepts, symmetry, behavior)
    3. Shape and visual characteristics
    4. One simple real-world example
    Keep it very concise and clear. Use simple language.`)
      .then(setExplanation)
      .catch(console.error)
      .finally(() => setLoading(false));
  }, [equation, service]);

  useEffect(() => {
    if (!canvasRef.current) return;

    // Clean up previous instance
    if (p5Instance.current) {
      p5Instance.current.remove();
    }

    // Create new p5 instance
    const sketch = (p: p5) => {
      let width = canvasRef.current?.clientWidth || 800;
      let height = canvasRef.current?.clientHeight || 600;
      let t = 0;
      let particles: { x: number; y: number; vx: number; vy: number; life: number }[] = [];
      const colors = [
        [74, 144, 226],   // Blue
        [80, 227, 194],   // Cyan
        [184, 107, 237],  // Purple
      ];
      let colorIndex = 0;
      let hue = 0;

      p.setup = () => {
        p.createCanvas(width, height);
        p.frameRate(60);
        p.colorMode(p.HSB, 360, 100, 100, 1);
      };

      p.draw = () => {
        p.background(28, 28, 30); // Dark background
        p.translate(width / 2, height / 2); // Center origin
        
        // Animate color
        hue = (hue + 0.5) % 360;
        const mainColor = p.color(hue, 80, 90);
        
        // Draw grid
        p.stroke(58, 58, 60);
        p.strokeWeight(1);
        const gridSize = 50;
        for (let x = -width/2; x < width/2; x += gridSize) {
          p.line(x, -height/2, x, height/2);
        }
        for (let y = -height/2; y < height/2; y += gridSize) {
          p.line(-width/2, y, width/2, y);
        }

        // Draw axes
        const axisColor = p.color(hue, 20, 90);
        p.stroke(axisColor);
        p.strokeWeight(2);
        p.line(-width/2, 0, width/2, 0); // x-axis
        p.line(0, -height/2, 0, height/2); // y-axis

        // Draw function
        p.stroke(mainColor);
        p.strokeWeight(2);
        p.noFill();
        p.beginShape();
        let prevX = 0, prevY = 0;
        
        try {
          // Convert equation to JavaScript
          const jsEquation = equation
            .replace(/\^/g, '**')
            .replace(/sin/g, 'Math.sin')
            .replace(/cos/g, 'Math.cos')
            .replace(/tan/g, 'Math.tan')
            .replace(/sqrt/g, 'Math.sqrt')
            .replace(/e/g, 'Math.E')
            .replace(/pi/g, 'Math.PI');

          // Create function from equation
          const f = new Function('x', `return ${jsEquation}`);

          // Plot function
          for (let px = -width/2; px < width/2; px += 1) {
            const x = px / gridSize;
            try {
              const y = f(x);
              if (!isNaN(y) && isFinite(y)) {
                const screenY = -y * gridSize;
                p.vertex(px, screenY);
                
                // Add particles at intervals
                if (Math.random() < 0.03) {
                  const angle = Math.atan2(screenY - prevY, px - prevX);
                  particles.push({
                    x: px,
                    y: screenY,
                    vx: Math.cos(angle) * 2,
                    vy: Math.sin(angle) * 2,
                    life: 1
                  });
                }
                prevX = px;
                prevY = screenY;
              }
            } catch (e) {
              // Skip invalid points
            }
          }
        } catch (e) {
          setError('Invalid equation');
        }
        p.endShape();

        // Animate a point moving along the curve
        const trailLength = 10;
        const trailPoints = [];
        
        try {
          for (let i = 0; i < trailLength; i++) {
            const phase = t - (i * 0.1);
            const x = p.map(p.sin(phase), -1, 1, -5, 5);
            const f = new Function('x', `return ${equation.replace(/\^/g, '**')}`);
            const y = f(x);
            
            if (!isNaN(y) && isFinite(y)) {
              trailPoints.push({ 
                x: x * gridSize, 
                y: -y * gridSize,
                alpha: 1 - (i / trailLength)
              });
            }
          }
          
          // Draw trail
          trailPoints.forEach((point, i) => {
            const size = p.map(i, 0, trailLength, 12, 4);
            p.fill(hue, 80, 90, point.alpha);
            p.noStroke();
            p.circle(point.x, point.y, size);
          });
        } catch (e) {
          // Skip invalid points
        }

        // Update and draw particles
        for (let i = particles.length - 1; i >= 0; i--) {
          const particle = particles[i];
          
          // Update
          particle.x += particle.vx;
          particle.y += particle.vy;
          particle.life -= 0.02;
          
          // Draw
          if (particle.life > 0) {
            p.fill(hue, 80, 90, particle.life);
            p.noStroke();
            p.circle(particle.x, particle.y, 4 * particle.life);
          } else {
            particles.splice(i, 1);
          }
        }

        t += 0.02;
        setTime(t);
      };

      p.windowResized = () => {
        if (!canvasRef.current) return;
        width = canvasRef.current.clientWidth;
        height = canvasRef.current.clientHeight;
        p.resizeCanvas(width, height);
      };
    };

    p5Instance.current = new p5(sketch, canvasRef.current);

    return () => {
      if (p5Instance.current) {
        p5Instance.current.remove();
      }
    };
  }, [equation]);

  const handleAiRequest = async () => {
    if (!service || !aiPrompt.trim()) return;

    setAiLoading(true);
    try {
      const response = await service.generateResponse(`Convert this math visualization request into a mathematical function.
      Request: "${aiPrompt}"
      
      Rules:
      1. Return ONLY the function, nothing else
      2. Use proper mathematical notation (^, sin, cos, etc.)
      3. Keep it simple and well-formed
      
      Examples:
      - "draw a circle with radius 5" -> "sqrt(25-x^2)"
      - "plot x squared" -> "x^2"
      - "show me a sine wave" -> "sin(x)"
      - "plot a line through origin" -> "x"
      - "draw a parabola" -> "x^2"
      `);

      const func = response.trim();
      setEquation(func);
      setError(null);
    } catch (err) {
      setError('Failed to process AI request');
    } finally {
      setAiLoading(false);
    }
  };

  const toggleFullscreen = () => {
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
  };

  // Handle window resize
  useEffect(() => {
    const handleResize = () => {
      if (!isFullscreen) {
        setDimensions({
          width: window.innerWidth - 500,
          height: window.innerHeight - 200
        });
      }
    };

    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, [isFullscreen]);

  // Handle escape key to exit fullscreen
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && isFullscreen) {
        toggleFullscreen();
      }
    };

    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [isFullscreen]);

  return (
    <div className="h-full flex flex-col">
      {/* Header */}
      <div className="flex-none bg-[#2C2C2E] p-4 border-b border-[#3A3A3C]">
        <h2 className="text-lg font-medium">Math Visualization</h2>
      </div>

      {/* Scrollable Content */}
      <div className="flex-1 overflow-y-auto">
        <div className="p-4 space-y-4">
          <div className="space-y-4 mb-4">
            <div>
              <label className="block text-sm font-medium mb-2">Ask AI to Create Graph</label>
              <div className="flex gap-2">
                <input
                  type="text"
                  value={aiPrompt}
                  onChange={(e) => setAiPrompt(e.target.value)}
                  className="flex-1 bg-[#1C1C1E] rounded-lg px-4 py-2"
                  placeholder="e.g., 'draw a circle with radius 5'"
                />
                <button
                  onClick={handleAiRequest}
                  disabled={aiLoading || !aiPrompt.trim()}
                  className={`px-4 py-2 bg-[#3A3A3C] rounded-lg transition-colors ${
                    aiLoading || !aiPrompt.trim() ? 'opacity-50 cursor-not-allowed' : 'hover:bg-[#4A4A4C]'
                  }`}
                >
                  {aiLoading ? 'Processing...' : 'Generate'}
                </button>
              </div>
            </div>

            <div className="p-4 bg-[#1C1C1E] rounded-lg">
              <div className="flex items-center gap-2 mb-2">
                <label className="block text-sm font-medium">Enter Mathematical Expression</label>
                <div className="relative group">
                  <Info className="w-4 h-4 text-gray-400" />
                  <div className="absolute left-0 bottom-full mb-2 hidden group-hover:block w-64 p-2 bg-[#3A3A3C] rounded-lg text-xs">
                    Supported input types:
                    <br />• Basic operations: +, -, *, /, ^
                    <br />• Functions: sin, cos, tan, sqrt
                    <br />• Constants: e, pi
                  </div>
                </div>
              </div>
              <div className="space-y-2">
                <input
                  type="text"
                  value={equation}
                  onChange={(e) => {
                    const newEquation = e.target.value.trim();
                    setEquation(newEquation);
                    setError(null);
                  }}
                  className={`w-full bg-[#1C1C1E] rounded-lg px-4 py-2 ${
                    error ? 'border border-red-500' : ''
                  }`}
                  placeholder="e.g., x^2"
                />
                {error && (
                  <p className="text-red-500 text-sm">{error}</p>
                )}
              </div>
              
              <div className="mt-4">
                <label className="block text-sm font-medium mb-2">Example Equations</label>
                <div className="grid grid-cols-2 gap-2">
                  {EXAMPLE_EQUATIONS.map(({ label, equation: eq }) => (
                    <button
                      key={eq}
                      onClick={() => {
                        setEquation(eq);
                        setError(null);
                      }}
                      className="text-sm px-3 py-1.5 bg-[#3A3A3C] rounded-lg hover:bg-[#4A4A4C] transition-colors"
                    >
                      {label}
                    </button>
                  ))}
                </div>
              </div>
            </div>
          </div>

          <div className="flex gap-4 flex-1">
            {/* Graph Panel */}
            <div className="flex-1 relative">
              <div 
                ref={canvasRef} 
                className="absolute inset-0 bg-[#1C1C1E] rounded-lg overflow-hidden"
                style={{ transform: `scale(${zoom})` }}
              />
              
              {/* Zoom controls overlay */}
              <div className="absolute top-4 right-4 bg-[#2C2C2E] rounded-lg p-2 space-y-2">
                <button
                  onClick={() => setZoom(prev => Math.min(2, prev + 0.1))}
                  className="p-2 hover:bg-[#3A3A3C] rounded-lg"
                  title="Zoom in"
                >
                  <ZoomIn className="w-4 h-4" />
                </button>
                <div className="text-center text-sm">{(zoom * 100).toFixed(0)}%</div>
                <button
                  onClick={() => setZoom(prev => Math.max(0.5, prev - 0.1))}
                  className="p-2 hover:bg-[#3A3A3C] rounded-lg"
                  title="Zoom out"
                >
                  <ZoomOut className="w-4 h-4" />
                </button>
              </div>
            </div>

            {/* Right Panel - Controls & Info */}
            <div className="w-[300px] flex flex-col gap-4">
              {/* Function Info */}
              <div className="bg-[#2C2C2E] rounded-lg p-4 border border-[#3A3A3C]">
                <h3 className="text-lg font-medium mb-4">Current Function</h3>
                <div className="p-4 bg-[#1C1C1E] rounded-lg mb-4">
                  <BlockMath math={`f(x) = ${equation}`} />
                </div>
                <div className="space-y-2 text-sm text-gray-400">
                  <div>Domain: ℝ (Real numbers)</div>
                  <div>Range: Calculating...</div>
                  <div>Periodicity: Analyzing...</div>
                </div>
              </div>

              {/* Graph Controls */}
              <div className="bg-[#2C2C2E] rounded-lg p-4 border border-[#3A3A3C]">
                <h3 className="text-lg font-medium mb-4">Graph Controls</h3>
                <div className="space-y-4">
                  <div>
                    <label className="block text-sm mb-2">View Range</label>
                    <div className="grid grid-cols-2 gap-2">
                      <input
                        type="number"
                        placeholder="Min X"
                        className="bg-[#1C1C1E] rounded px-3 py-1.5 text-sm"
                        defaultValue={-10}
                      />
                      <input
                        type="number"
                        placeholder="Max X"
                        className="bg-[#1C1C1E] rounded px-3 py-1.5 text-sm"
                        defaultValue={10}
                      />
                    </div>
                  </div>
                  <div>
                    <label className="block text-sm mb-2">Animation Speed</label>
                    <input
                      type="range"
                      min="0.1"
                      max="2"
                      step="0.1"
                      defaultValue="1"
                      className="w-full"
                    />
                  </div>
                  <div>
                    <label className="block text-sm mb-2">Grid Size</label>
                    <input
                      type="range"
                      min="10"
                      max="100"
                      step="10"
                      defaultValue="50"
                      className="w-full"
                    />
                  </div>
                </div>
              </div>

              {/* Explanation */}
              <div className="bg-[#2C2C2E] rounded-lg p-4 border border-[#3A3A3C] flex-1 max-h-[200px] overflow-y-auto">
                <h3 className="text-lg font-medium mb-4">Explanation</h3>
                {loading ? (
                  <div className="animate-pulse">
                    <div className="h-4 bg-[#3A3A3C] rounded w-3/4 mb-2"></div>
                    <div className="h-4 bg-[#3A3A3C] rounded w-1/2"></div>
                  </div>
                ) : (
                  <div className="text-gray-400 space-y-2">
                    {explanation || 'Enter an equation to see its explanation.'}
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Fullscreen instructions */}
          {isFullscreen && (
            <div className="absolute bottom-4 left-1/2 -translate-x-1/2 text-xs text-gray-500">
              Press Esc to exit fullscreen
            </div>
          )}
        </div>
      </div>
    </div>
  );
}