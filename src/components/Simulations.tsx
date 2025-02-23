import React, { useState } from 'react';
import { Maximize2, Minimize2, RefreshCw, Wand2, Play, Settings, Beaker } from 'lucide-react';
import { useOpenAIStore } from '../store/openai';

const SIMULATIONS = [
  // Physics Simulations
  {
    id: 'compare-pendulum',
    title: 'Compare Pendulums',
    category: 'physics',
    url: 'https://www.myphysicslab.com/pendulum/compare-pendulum-en.html'
  },
  {
    id: 'pendulum',
    title: 'Pendulum Lab',
    category: 'physics',
    url: 'https://phet.colorado.edu/sims/html/pendulum-lab/latest/pendulum-lab_en.html'
  },
  {
    id: 'forces',
    title: 'Forces and Motion',
    category: 'physics',
    url: 'https://phet.colorado.edu/sims/html/forces-and-motion-basics/latest/forces-and-motion-basics_en.html'
  },
  {
    id: 'energy',
    title: 'Energy Forms and Changes',
    category: 'physics',
    url: 'https://phet.colorado.edu/sims/html/energy-forms-and-changes/latest/energy-forms-and-changes_en.html'
  },
  {
    id: 'waves',
    title: 'Wave Interference',
    category: 'physics',
    url: 'https://phet.colorado.edu/sims/html/wave-interference/latest/wave-interference_en.html'
  },
  {
    id: 'gravity',
    title: 'Gravity and Orbits',
    category: 'physics',
    url: 'https://phet.colorado.edu/sims/html/gravity-and-orbits/latest/gravity-and-orbits_en.html'
  },
  // Chemistry Simulations
  {
    id: 'atomic-interactions',
    title: 'Atomic Interactions',
    category: 'chemistry',
    url: 'https://phet.colorado.edu/sims/html/atomic-interactions/latest/atomic-interactions_en.html'
  },
  {
    id: 'molecule-shapes',
    title: 'Molecule Shapes',
    category: 'chemistry',
    url: 'https://phet.colorado.edu/sims/html/molecule-shapes/latest/molecule-shapes_en.html'
  },
  {
    id: 'acid-base',
    title: 'Acid-Base Solutions',
    category: 'chemistry',
    url: 'https://phet.colorado.edu/sims/html/acid-base-solutions/latest/acid-base-solutions_en.html'
  },
  {
    id: 'concentration',
    title: 'Concentration',
    category: 'chemistry',
    url: 'https://phet.colorado.edu/sims/html/concentration/latest/concentration_en.html'
  },
  {
    id: 'gas-properties',
    title: 'Gas Properties',
    category: 'chemistry',
    url: 'https://phet.colorado.edu/sims/html/gas-properties/latest/gas-properties_en.html'
  }
];

interface SimulationConfig {
  type: string;
  parameters: {
    [key: string]: number | string | boolean;
  };
  visualization: {
    elements: Array<{
      type: 'particle' | 'spring' | 'vector' | 'field';
      properties: {
        [key: string]: any;
      };
    }>;
    canvas: {
      width: number;
      height: number;
      scale: number;
    };
  };
  equations: string[];
  initialConditions: {
    [key: string]: number;
  };
}

interface SimulationsProps {
  category?: 'physics' | 'chemistry';
}

