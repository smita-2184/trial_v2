import { useState, useRef, useEffect } from 'react';
import { RefreshCw, Beaker, Play, Pause } from 'lucide-react';
import { BlockMath } from 'react-katex';
import { useOpenAIStore } from '../store/openai';

type ViewMode = 'analysis' | 'simulation' | 'animation';

interface ChemicalResult {
  reaction: string;
  products: string[];
  reactants: string[];
  balancedEquation: string;
  mechanism: string;
  conditions: {
    temperature: string;
    pressure: string;
    catalyst?: string;
  };
  energetics: {
    enthalpy: string;
    entropy: string;
    gibbs: string;
  };
  visualization?: {
    type: 'molecule' | 'reaction' | 'energy';
    data: any;
  };
}

interface SimulationConfig {
  type: 'reaction' | 'equilibrium' | 'kinetics';
  parameters: {
    temperature: number;
    concentration: number[];
    time: number;
    rateConstants: number[];
  };
  equations: string[];
  initialConditions: {
    reactants: number[];
    products: number[];
  };
  visualization: {
    type: string;
    data: {
      molecules: Array<{
        positions: Array<[number, number]>;
        bonds: Array<[number, number]>;
        elements: string[];
      }>;
      timeSteps: Array<{
        time: number;
        moleculeIndex: number;
      }>;
      energyProfile?: Array<[number, number]>;
    };
  };
}

interface AnimationConfig {
  type: 'mechanism' | 'collision' | 'orbital';
  frames: {
    molecules: {
      positions: [number, number, number][];
      rotations: [number, number, number][];
      bonds: [number, number][];
      elements: string[];
      charges?: number[];
    };
    time: number;
    energyLevel?: number;
    reactionCoordinate?: number;
  }[];
  duration: number;
  camera: {
    position: [number, number, number];
    target: [number, number, number];
  };
}

