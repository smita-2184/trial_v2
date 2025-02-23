import { useState, useEffect } from 'react';
import { Maximize2, Minimize2, RefreshCw } from 'lucide-react';

const SIMULATIONS = [
  {
    id: 'caffeine',
    title: 'Caffeine',
    smiles: 'CN1C=NC2=C1C(=O)N(C(=O)N2C)C',
    description: 'Caffeine molecule (C8H10N4O2)'
  },
  {
    id: 'aspirin',
    title: 'Aspirin',
    smiles: 'CC(=O)OC1=CC=CC=C1C(=O)O',
    description: 'Aspirin molecule (C9H8O4)'
  },
  {
    id: 'ethanol',
    title: 'Ethanol',
    smiles: 'CCO',
    description: 'Ethanol molecule (C2H5OH)'
  },
  {
    id: 'benzene',
    title: 'Benzene',
    smiles: 'C1=CC=CC=C1',
    description: 'Benzene molecule (C6H6)'
  },
  {
    id: 'water',
    title: 'Water',
    smiles: 'O',
    description: 'Water molecule (H2O)'
  }
];

export function ChemistrySimulations() {
  const [currentSim, setCurrentSim] = useState(SIMULATIONS[0]);
  const [isFullscreen, setIsFullscreen] = useState(false);

  useEffect(() => {
    // Load the 3Dmol.js script
    const script = document.createElement('script');
    script.src = 'https://3dmol.org/build/3Dmol-min.js';
    script.async = true;
    document.body.appendChild(script);

    return () => {
      document.body.removeChild(script);
    };
  }, []);

  return (
    <div className={`h-full flex flex-col bg-[#2C2C2E] rounded-lg ${
      isFullscreen ? 'fixed inset-4 z-50' : ''
    }`}>
      {/* Header */}
      <div className="flex items-center justify-between p-4 bg-[#1C1C1E] rounded-t-lg">
        <div className="flex items-center gap-4">
          <h2 className="text-lg font-medium">Chemistry Simulations</h2>
          <select
            value={currentSim.id}
            onChange={(e) => setCurrentSim(SIMULATIONS.find(sim => sim.id === e.target.value) || SIMULATIONS[0])}
            className="bg-[#3A3A3C] text-white px-3 py-1.5 rounded-lg text-sm"
          >
            {SIMULATIONS.map(sim => (
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

      {/* Simulation content */}
      <div className="flex-1 bg-[#1C1C1E] p-4">
        <div className="w-full h-full bg-[#2C2C2E] rounded-lg overflow-hidden flex flex-col">
          {/* Description */}
          <div className="p-4 border-b border-[#3A3A3C]">
            <h3 className="text-lg font-medium mb-2">{currentSim.title}</h3>
            <p className="text-gray-400">{currentSim.description}</p>
          </div>

          {/* 3D Viewer */}
          <div className="flex-1 p-4">
            <iframe
              src={`https://embed.molview.org/v1/?mode=balls&smiles=${currentSim.smiles}`}
              className="w-full h-full rounded-lg"
              title={`${currentSim.title} 3D View`}
              frameBorder="0"
              allowFullScreen
            />
          </div>
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