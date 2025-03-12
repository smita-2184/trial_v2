import React, { useState, useRef } from 'react';
import { Maximize2, Minimize2, RefreshCw } from 'lucide-react';
import { useResizable } from '../hooks/useResizable';

const SIMULATION_URLS = [
  { 
    id: 'pendulum', 
    label: 'Simple Pendulum', 
    url: 'https://phet.colorado.edu/sims/html/pendulum-lab/latest/pendulum-lab_en.html' 
  },
  { 
    id: 'waves', 
    label: 'Wave Interference', 
    url: 'https://phet.colorado.edu/sims/html/wave-interference/latest/wave-interference_en.html' 
  },
  { 
    id: 'forces', 
    label: 'Forces and Motion', 
    url: 'https://phet.colorado.edu/sims/html/forces-and-motion-basics/latest/forces-and-motion-basics_en.html' 
  },
  { 
    id: 'energy', 
    label: 'Energy Forms and Changes', 
    url: 'https://phet.colorado.edu/sims/html/energy-forms-and-changes/latest/energy-forms-and-changes_en.html' 
  },
  { 
    id: 'gravity', 
    label: 'Gravity and Orbits', 
    url: 'https://phet.colorado.edu/sims/html/gravity-and-orbits/latest/gravity-and-orbits_en.html' 
  }
];

export function PhysicsSimulation() {
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [currentUrl, setCurrentUrl] = useState(SIMULATION_URLS[0].url);
  const [dimensions, setDimensions] = useState({
    width: window.innerWidth - 700, // Default width
    height: window.innerHeight - 200 // Default height
  });
  const previousDimensions = useRef(dimensions);
  const iframeRef = useRef<HTMLIFrameElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const resizeRef = useRef<HTMLDivElement>(null);

  const { startResize } = useResizable({
    resizeRef,
    minWidth: 300,
    maxWidth: window.innerWidth - 400,
    onResize: (width) => setDimensions(prev => ({ ...prev, width })),
  });

  const toggleFullscreen = () => {
    if (!isFullscreen) {
      // Save current dimensions before going fullscreen
      previousDimensions.current = dimensions;
      setDimensions({
        width: window.innerWidth - 32, // Account for padding
        height: window.innerHeight - 32
      });
    } else {
      // Restore previous dimensions
      setDimensions(previousDimensions.current);
    }
    setIsFullscreen(!isFullscreen);
  };

  const refreshSimulation = () => {
    if (iframeRef.current) {
      iframeRef.current.src = currentUrl;
    }
  };

  // Handle escape key to exit fullscreen
  React.useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && isFullscreen) {
        toggleFullscreen();
      }
    };

    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [isFullscreen]);

  return (
    <div 
      ref={containerRef}
      className={`relative flex flex-col bg-[#2C2C2E] rounded-lg transition-all duration-300 ${
        isFullscreen ? 'fixed inset-4 z-50' : ''
      }`}
      style={!isFullscreen ? { height: dimensions.height, width: dimensions.width } : undefined}
    >
      {/* Header with controls */}
      <div className="flex items-center justify-between p-4 bg-[#1C1C1E] rounded-t-lg">
        <div className="flex items-center gap-4">
          <h2 className="text-lg font-medium">Physics Lab</h2>
          <select
            value={currentUrl}
            onChange={(e) => setCurrentUrl(e.target.value)}
            className="bg-[#3A3A3C] text-white px-3 py-1.5 rounded-lg text-sm"
          >
            {SIMULATION_URLS.map(sim => (
              <option key={sim.id} value={sim.url}>
                {sim.label}
              </option>
            ))}
          </select>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={refreshSimulation}
            className="p-2 rounded-lg hover:bg-[#3A3A3C] transition-colors"
            title="Refresh simulation"
          >
            <RefreshCw className="w-5 h-5" />
          </button>
          <button
            onClick={toggleFullscreen}
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
      <div className="flex-1 relative bg-white">
        <iframe
          ref={iframeRef}
          src={currentUrl}
          className="w-full h-full border-0"
          title="Physics Simulation"
          sandbox="allow-scripts allow-same-origin allow-popups allow-forms allow-same-origin"
          allow="fullscreen"
        />
      </div>

      {/* Resize handle */}
      {!isFullscreen && (
        <div
          ref={resizeRef}
          className="absolute top-1/2 right-0 h-20 w-1 -translate-y-1/2 cursor-col-resize group"
          onMouseDown={startResize}
        >
          <div className="absolute right-0 top-0 h-full w-1 bg-transparent group-hover:bg-blue-500/20 rounded-full" />
        </div>
      )}

      {/* Footer with instructions */}
      <div className="p-2 bg-[#1C1C1E] rounded-b-lg text-xs text-gray-500 text-center">
        {isFullscreen ? 'Press Esc to exit fullscreen' : 'Drag handle to resize'}
      </div>
    </div>
  );
}