export function ChemistryModel() {
  const [viewMode, setViewMode] = useState<ViewMode>('analysis');
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<ChemicalResult | null>(null);
  const simulationConfigRef = useRef<SimulationConfig | null>(null);
  const animationConfigRef = useRef<AnimationConfig | null>(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [time, setTime] = useState(0);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const animationFrameRef = useRef<number>();
  const service = useOpenAIStore((state) => state.service);

  const validateSimulationConfig = (config: any): SimulationConfig => {
    if (!config || typeof config !== 'object') {
      throw new Error('Invalid simulation configuration format');
    }

    return {
      type: config.type || 'reaction',
      parameters: {
        temperature: config.parameters?.temperature || 298,
        concentration: Array.isArray(config.parameters?.concentration) 
          ? config.parameters.concentration 
          : [1.0, 1.0],
        time: config.parameters?.time || 0,
        rateConstants: Array.isArray(config.parameters?.rateConstants)
          ? config.parameters.rateConstants
          : [0.1]
      },
      equations: Array.isArray(config.equations) ? config.equations : [],
      initialConditions: {
        reactants: Array.isArray(config.initialConditions?.reactants)
          ? config.initialConditions.reactants
          : [1.0],
        products: Array.isArray(config.initialConditions?.products)
          ? config.initialConditions.products
          : [0.0]
      },
      visualization: {
        type: config.visualization?.type || 'molecule',
        data: {
          molecules: Array.isArray(config.visualization?.data?.molecules)
            ? config.visualization.data.molecules.map((mol: any) => ({
                positions: Array.isArray(mol.positions) ? mol.positions : [[0, 0, 0]],
                bonds: Array.isArray(mol.bonds) ? mol.bonds : [],
                elements: Array.isArray(mol.elements) ? mol.elements : ['H']
              }))
            : [{
                positions: [[0, 0, 0]],
                bonds: [],
                elements: ['H']
              }],
          timeSteps: Array.isArray(config.visualization?.data?.timeSteps)
            ? config.visualization.data.timeSteps
            : [0],
          energyProfile: Array.isArray(config.visualization?.data?.energyProfile)
            ? config.visualization.data.energyProfile
            : undefined
        }
      }
    };
  };

  const validateAnimationConfig = (config: any): AnimationConfig => {
    if (!config || typeof config !== 'object') {
      throw new Error('Invalid animation configuration format');
    }

    return {
      type: config.type || 'mechanism',
      frames: Array.isArray(config.frames) 
        ? config.frames.map((frame: any) => ({
            molecules: {
              positions: Array.isArray(frame.molecules?.positions)
                ? frame.molecules.positions
                : [[0, 0, 0]],
              rotations: Array.isArray(frame.molecules?.rotations)
                ? frame.molecules.rotations
                : [[0, 0, 0]],
              bonds: Array.isArray(frame.molecules?.bonds)
                ? frame.molecules.bonds
                : [],
              elements: Array.isArray(frame.molecules?.elements)
                ? frame.molecules.elements
                : ['H'],
              charges: Array.isArray(frame.molecules?.charges)
                ? frame.molecules.charges
                : undefined
            },
            time: typeof frame.time === 'number' ? frame.time : 0,
            energyLevel: typeof frame.energyLevel === 'number' 
              ? frame.energyLevel 
              : undefined,
            reactionCoordinate: typeof frame.reactionCoordinate === 'number'
              ? frame.reactionCoordinate
              : undefined
          }))
        : [{
            molecules: {
              positions: [[0, 0, 0]],
              rotations: [[0, 0, 0]],
              bonds: [],
              elements: ['H']
            },
            time: 0
          }],
      duration: typeof config.duration === 'number' ? config.duration : 5000,
      camera: {
        position: Array.isArray(config.camera?.position)
          ? config.camera.position
          : [0, 0, 10],
        target: Array.isArray(config.camera?.target)
          ? config.camera.target
          : [0, 0, 0]
      }
    };
  };

  const generateSimulation = async (description: string) => {
    if (!service || !description.trim()) return;

    setLoading(true);
    setError(null);

    try {
      const prompt = `Generate a chemical simulation configuration for this reaction:

${description}

Format as JSON with this EXACT structure:
{
  "type": "reaction",
  "parameters": {
    "temperature": 298,
    "concentration": [1.0, 1.0],
    "time": 0,
    "rateConstants": [0.1]
  },
  "equations": ["A + B -> C"],
  "initialConditions": {
    "reactants": [1.0, 1.0],
    "products": [0.0]
  },
  "visualization": {
    "type": "molecule",
    "data": {
      "molecules": [
        {
          "positions": [[0, 0, 0]],
          "bonds": [[0, 1]],
          "elements": ["H"]
        }
      ],
      "timeSteps": [0],
      "energyProfile": [[0, 0]]
    }
  }
}

Use ONLY these exact fields and types. No additional fields.`;

      const response = await service.generateResponse(prompt);
      
      try {
        const rawConfig = JSON.parse(response);
        const validatedConfig = validateSimulationConfig(rawConfig);
        simulationConfigRef.current = validatedConfig;
        startSimulation(validatedConfig);
      } catch (parseError) {
        console.error('Failed to parse simulation config:', parseError);
        setError('Invalid simulation configuration. Please try again with a different description.');
      }
    } catch (error) {
      console.error('Simulation error:', error);
      setError('Failed to generate simulation. Please try again.');
      simulationConfigRef.current = null;
    } finally {
      setLoading(false);
    }
  };

  const generateAnimation = async (description: string) => {
    if (!service || !description.trim()) return;

    setLoading(true);
    setError(null);

    try {
      const prompt = `Generate a chemical animation configuration for this process:

${description}

Format as JSON with this EXACT structure:
{
  "type": "mechanism",
  "frames": [
    {
      "molecules": {
        "positions": [[0, 0, 0]],
        "rotations": [[0, 0, 0]],
        "bonds": [[0, 1]],
        "elements": ["H"],
        "charges": [0]
      },
      "time": 0,
      "energyLevel": 0,
      "reactionCoordinate": 0
    }
  ],
  "duration": 5000,
  "camera": {
    "position": [0, 0, 10],
    "target": [0, 0, 0]
  }
}

Use ONLY these exact fields and types. No additional fields.`;

      const response = await service.generateResponse(prompt);
      
      try {
        const rawConfig = JSON.parse(response);
        const validatedConfig = validateAnimationConfig(rawConfig);
        animationConfigRef.current = validatedConfig;
        startAnimation(validatedConfig);
      } catch (parseError) {
        console.error('Failed to parse animation config:', parseError);
        setError('Invalid animation configuration. Please try again with a different description.');
      }
    } catch (error) {
      console.error('Animation error:', error);
      setError('Failed to generate animation. Please try again.');
      animationConfigRef.current = null;
    } finally {
      setLoading(false);
    }
  };

  const handleQuery = async () => {
    if (!service || !input.trim()) return;

    setLoading(true);
    setError(null);

    try {
      const prompt = `Analyze this chemical reaction or process. Include:
1. Balanced equation
2. Reaction mechanism
3. Reaction conditions (temperature, pressure, catalyst)
4. Thermodynamic data (ΔH, ΔS, ΔG)

Process: ${input}

Format the response as JSON:
{
  "reaction": "string",
  "products": ["string"],
  "reactants": ["string"],
  "balancedEquation": "string (LaTeX)",
  "mechanism": "string",
  "conditions": {
    "temperature": "string",
    "pressure": "string",
    "catalyst": "string (optional)"
  },
  "energetics": {
    "enthalpy": "string (LaTeX)",
    "entropy": "string (LaTeX)",
    "gibbs": "string (LaTeX)"
  }
}`;

      const response = await service.generateResponse(prompt);
      const parsedResult = JSON.parse(response);
      setResult(parsedResult);
    } catch (error) {
      console.error('Analysis error:', error);
      setError('Failed to analyze reaction. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const startSimulation = (config: SimulationConfig) => {
    if (!canvasRef.current) return;

    const ctx = canvasRef.current.getContext('2d');
    if (!ctx) return;

    const { width, height } = ctx.canvas;
    const scale = Math.min(width, height) / 20;

    const simulate = () => {
      if (!isPlaying) return;

      // Clear canvas
      ctx.clearRect(0, 0, width, height);

      // Calculate current state based on time and timeSteps
      const timeSteps = config.visualization.data.timeSteps;
      const currentTimeStep = timeSteps[Math.floor(time * 60) % timeSteps.length];
      const currentState = config.visualization.data.molecules[currentTimeStep.moleculeIndex];

      // Draw molecules
      currentState.positions.forEach((pos, i) => {
        const element = currentState.elements[i];
        const screenX = width/2 + pos[0] * scale;
        const screenY = height/2 + pos[1] * scale;

        // Draw atom
        ctx.beginPath();
        ctx.arc(screenX, screenY, getAtomRadius(element), 0, Math.PI * 2);
        ctx.fillStyle = getAtomColor(element);
        ctx.fill();
        ctx.strokeStyle = '#ffffff';
        ctx.lineWidth = 1;
        ctx.stroke();

        // Draw element label
        ctx.fillStyle = '#ffffff';
        ctx.font = '12px monospace';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText(element, screenX, screenY);
      });

      // Draw bonds
      currentState.bonds.forEach(([i, j]) => {
        const pos1 = currentState.positions[i];
        const pos2 = currentState.positions[j];
        
        ctx.beginPath();
        ctx.moveTo(width/2 + pos1[0] * scale, height/2 + pos1[1] * scale);
        ctx.lineTo(width/2 + pos2[0] * scale, height/2 + pos2[1] * scale);
        ctx.strokeStyle = '#ffffff';
        ctx.lineWidth = 2;
        ctx.stroke();
      });

      // Draw energy profile if available
      if (config.visualization.data.energyProfile) {
        drawEnergyProfile(
          ctx, 
          config.visualization.data.energyProfile,
          Math.floor(time * 60) % timeSteps.length
        );
      }

      // Update time
      setTime(t => t + 0.016);

      // Request next frame
      animationFrameRef.current = requestAnimationFrame(simulate);
    };

    setIsPlaying(true);
    simulate();
  };

  const startAnimation = (config: AnimationConfig) => {
    if (!canvasRef.current) return;

    const ctx = canvasRef.current.getContext('2d');
    if (!ctx) return;

    const { width, height } = ctx.canvas;
    const scale = Math.min(width, height) / 20;

    const animate = () => {
      if (!isPlaying) return;

      // Clear canvas
      ctx.clearRect(0, 0, width, height);

      // Calculate current frame
      const frameIndex = Math.floor((time % config.duration) / (config.duration / config.frames.length));
      const frame = config.frames[frameIndex];

      // Draw molecules
      frame.molecules.positions.forEach((pos, i) => {
        const element = frame.molecules.elements[i];
        const charge = frame.molecules.charges?.[i] || 0;
        
        // Apply rotation
        const rotation = frame.molecules.rotations[i];
        const rotatedPos = rotatePoint(pos, rotation);
        
        const screenX = width/2 + rotatedPos[0] * scale;
        const screenY = height/2 + rotatedPos[1] * scale;

        // Draw atom
        ctx.beginPath();
        ctx.arc(screenX, screenY, getAtomRadius(element), 0, Math.PI * 2);
        ctx.fillStyle = getAtomColor(element);
        ctx.fill();
        ctx.strokeStyle = '#ffffff';
        ctx.lineWidth = 1;
        ctx.stroke();

        // Draw element label and charge
        ctx.fillStyle = '#ffffff';
        ctx.font = '12px monospace';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText(element + (charge ? (charge > 0 ? '+' : '−') : ''), screenX, screenY);
      });

      // Draw bonds with electron density
      frame.molecules.bonds.forEach(([i, j]) => {
        const pos1 = frame.molecules.positions[i];
        const pos2 = frame.molecules.positions[j];
        
        // Calculate electron density gradient
        const gradient = ctx.createLinearGradient(
          width/2 + pos1[0] * scale, height/2 + pos1[1] * scale,
          width/2 + pos2[0] * scale, height/2 + pos2[1] * scale
        );
        gradient.addColorStop(0, '#60A5FA');
        gradient.addColorStop(0.5, '#93C5FD');
        gradient.addColorStop(1, '#60A5FA');
        
        ctx.beginPath();
        ctx.moveTo(width/2 + pos1[0] * scale, height/2 + pos1[1] * scale);
        ctx.lineTo(width/2 + pos2[0] * scale, height/2 + pos2[1] * scale);
        ctx.strokeStyle = gradient;
        ctx.lineWidth = 2;
        ctx.stroke();
      });

      // Draw reaction progress
      if (frame.reactionCoordinate !== undefined) {
        drawReactionProgress(ctx, frame.reactionCoordinate, frame.energyLevel || 0);
      }

      // Update time
      setTime(t => t + 0.016);

      // Request next frame
      animationFrameRef.current = requestAnimationFrame(animate);
    };

    setIsPlaying(true);
    animate();
  };

  // Helper functions for visualization
  const getAtomRadius = (element: string): number => {
    const radii: { [key: string]: number } = {
      H: 5,
      C: 8,
      N: 7,
      O: 7,
      F: 6,
      Cl: 9,
      Br: 10,
      I: 11,
      default: 8
    };
    return radii[element] || radii.default;
  };

  const getAtomColor = (element: string): string => {
    const colors: { [key: string]: string } = {
      H: '#FFFFFF',
      C: '#808080',
      N: '#0000FF',
      O: '#FF0000',
      F: '#FFFF00',
      Cl: '#00FF00',
      Br: '#800000',
      I: '#800080',
      default: '#808080'
    };
    return colors[element] || colors.default;
  };

  const rotatePoint = (
    point: [number, number, number], 
    rotation: [number, number, number]
  ): [number, number, number] => {
    // Implement 3D rotation matrix multiplication
    // This is a simplified version - implement full 3D rotation if needed
    const [x, y, z] = point;
    const [, , rz] = rotation;
    
    // Basic rotation around Z-axis for demonstration
    const cos = Math.cos(rz);
    const sin = Math.sin(rz);
    
    return [
      x * cos - y * sin,
      x * sin + y * cos,
      z
    ];
  };

  const drawEnergyProfile = (
    ctx: CanvasRenderingContext2D,
    profile: number[][],
    currentStep: number
  ) => {
    const { width, height } = ctx.canvas;
    const graphHeight = height * 0.3;
    const graphY = height - graphHeight - 20;
    
    // Draw axes
    ctx.beginPath();
    ctx.strokeStyle = '#666666';
    ctx.lineWidth = 1;
    ctx.moveTo(50, graphY);
    ctx.lineTo(50, graphY + graphHeight);
    ctx.lineTo(width - 50, graphY + graphHeight);
    ctx.stroke();

    // Draw energy profile
    ctx.beginPath();
    ctx.strokeStyle = '#60A5FA';
    ctx.lineWidth = 2;
    profile.forEach((point, i) => {
      const x = 50 + (width - 100) * (i / (profile.length - 1));
      const y = graphY + graphHeight - (point[1] / profile[0][1]) * graphHeight;
      if (i === 0) ctx.moveTo(x, y);
      else ctx.lineTo(x, y);
    });
    ctx.stroke();

    // Draw current position
    const currentX = 50 + (width - 100) * (currentStep / (profile.length - 1));
    const currentY = graphY + graphHeight - (profile[currentStep][1] / profile[0][1]) * graphHeight;
    ctx.beginPath();
    ctx.arc(currentX, currentY, 5, 0, Math.PI * 2);
    ctx.fillStyle = '#FF0000';
    ctx.fill();
  };

  const drawReactionProgress = (
    ctx: CanvasRenderingContext2D,
    progress: number,
    energy: number
  ) => {
    const { width, height } = ctx.canvas;
    const barWidth = width - 100;
    const barHeight = 20;
    const barY = height - barHeight - 20;

    // Draw progress bar background
    ctx.fillStyle = '#2C2C2E';
    ctx.fillRect(50, barY, barWidth, barHeight);

    // Draw progress
    ctx.fillStyle = '#60A5FA';
    ctx.fillRect(50, barY, barWidth * progress, barHeight);

    // Draw energy indicator
    const energyHeight = 50;
    const energyY = barY - energyHeight - 10;
    const normalizedEnergy = (energy + 1) / 2; // Normalize to [0,1]
    
    ctx.fillStyle = energy > 0 ? '#FF0000' : '#00FF00';
    ctx.fillRect(
      50 + barWidth * progress - 2,
      energyY + energyHeight * (1 - normalizedEnergy),
      4,
      energyHeight * normalizedEnergy
    );
  };

  // Clean up animation frame on unmount
  useEffect(() => {
    return () => {
      if (animationFrameRef.current) {
        cancelAnimationFrame(animationFrameRef.current);
      }
    };
  }, []);

  // Update canvas size when parent size changes
  useEffect(() => {
    if (!canvasRef.current) return;

    const resizeCanvas = () => {
      const canvas = canvasRef.current;
      if (!canvas) return;

      canvas.width = canvas.offsetWidth;
      canvas.height = canvas.offsetHeight;
    };

    resizeCanvas();
    window.addEventListener('resize', resizeCanvas);

    return () => window.removeEventListener('resize', resizeCanvas);
  }, []);

  return (
    <div className="h-full flex flex-col bg-[#2C2C2E] rounded-lg">
      {/* Header */}
      <div className="flex items-center justify-between p-4 bg-[#1C1C1E] rounded-t-lg">
        <div className="flex items-center gap-4">
          <h2 className="text-lg font-medium">Chemistry Analysis</h2>
          <div className="flex items-center gap-2 ml-4">
            <button
              onClick={() => setViewMode('analysis')}
              className={`px-3 py-1.5 rounded-lg transition-colors ${
                viewMode === 'analysis' ? 'bg-blue-500' : 'bg-[#3A3A3C]'
              }`}
            >
              Analysis
            </button>
            <button
              onClick={() => setViewMode('simulation')}
              className={`px-3 py-1.5 rounded-lg transition-colors ${
                viewMode === 'simulation' ? 'bg-blue-500' : 'bg-[#3A3A3C]'
              }`}
            >
              Simulation
            </button>
            <button
              onClick={() => setViewMode('animation')}
              className={`px-3 py-1.5 rounded-lg transition-colors ${
                viewMode === 'animation' ? 'bg-blue-500' : 'bg-[#3A3A3C]'
              }`}
            >
              Animation
            </button>
          </div>
        </div>
      </div>

      {/* Input Form */}
      <div className="p-4 bg-[#1C1C1E] border-t border-[#3A3A3C]">
        <div className="flex items-center gap-2">
          <div className="relative flex-1">
            <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
              <Beaker className="w-5 h-5 text-gray-400" />
            </div>
            <input
              type="text"
              value={input}
              onChange={(e) => setInput(e.target.value)}
              placeholder={
                viewMode === 'analysis' 
                  ? "Ask about any chemical reaction, concept, or process..." 
                  : viewMode === 'simulation'
                  ? "Describe a chemical reaction to simulate (e.g., 'SN2 reaction between CH3Br and OH-')..."
                  : "Describe a chemical process to animate (e.g., 'ATP synthesis in mitochondria')..."
              }
              className="flex-1 bg-[#2C2C2E] rounded-lg pl-10 pr-4 py-3 w-full border-2 border-[#3A3A3C] focus:border-blue-500 focus:outline-none transition-colors"
            />
          </div>
          <button
            onClick={() => {
              switch (viewMode) {
                case 'analysis':
                  handleQuery();
                  break;
                case 'simulation':
                  generateSimulation(input);
                  break;
                case 'animation':
                  generateAnimation(input);
                  break;
              }
            }}
            disabled={loading || !input.trim()}
            className="px-6 py-3 bg-blue-500 rounded-lg hover:bg-blue-600 transition-colors disabled:opacity-50 disabled:hover:bg-blue-500 flex items-center gap-2 min-w-[140px] justify-center"
          >
            {loading ? (
              <>
                <RefreshCw className="w-4 h-4 animate-spin" />
                {viewMode === 'analysis' ? 'Analyzing...' : 
                 viewMode === 'simulation' ? 'Generating...' : 
                 'Creating...'}
              </>
            ) : (
              viewMode === 'analysis' ? 'Analyze' :
              viewMode === 'simulation' ? 'Simulate' :
              'Animate'
            )}
          </button>
        </div>
        
        {error && (
          <p className="mt-2 text-red-500 text-sm">{error}</p>
        )}
      </div>

      {/* Content */}
      <div className="flex-1 overflow-y-auto p-4">
        {viewMode === 'analysis' && result ? (
          <div className="space-y-6">
            {/* Reaction Overview */}
            <div className="bg-[#1C1C1E] rounded-lg p-6">
              <h3 className="text-lg font-medium mb-4">Reaction Overview</h3>
              <div className="space-y-4">
                <div>
                  <h4 className="text-sm font-medium text-gray-400">Balanced Equation</h4>
                  <BlockMath math={result.balancedEquation} />
                </div>
                <div>
                  <h4 className="text-sm font-medium text-gray-400">Mechanism</h4>
                  <p className="text-gray-300">{result.mechanism}</p>
                </div>
              </div>
            </div>

            {/* Conditions */}
            <div className="bg-[#1C1C1E] rounded-lg p-6">
              <h3 className="text-lg font-medium mb-4">Reaction Conditions</h3>
              <div className="grid grid-cols-3 gap-4">
                <div>
                  <h4 className="text-sm font-medium text-gray-400">Temperature</h4>
                  <p className="text-gray-300">{result.conditions.temperature}</p>
                </div>
                <div>
                  <h4 className="text-sm font-medium text-gray-400">Pressure</h4>
                  <p className="text-gray-300">{result.conditions.pressure}</p>
                </div>
                {result.conditions.catalyst && (
                  <div>
                    <h4 className="text-sm font-medium text-gray-400">Catalyst</h4>
                    <p className="text-gray-300">{result.conditions.catalyst}</p>
                  </div>
                )}
              </div>
            </div>

            {/* Energetics */}
            <div className="bg-[#1C1C1E] rounded-lg p-6">
              <h3 className="text-lg font-medium mb-4">Thermodynamics</h3>
              <div className="grid grid-cols-3 gap-4">
                <div>
                  <h4 className="text-sm font-medium text-gray-400">Enthalpy (ΔH)</h4>
                  <BlockMath math={result.energetics.enthalpy} />
                </div>
                <div>
                  <h4 className="text-sm font-medium text-gray-400">Entropy (ΔS)</h4>
                  <BlockMath math={result.energetics.entropy} />
                </div>
                <div>
                  <h4 className="text-sm font-medium text-gray-400">Gibbs Energy (ΔG)</h4>
                  <BlockMath math={result.energetics.gibbs} />
                </div>
              </div>
            </div>
          </div>
        ) : (viewMode !== 'analysis' && (
          <div className="bg-[#2C2C2E] rounded-lg p-4 h-full">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-medium">
                {viewMode === 'simulation' ? 'Chemical Simulation' : 'Chemical Animation'}
              </h3>
              <div className="flex items-center gap-2">
                <button
                  onClick={() => setIsPlaying(!isPlaying)}
                  className="p-2 rounded-lg bg-[#3A3A3C] hover:bg-[#4A4A4C] transition-colors"
                >
                  {isPlaying ? (
                    <Pause className="w-5 h-5" />
                  ) : (
                    <Play className="w-5 h-5" />
                  )}
                </button>
              </div>
            </div>
            <canvas
              ref={canvasRef}
              className="w-full h-[calc(100%-4rem)] bg-[#1C1C1E] rounded-lg"
            />
          </div>
        ))}
      </div>
    </div>
  );
}