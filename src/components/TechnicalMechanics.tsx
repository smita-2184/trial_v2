import React, { useState, useRef, useEffect } from 'react';
import { useResizable } from '../hooks/useResizable';
import { Maximize2, Minimize2, RefreshCw, Settings, ZoomIn, ZoomOut } from 'lucide-react';
import { Mafs, Coordinates, Plot, Theme } from 'mafs';
import 'mafs/core.css';
import p5 from 'p5';

interface PendulumParams {
  length: number;
  gravity: number;
  damping: number;
  initialAngle: number;
  trailLength: number;
  showTrail: boolean;
  showVectors: boolean;
  zoom: number;
}

export function TechnicalMechanics() {
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [dimensions, setDimensions] = useState({
    width: window.innerWidth - 700,
    height: window.innerHeight - 100
  });
  const [pendulumParams, setPendulumParams] = useState<PendulumParams>({
    length: 200,
    gravity: 9.81,
    damping: 0.5,
    initialAngle: Math.PI / 3,
    trailLength: 50,
    showTrail: true,
    showVectors: true,
    zoom: 1
  });
  const [angleData, setAngleData] = useState<{ x: number; y: number }[]>([]);
  const [velocityData, setVelocityData] = useState<{ x: number; y: number }[]>([]);
  const [trail, setTrail] = useState<{ x: number; y: number }[]>([]);
  const previousDimensions = useRef(dimensions);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const resizeRef = useRef<HTMLDivElement>(null);
  const animationRef = useRef<number>();
  const p5Instance = useRef<p5>();
  const pendulumRef = useRef<{
    angle: number;
    velocity: number;
    time: number;
    energy: number;
  }>({
    angle: pendulumParams.initialAngle,
    velocity: 0,
    time: 0,
    energy: 0
  });

  const { startResize } = useResizable({
    resizeRef,
    minWidth: 300,
    maxWidth: window.innerWidth - 400,
    onResize: (width) => setDimensions(prev => ({ ...prev, width })),
  });

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

  const resetPendulum = () => {
    if (pendulumRef.current) {
      pendulumRef.current.angle = pendulumParams.initialAngle;
      pendulumRef.current.velocity = 0;
      pendulumRef.current.time = 0;
      setAngleData([]);
      setVelocityData([]);
    }
  };

  const updatePendulum = (deltaTime: number) => {
    const { length, gravity, damping } = pendulumParams;
    const { angle, velocity } = pendulumRef.current;
    const mass = 1; // kg

    // Calculate acceleration using the pendulum equation of motion
    const acceleration = (-gravity / (length/100)) * Math.sin(angle) - damping * velocity;

    // Update velocity and angle using Euler integration
    pendulumRef.current.velocity += acceleration * deltaTime;
    pendulumRef.current.angle += pendulumRef.current.velocity * deltaTime;
    pendulumRef.current.time += deltaTime;

    // Calculate total energy (kinetic + potential)
    const kineticEnergy = 0.5 * mass * Math.pow(velocity * length/100, 2);
    const potentialEnergy = mass * gravity * (length/100) * (1 - Math.cos(angle));
    pendulumRef.current.energy = kineticEnergy + potentialEnergy;

    // Update trail
    if (pendulumParams.showTrail) {
      const bobX = Math.sin(angle) * length;
      const bobY = Math.cos(angle) * length;
      setTrail(prev => {
        const newTrail = [...prev, { x: bobX, y: bobY }];
        return newTrail.slice(-pendulumParams.trailLength);
      });
    }
    
    // Update graph data
    setAngleData(prev => {
      const newData = [...prev, { 
        x: pendulumRef.current.time, 
        y: pendulumRef.current.angle * (180 / Math.PI) // Convert to degrees
      }];
      // Keep last 10 seconds of data
      return newData.filter(point => point.x > pendulumRef.current.time - 10);
    });
    
    setVelocityData(prev => {
      const newData = [...prev, { 
        x: pendulumRef.current.time, 
        y: pendulumRef.current.velocity 
      }];
      // Keep last 10 seconds of data
      return newData.filter(point => point.x > pendulumRef.current.time - 10);
    });
  };

  const drawPendulum = (ctx: CanvasRenderingContext2D) => {
    const { width, height } = ctx.canvas;
    const centerX = width / 2;
    const centerY = height / 3;
    const { length, showTrail, showVectors, zoom } = pendulumParams;
    const { angle } = pendulumRef.current;

    // Clear canvas
    ctx.clearRect(0, 0, width, height);
    ctx.save();
    ctx.translate(centerX, centerY);
    ctx.scale(zoom, zoom);

    // Draw grid
    ctx.strokeStyle = '#3A3A3C';
    ctx.lineWidth = 1;
    const gridSize = 50;
    for (let x = -width/2; x < width/2; x += gridSize) {
      ctx.beginPath();
      ctx.moveTo(x, -height/2);
      ctx.lineTo(x, height/2);
      ctx.stroke();
    }
    for (let y = -height/2; y < height/2; y += gridSize) {
      ctx.beginPath();
      ctx.moveTo(-width/2, y);
      ctx.lineTo(width/2, y);
      ctx.stroke();
    }

    // Draw trail
    if (showTrail && trail.length > 1) {
      ctx.beginPath();
      ctx.moveTo(trail[0].x, trail[0].y);
      for (let i = 1; i < trail.length; i++) {
        ctx.lineTo(trail[i].x, trail[i].y);
      }
      ctx.strokeStyle = '#4A90E2';
      ctx.lineWidth = 2;
      ctx.stroke();
    }

    // Draw pivot point
    ctx.beginPath();
    ctx.arc(0, 0, 5, 0, Math.PI * 2);
    ctx.fillStyle = '#60A5FA';
    ctx.fill();
    ctx.strokeStyle = '#FFFFFF';
    ctx.lineWidth = 1;
    ctx.stroke();

    // Calculate bob position
    const bobX = length * Math.sin(angle);
    const bobY = length * Math.cos(angle);

    // Draw rod
    ctx.beginPath();
    ctx.moveTo(0, 0);
    ctx.lineTo(bobX, bobY);
    ctx.strokeStyle = '#FFFFFF';
    ctx.lineWidth = 3;
    ctx.stroke();

    // Draw velocity vector
    if (showVectors) {
      const velocity = pendulumRef.current.velocity;
      const velocityScale = 50;
      const velocityColor = '#F87171';
      ctx.beginPath();
      ctx.moveTo(bobX, bobY);
      ctx.lineTo(
        bobX + velocity * velocityScale * Math.cos(angle + Math.PI/2),
        bobY + velocity * velocityScale * Math.sin(angle + Math.PI/2)
      );
      ctx.strokeStyle = velocityColor;
      ctx.lineWidth = 2;
      ctx.stroke();

      // Draw arrowhead
      const arrowSize = 10;
      const arrowAngle = Math.atan2(
        velocity * Math.sin(angle + Math.PI/2),
        velocity * Math.cos(angle + Math.PI/2)
      );
      ctx.beginPath();
      ctx.moveTo(
        bobX + velocity * velocityScale * Math.cos(angle + Math.PI/2),
        bobY + velocity * velocityScale * Math.sin(angle + Math.PI/2)
      );
      ctx.lineTo(
        bobX + velocity * velocityScale * Math.cos(angle + Math.PI/2) - arrowSize * Math.cos(arrowAngle - Math.PI/6),
        bobY + velocity * velocityScale * Math.sin(angle + Math.PI/2) - arrowSize * Math.sin(arrowAngle - Math.PI/6)
      );
      ctx.lineTo(
        bobX + velocity * velocityScale * Math.cos(angle + Math.PI/2) - arrowSize * Math.cos(arrowAngle + Math.PI/6),
        bobY + velocity * velocityScale * Math.sin(angle + Math.PI/2) - arrowSize * Math.sin(arrowAngle + Math.PI/6)
      );
      ctx.fillStyle = velocityColor;
      ctx.fill();
    }

    // Draw bob
    ctx.beginPath();
    ctx.arc(bobX, bobY, 20, 0, Math.PI * 2);
    // Add gradient for 3D effect
    const gradient = ctx.createRadialGradient(bobX - 5, bobY - 5, 0, bobX, bobY, 20);
    gradient.addColorStop(0, '#60A5FA');
    gradient.addColorStop(1, '#2563EB');
    ctx.fillStyle = gradient;
    ctx.fill();
    ctx.strokeStyle = '#FFFFFF';
    ctx.lineWidth = 2;
    ctx.stroke();
    
    // Add highlight for 3D effect
    ctx.beginPath();
    ctx.arc(bobX - 5, bobY - 5, 5, 0, Math.PI * 2);
    const highlightGradient = ctx.createRadialGradient(bobX - 5, bobY - 5, 0, bobX - 5, bobY - 5, 5);
    highlightGradient.addColorStop(0, 'rgba(255, 255, 255, 0.8)');
    highlightGradient.addColorStop(1, 'rgba(255, 255, 255, 0)');
    ctx.fillStyle = highlightGradient;
    ctx.fill();

    // Draw angle indicator
    ctx.beginPath();
    ctx.arc(0, 0, 40, -Math.PI / 2, angle - Math.PI / 2);
    ctx.strokeStyle = '#60A5FA';
    ctx.lineWidth = 2;
    ctx.stroke();
    
    // Add angle marker
    const markerX = 40 * Math.cos(angle - Math.PI / 2);
    const markerY = 40 * Math.sin(angle - Math.PI / 2);
    ctx.beginPath();
    ctx.arc(markerX, markerY, 3, 0, Math.PI * 2);
    ctx.fillStyle = '#60A5FA';
    ctx.fill();

    ctx.restore();

    // Draw parameters
    ctx.font = '14px monospace';
    ctx.fillStyle = '#FFFFFF';
    ctx.textAlign = 'left';
    ctx.fillStyle = 'rgba(255, 255, 255, 0.8)';
    ctx.fillText(`Angle: ${(angle * 180 / Math.PI).toFixed(1)}°`, 20, height - 100);
    ctx.fillText(`Angular Velocity: ${pendulumRef.current.velocity.toFixed(2)} rad/s`, 20, height - 80);
    ctx.fillText(`Time: ${pendulumRef.current.time.toFixed(1)}s`, 20, height - 60);
    ctx.fillText(`Energy: ${pendulumRef.current.energy.toFixed(2)} J`, 20, height - 40);
  };

  const animate = () => {
    if (!canvasRef.current) return;

    const ctx = canvasRef.current.getContext('2d');
    if (!ctx) return;

    const deltaTime = 1 / 60; // 60 FPS
    updatePendulum(deltaTime);
    drawPendulum(ctx);

    animationRef.current = requestAnimationFrame(animate);
  };

  useEffect(() => {
    if (!canvasRef.current) return;

    const canvas = canvasRef.current;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    // Set canvas size
    canvas.width = dimensions.width - 32; // Account for padding
    canvas.height = dimensions.height - 200; // Account for controls

    // Start animation
    animate();

    return () => {
      if (animationRef.current) {
        cancelAnimationFrame(animationRef.current);
      }
    };
  }, [dimensions]);

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
    <div 
      ref={containerRef}
      className={`relative flex flex-col bg-[#2C2C2E] rounded-lg transition-all duration-300 overflow-y-auto ${
        isFullscreen ? 'fixed inset-4 z-50' : ''
      }`}
      style={!isFullscreen ? { height: dimensions.height, width: dimensions.width } : undefined}
    >
      {/* Header with controls */}
      <div className="flex items-center justify-between p-4 bg-[#1C1C1E] rounded-t-lg sticky top-0 z-10">
        <div className="flex items-center gap-4">
          <h2 className="text-lg font-medium">Simple Pendulum Simulation</h2>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={resetPendulum}
            className="p-2 rounded-lg hover:bg-[#3A3A3C] transition-colors"
            title="Reset simulation"
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

      {/* Simulation Parameters */}
      <div className="p-4 bg-[#1C1C1E] border-t border-[#3A3A3C] flex flex-wrap gap-4 sticky top-[72px] z-10">
        <div>
          <label className="block text-sm font-medium mb-1">Zoom</label>
          <div className="flex items-center gap-2">
            <button
              onClick={() => setPendulumParams(prev => ({ ...prev, zoom: Math.max(0.5, prev.zoom - 0.1) }))}
              className="p-2 hover:bg-[#3A3A3C] rounded-lg"
            >
              <ZoomOut className="w-4 h-4" />
            </button>
            <span className="text-sm">{(pendulumParams.zoom * 100).toFixed(0)}%</span>
            <button
              onClick={() => setPendulumParams(prev => ({ ...prev, zoom: Math.min(2, prev.zoom + 0.1) }))}
              className="p-2 hover:bg-[#3A3A3C] rounded-lg"
            >
              <ZoomIn className="w-4 h-4" />
            </button>
          </div>
        </div>

        <div>
          <label className="block text-sm font-medium mb-1">Length (cm)</label>
          <input
            type="range"
            min="100"
            max="300"
            value={pendulumParams.length}
            onChange={(e) => {
              setPendulumParams(prev => ({ ...prev, length: Number(e.target.value) }));
              resetPendulum();
            }}
            className="w-48"
          />
          <span className="ml-2 text-sm">{pendulumParams.length}</span>
        </div>

        <div>
          <label className="block text-sm font-medium mb-1">Gravity (m/s²)</label>
          <input
            type="range"
            min="1"
            max="20"
            step="0.1"
            value={pendulumParams.gravity}
            onChange={(e) => {
              setPendulumParams(prev => ({ ...prev, gravity: Number(e.target.value) }));
              resetPendulum();
            }}
            className="w-48"
          />
          <span className="ml-2 text-sm">{pendulumParams.gravity}</span>
        </div>

        <div>
          <label className="block text-sm font-medium mb-1">Damping</label>
          <input
            type="range"
            min="0"
            max="2"
            step="0.1"
            value={pendulumParams.damping}
            onChange={(e) => {
              setPendulumParams(prev => ({ ...prev, damping: Number(e.target.value) }));
              resetPendulum();
            }}
            className="w-48"
          />
          <span className="ml-2 text-sm">{pendulumParams.damping}</span>
        </div>

        <div>
          <label className="block text-sm font-medium mb-1">Initial Angle (rad)</label>
          <input
            type="range"
            min="0"
            max={Math.PI}
            step="0.1"
            value={pendulumParams.initialAngle}
            onChange={(e) => {
              setPendulumParams(prev => ({ ...prev, initialAngle: Number(e.target.value) }));
              resetPendulum();
            }}
            className="w-48"
          />
          <span className="ml-2 text-sm">{pendulumParams.initialAngle.toFixed(2)}</span>
        </div>

        <div>
          <label className="block text-sm font-medium mb-1">Trail Length</label>
          <input
            type="range"
            min="0"
            max="100"
            value={pendulumParams.trailLength}
            onChange={(e) => setPendulumParams(prev => ({ ...prev, trailLength: Number(e.target.value) }))}
            className="w-48"
          />
          <span className="ml-2 text-sm">{pendulumParams.trailLength}</span>
        </div>

        <div className="flex items-center gap-4">
          <label className="flex items-center gap-2">
            <input
              type="checkbox"
              checked={pendulumParams.showTrail}
              onChange={(e) => setPendulumParams(prev => ({ ...prev, showTrail: e.target.checked }))}
              className="rounded bg-[#3A3A3C] border-none focus:ring-blue-500"
            />
            <span className="text-sm">Show Trail</span>
          </label>

          <label className="flex items-center gap-2">
            <input
              type="checkbox"
              checked={pendulumParams.showVectors}
              onChange={(e) => setPendulumParams(prev => ({ ...prev, showVectors: e.target.checked }))}
              className="rounded bg-[#3A3A3C] border-none focus:ring-blue-500"
            />
            <span className="text-sm">Show Vectors</span>
          </label>
        </div>
      </div>

      {/* Simulation Canvas */}
      <div className="flex-1 relative bg-[#1C1C1E] p-4 flex flex-col lg:flex-row gap-4 min-h-[600px]">
        <div className="flex-1 bg-[#2C2C2E] rounded-lg p-4">
          <canvas
            ref={canvasRef}
            className="w-full h-full rounded-lg"
          />
        </div>
        
        {/* Graphs */}
        <div className="lg:w-[400px] flex flex-col gap-4 bg-[#2C2C2E] rounded-lg p-4">
          {/* Angle Graph */}
          <div className="h-[250px] bg-[#1C1C1E] rounded-lg p-4">
            <h3 className="text-sm font-medium mb-2">Angle vs Time</h3>
            <div className="h-[200px]">
              <Mafs
                viewBox={{ x: [-1, 11], y: [-180, 180] }}
                preserveAspectRatio={false}
                zoom={{ min: 0.1, max: 2 }}
                pan={{ x: true, y: true }}
                width={350}
                height={200}
              >
                <Coordinates.Cartesian />
                {angleData.length > 1 && (
                  <Plot.Parametric
                    t={[0, angleData.length - 1]}
                    xy={(t) => {
                      const point = angleData[Math.floor(t)];
                      return point ? [point.x, point.y] : [0, 0];
                    }}
                    color={Theme.blue}
                  /> 
                )}
              </Mafs>
            </div>
          </div>
          
          {/* Velocity Graph */}
          <div className="h-[250px] bg-[#1C1C1E] rounded-lg p-4 mt-4">
            <h3 className="text-sm font-medium mb-2">Angular Velocity vs Time</h3>
            <div className="h-[200px]">
              <Mafs
                viewBox={{ x: [-1, 11], y: [-5, 5] }}
                preserveAspectRatio={false}
                zoom={{ min: 0.1, max: 2 }}
                pan={{ x: true, y: true }}
                width={350}
                height={200}
              >
                <Coordinates.Cartesian />
                {velocityData.length > 1 && (
                  <Plot.Parametric
                    t={[0, velocityData.length - 1]}
                    xy={(t) => {
                      const point = velocityData[Math.floor(t)];
                      return point ? [point.x, point.y] : [0, 0];
                    }}
                    color={Theme.red}
                  />
                )}
              </Mafs>
            </div>
          </div>
        </div>
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
      <div className="p-2 bg-[#1C1C1E] rounded-b-lg text-xs text-gray-500 text-center sticky bottom-0 z-10">
        {isFullscreen ? 'Press Esc to exit fullscreen' : 'Drag handle to resize'}
      </div>
    </div>
  );
}