export function Simulations({ category = 'physics' }: SimulationsProps) {
  const [currentSim, setCurrentSim] = useState(SIMULATIONS[0]);
  const [customSimulation, setCustomSimulation] = useState<string | null>(null);
  const [generatingSimulation, setGeneratingSimulation] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [simulationPrompt, setSimulationPrompt] = useState('');
  const [isFullscreen, setIsFullscreen] = useState(false);
  const service = useOpenAIStore((state) => state.service);

  const filteredSimulations = SIMULATIONS.filter(sim => sim.category === category);

  const generateSimulation = async () => {
    if (!service || !simulationPrompt.trim() || generatingSimulation) return;

    setError(null);
    setGeneratingSimulation(true);
    try {
      const prompt = `Create an interactive ${category} simulation about: ${simulationPrompt}
      
      Create a complete HTML simulation that includes:
      1. Canvas-based visualization
      2. Interactive controls (sliders, buttons)
      3. Real-time parameter updates
      4. Scientific accuracy
      5. Clear visual feedback
      
      Return complete, self-contained HTML with:
      1. Inline styles (no external CSS)
      2. Vanilla JavaScript (no external libraries)
      3. Canvas-based rendering
      4. Scientific calculations
      5. User interface controls
      
      Wrap the entire simulation in:
      <div class="simulation-container">
        <!-- Simulation HTML here -->
      </div>`;

      const response = await service.generateResponse(prompt);
      
      // Validate that the response contains a simulation container
      if (!response.includes('simulation-container')) {
        throw new Error('Invalid simulation format received');
      }

      setCustomSimulation(response);
      setError('Failed to generate simulation: ' + (error instanceof Error ? error.message : 'Unknown error'));
    } catch (error) {
      console.error('Failed to generate simulation:', error);
    } finally {
      setGeneratingSimulation(false);
    }
  };

  return (
    <div className={`h-full flex flex-col bg-[#2C2C2E] rounded-lg ${
      isFullscreen ? 'fixed inset-4 z-50' : ''
    }`}>
      {/* Header */}
      <div className="flex items-center justify-between p-4 bg-[#1C1C1E] rounded-t-lg">
        <div className="flex items-center gap-4">
          <h2 className="text-lg font-medium flex items-center gap-2">
            {category === 'physics' ? 
              <Settings className="w-5 h-5" /> : 
              <Beaker className="w-5 h-5" />
            }
            {category === 'physics' ? 'Physics' : 'Chemistry'} Simulations
          </h2>
          <div className="flex items-center gap-2">
            <input
              type="text"
              value={simulationPrompt}
              onChange={(e) => setSimulationPrompt(e.target.value)}
              placeholder={`Describe a ${category} simulation to generate...`}
              className="bg-[#3A3A3C] text-white px-3 py-1.5 rounded-lg text-sm min-w-[300px]"
            />
            <button
              onClick={generateSimulation}
              disabled={generatingSimulation || !simulationPrompt.trim()}
              className="flex items-center gap-2 px-3 py-1.5 bg-blue-500 rounded-lg hover:bg-blue-600 transition-colors disabled:opacity-50"
            >
              {generatingSimulation ? (
                <>
                  <RefreshCw className="w-4 h-4 animate-spin" />
                  Generating...
                </>
              ) : (
                <>
                  <Wand2 className="w-4 h-4" />
                  Generate
                </>
              )}
            </button>
          </div>
          <div className="h-8 border-l border-[#3A3A3C] mx-2" />
          <select
            value={currentSim.id}
            onChange={(e) => {
              setCurrentSim(filteredSimulations.find(sim => sim.id === e.target.value) || filteredSimulations[0]);
              setCustomSimulation(null);
            }}
            className="bg-[#3A3A3C] text-white px-3 py-1.5 rounded-lg text-sm"
          >
            {filteredSimulations.map(sim => (
              <option key={sim.id} value={sim.id}>
                {sim.title}
              </option>
            ))}
          </select>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={() => window.location.reload()}
            className="p-2 rounded-lg hover:bg-[#3A3A3C] transition-colors"
            title="Refresh simulation"
          >
            <RefreshCw className="w-5 h-5" />
          </button>
          <button
            onClick={() => setIsFullscreen(!isFullscreen)}
            className="p-2 rounded-lg hover:bg-[#3A3A3C] transition-colors"
            title={isFullscreen ? 'Exit fullscreen' : 'Enter fullscreen'}
          >
            {isFullscreen ? (
              <Minimize2 className="w-5 h-5" />
            ) : (
              <Maximize2 className="w-5 h-5" />
            )}
          </button>
        </div>
      </div>

      {/* Simulation iframe */}
      <div className="flex-1 bg-[#1C1C1E] p-4">
        <div className="w-full h-full bg-white rounded-lg overflow-hidden">
          {error && (
            <div className="absolute inset-0 flex items-center justify-center bg-[#1C1C1E]/90">
              <div className="text-red-500 text-center p-4">
                <p>{error}</p>
                <button
                  onClick={() => setError(null)}
                  className="mt-4 px-4 py-2 bg-[#3A3A3C] rounded-lg hover:bg-[#4A4A4C]"
                >
                  Try Again
                </button>
              </div>
            </div>
          )}
          {customSimulation ? (
            <iframe
              srcDoc={customSimulation}
              className="w-full h-full"
              title="Generated Simulation"
              sandbox="allow-scripts"
              frameBorder="0"
            />
          ) : (
            <iframe 
              src={currentSim.url}
              className="w-full h-full"
              title={currentSim.title}
              frameBorder="0"
              allowFullScreen
              allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
              loading="lazy"
            />
          )}
        </div>
      </div>

      {/* Footer */}
      {isFullscreen && (
        <div className="p-2 bg-[#1C1C1E] rounded-b-lg text-xs text-gray-500 text-center">
          Press Esc to exit fullscreen
        </div>
      )}
    </div>
  );
}