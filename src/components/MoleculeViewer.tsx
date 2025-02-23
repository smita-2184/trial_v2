import React, { useState, useRef } from 'react';
import { useResizable } from '../hooks/useResizable';
import { Search, RefreshCw, Info } from 'lucide-react';
import { useEffect } from 'react';

type ViewStyle = 'stick' | 'sphere' | 'cartoon' | 'line' | 'cross';

interface MoleculeInfo {
  iupacName?: string;
  molecularWeight?: string;
  formula?: string;
  description?: string;
  properties?: Record<string, string>;
}

const EXAMPLE_MOLECULES = [
  { name: 'Caffeine', formula: 'C8H10N4O2' },
  { name: 'Aspirin', formula: 'C9H8O4' },
  { name: 'Glucose', formula: 'C6H12O6' },
  { name: 'Ethanol', formula: 'C2H5OH' },
  { name: 'Water', formula: 'H2O' },
  { name: 'Methane', formula: 'CH4' },
  { name: 'Benzene', formula: 'C6H6' },
  { name: 'Penicillin', formula: 'C16H18N2O4S' }
];

export function MoleculeViewer() {
  const [molecule, setMolecule] = useState('');
  const [loading, setLoading] = useState(false);
  const [viewStyle, setViewStyle] = useState<ViewStyle>('stick');
  const [moleculeInfo, setMoleculeInfo] = useState<MoleculeInfo | null>(null);
  const [dimensions, setDimensions] = useState({ width: window.innerWidth - 700, height: 600 });
  const containerRef = useRef<HTMLDivElement>(null);
  const viewerRef = useRef<HTMLDivElement>(null);
  const viewer = useRef<any>(null);

  const VIEW_STYLES: { value: ViewStyle; label: string; description: string }[] = [
    { value: 'stick', label: 'Ball and Stick', description: 'Shows atoms as balls connected by sticks' },
    { value: 'sphere', label: 'Space Fill', description: 'Shows atoms as spheres with van der Waals radii' },
    { value: 'cartoon', label: 'Cartoon', description: 'Simplified representation showing molecular structure' },
    { value: 'line', label: 'Wire Frame', description: 'Shows bonds as lines' },
    { value: 'cross', label: 'Cross', description: 'Shows atoms as crosses' }
  ];
  useEffect(() => {
    // Load 3Dmol.js script
    const script = document.createElement('script');
    script.src = 'https://3dmol.org/build/3Dmol-min.js';
    script.async = true;
    document.body.appendChild(script);

    script.onload = () => {
      initViewer();
    };

    return () => {
      document.body.removeChild(script);
    };
  }, []);

  const initViewer = () => {
    if (!viewerRef.current || !window.$3Dmol) return;

    // Clear previous viewer if it exists
    viewerRef.current.innerHTML = '';

    // Initialize new viewer
    viewer.current = window.$3Dmol.createViewer(viewerRef.current, {
      backgroundColor: '#1C1C1E',
      id: 'molecule-viewer',
      width: dimensions.width,
      height: dimensions.height - 100
    });

    // Add a default molecule (water) for initial display
    showMolecule('H2O');
  };

  const updateStyle = (style: ViewStyle) => {
    if (!viewer.current) return;
    
    viewer.current.clear();
    showMolecule(molecule || 'H2O', style);
  };

  const fetchMoleculeInfo = async (name: string) => {
    try {
      // Fetch molecule information from PubChem
      const response = await fetch(`https://pubchem.ncbi.nlm.nih.gov/rest/pug/compound/name/${name}/property/IUPACName,MolecularWeight,MolecularFormula/JSON`);
      const data = await response.json();
      const properties = data.PropertyTable.Properties[0];

      // Fetch additional details
      const detailsResponse = await fetch(`https://pubchem.ncbi.nlm.nih.gov/rest/pug/compound/name/${name}/description/JSON`);
      const details = await detailsResponse.json();
      const description = details.InformationList?.Information[0]?.Description || '';

      setMoleculeInfo({
        iupacName: properties.IUPACName,
        molecularWeight: `${properties.MolecularWeight} g/mol`,
        formula: properties.MolecularFormula,
        description,
        properties: {
          'Molecular Weight': `${properties.MolecularWeight} g/mol`,
          'IUPAC Name': properties.IUPACName,
          'Molecular Formula': properties.MolecularFormula
        }
      });
    } catch (error) {
      console.error('Error fetching molecule info:', error);
      setMoleculeInfo(null);
    }
  };

  const showMolecule = async (name: string) => {
    if (!viewer.current) return;
    
    setLoading(true);
    try {
      // Clear previous molecule
      viewer.current.clear();

      // Fetch molecule info
      await fetchMoleculeInfo(name);

      // Fetch molecule data from PubChem
      const response = await fetch(`https://pubchem.ncbi.nlm.nih.gov/rest/pug/compound/name/${name}/SDF`);
      const data = await response.text();

      // Add molecule to viewer
      viewer.current.addModel(data, "sdf");
      
      // Apply selected style
      switch (viewStyle) {
        case 'stick':
          viewer.current.setStyle({}, { stick: {} });
          break;
        case 'sphere':
          viewer.current.setStyle({}, { sphere: {} });
          break;
        case 'cartoon':
          viewer.current.setStyle({}, { cartoon: {} });
          break;
        case 'line':
          viewer.current.setStyle({}, { line: {} });
          break;
        case 'cross':
          viewer.current.setStyle({}, { cross: {} });
          break;
      }
      
      viewer.current.zoomTo();
      viewer.current.render();
    } catch (error) {
      console.error('Error loading molecule:', error);
    } finally {
      setLoading(false);
    }
  };

  const { startResize } = useResizable({
    resizeRef: containerRef,
    minWidth: 300,
    maxWidth: window.innerWidth - 400,
    minHeight: 400,
    maxHeight: window.innerHeight - 200,
    direction: 'both',
    onResize: (width) => setDimensions(prev => ({ ...prev, width })),
    onHeightResize: (height) => setDimensions(prev => ({ ...prev, height }))
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!molecule.trim()) return;
    showMolecule(molecule.trim());
  };

  return (
    <div className="h-full flex flex-col gap-4 p-4 bg-[#1C1C1E] rounded-lg">
      {/* Input Form */}
      <form onSubmit={handleSubmit} className="space-y-4 bg-[#2C2C2E] p-4 rounded-lg">
        <div className="flex flex-col gap-4">
          <div className="flex items-center gap-2">
            <div className="relative flex-1">
              <input
                type="text"
                value={molecule}
                onChange={(e) => setMolecule(e.target.value)}
                placeholder="Enter molecule name or formula (e.g., caffeine, C8H10N4O2)"
                className="flex-1 bg-[#1C1C1E] rounded-lg pl-4 pr-4 py-3 w-full border-2 border-[#3A3A3C] focus:border-blue-500 focus:outline-none transition-colors"
              />
            </div>
            <button
              type="submit"
              disabled={loading || !molecule.trim()}
              className="px-6 py-3 bg-blue-500 rounded-lg hover:bg-blue-600 transition-colors disabled:opacity-50 disabled:hover:bg-blue-500 flex items-center gap-2 min-w-[140px] justify-center"
            >
              {loading ? (
                <>
                  <RefreshCw className="w-4 h-4 animate-spin" />
                  Loading...
                </>
              ) : (
                <>
                  <Search className="w-4 h-4" />
                  View Molecule
                </>
              )}
            </button>
          </div>

          <div className="text-sm text-gray-400">
            Click an example or enter your own molecule
          </div>
        </div>

        {/* View Style Controls */}
        <div className="mt-4">
          <label className="block text-sm font-medium mb-2">Visualization Style</label>
          <div className="grid grid-cols-2 lg:grid-cols-3 xl:grid-cols-5 gap-2">
            {VIEW_STYLES.map(({ value, label, description }) => (
              <button
                key={value}
                type="button"
                onClick={() => {
                  setViewStyle(value);
                  updateStyle(value);
                }}
                className={`text-left text-sm px-4 py-3 rounded-lg transition-colors relative group ${
                  viewStyle === value
                    ? 'bg-blue-500/20 text-blue-400 border-2 border-blue-500'
                    : 'bg-[#1C1C1E] hover:bg-[#3A3A3C] border-2 border-[#3A3A3C]'
                }`}
              >
                <span className="font-medium">{label}</span>
                <div className="absolute left-0 bottom-full mb-2 hidden group-hover:block w-48 p-2 bg-[#3A3A3C] rounded-lg text-xs z-10">
                  {description}
                </div>
              </button>
            ))}
          </div>
        </div>

        {/* Example Molecules */}
        <div className="grid grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-2">
          {EXAMPLE_MOLECULES.map(({ name, formula }) => (
            <button
              key={name}
              type="button"
              onClick={() => setMolecule(name)}
              className="text-left text-sm px-4 py-3 bg-[#1C1C1E] rounded-lg hover:bg-[#3A3A3C] transition-colors flex flex-col border border-[#3A3A3C] hover:border-blue-500"
            >
              <span className="font-medium">{name}</span>
              <span className="text-gray-400 text-xs">{formula}</span>
            </button>
          ))}
        </div>
      </form>

      {/* Molecule Viewer */}
      <div 
        ref={containerRef}
        style={{ width: dimensions.width, height: dimensions.height }}
        className="relative bg-[#1C1C1E] rounded-lg overflow-hidden flex-1 p-4"
      >
        <div
          ref={viewerRef}
          style={{ width: '100%', height: '100%' }}
          className="rounded-lg overflow-hidden"
        />

        {/* Resize handle */}
        
        {/* Molecule Information Panel */}
        {moleculeInfo && (
          <div className="absolute top-4 right-4 w-64 bg-[#2C2C2E] rounded-lg p-4 shadow-lg border border-[#3A3A3C]">
            <h3 className="text-lg font-medium mb-3 flex items-center gap-2">
              <Info className="w-4 h-4" />
              Molecule Info
            </h3>
            
            <div className="space-y-3">
              {Object.entries(moleculeInfo.properties || {}).map(([key, value]) => (
                <div key={key}>
                  <div className="text-xs text-gray-400">{key}</div>
                  <div className="text-sm">{value}</div>
                </div>
              ))}
              
              {moleculeInfo.description && (
                <div>
                  <div className="text-xs text-gray-400 mb-1">Description</div>
                  <div className="text-sm text-gray-300">
                    {moleculeInfo.description}
                  </div>
                </div>
              )}
            </div>
          </div>
        )}

        <div
          className="absolute bottom-0 right-0 w-4 h-4 cursor-se-resize"
          onMouseDown={startResize}
        >
          <div className="absolute bottom-0 right-0 w-0 h-0 border-8 border-transparent border-r-[#3A3A3C] border-b-[#3A3A3C] hover:border-r-blue-500/20 hover:border-b-blue-500/20" />
        </div>
      </div>
    </div>
  );
}