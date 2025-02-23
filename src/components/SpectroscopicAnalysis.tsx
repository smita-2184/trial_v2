import React, { useState, useRef, useEffect } from 'react';
import { useOpenAIStore } from '../store/openai';
import { Upload, SendHorizontal, RefreshCw, Download, FileText, X, ChevronRight, Image, FileOutput, Activity } from 'lucide-react';
import { useDropzone } from 'react-dropzone';
import { Chat } from './Chat';
import Plot from 'react-plotly.js';

interface SpectroscopicData {
  type: 'NMR' | 'IR' | 'UV-Vis' | 'Mass';
  data: number[][];
  metadata?: {
    instrument?: string;
    solvent?: string;
    frequency?: number;
    temperature?: number;
  };
}

export function SpectroscopicAnalysis() {
  const [file, setFile] = useState<File | null>(null);
  const [processedData, setProcessedData] = useState<SpectroscopicData | null>(null);
  const [showChat, setShowChat] = useState(true);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [peaks, setPeaks] = useState<{ x: number; y: number; text: string }[]>([]);
  const [analysis, setAnalysis] = useState<string>('');
  const [dataTable, setDataTable] = useState<{ x: number; y: number; peak?: boolean }[]>([]);
  const [peakData, setPeakData] = useState<{ position: number; intensity: number; assignment?: string }[]>([]);
  const [expandedSections, setExpandedSections] = useState<string[]>([]);
  const service = useOpenAIStore((state) => state.service);
  const [validationError, setValidationError] = useState<string | null>(null);

  const toggleSection = (sectionId: string) => {
    setExpandedSections(prev => 
      prev.includes(sectionId) 
        ? prev.filter(id => id !== sectionId)
        : [...prev, sectionId]
    );
  };

  // Handle pasted images
  useEffect(() => {
    const handlePaste = (e: ClipboardEvent) => {
      e.preventDefault();
      
      const items = e.clipboardData?.items;
      if (!items) return;

      for (const item of items) {
        if (item.type.startsWith('image/')) {
          const file = item.getAsFile();
          if (file) {
            onDrop([file]);
          }
        }
      }
    };

    document.addEventListener('paste', handlePaste);
    return () => document.removeEventListener('paste', handlePaste);
  }, []);

  const onDrop = async (acceptedFiles: File[]) => {
    const file = acceptedFiles[0];
    if (!file) return;

    // Reset states
    setValidationError(null);
    setError(null);
    setPeaks([]);
    setAnalysis('');
    setDataTable([]);
    setPeakData([]);
    
    setFile(file);
    setLoading(true);

    try {
      // Validate file size
      if (file.size > 10 * 1024 * 1024) { // 10MB limit
        throw new Error('File size too large. Please upload a file smaller than 10MB.');
      }

      let data: number[][] = [];

      // Handle image files
      if (file.type.startsWith('image/')) {
        data = await processImageData(file);
      } else {
        const text = await readFileAsText(file);
        
        if (file.name.endsWith('.jdx') || file.name.endsWith('.dx')) {
          data = parseJCAMPDX(text);
        } else if (file.name.endsWith('.csv')) {
          data = parseCSV(text);
        } else {
          throw new Error('Unsupported file format. Please upload a JCAMP-DX (.jdx, .dx), CSV, or image file.');
        }
      }

      setProcessedData({
        type: determineSpectrumType(file.name),
        data
      });
      
      // Validate data points
      if (data.length < 10) {
        setValidationError('Not enough data points for analysis. Please check your file.');
        return;
      }

      // Process data for table
      const tableData = data.map(([x, y]) => ({ x, y }));
      setDataTable(tableData);

      const foundPeaks = findPeaks(data);
      setPeakData(foundPeaks);

      await analyzeSpectrum(data);
    } catch (err) {
      console.error('Error processing file:', err);
      setError(err instanceof Error ? err.message : 'Failed to process file');
    } finally {
      setLoading(false);
    }
  };

  const readFileAsText = async (file: File): Promise<string> => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = (e) => {
        resolve(e.target?.result as string);
      };
      reader.onerror = reject;
      reader.readAsText(file);
    });
  };

  // Process image data into spectral data points
  const processImageData = (file: File): Promise<number[][]> => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = (e) => {
        const img = document.createElement('img');
        img.onload = () => {
          try {
            // Create canvas to process image
            const canvas = document.createElement('canvas');
            const ctx = canvas.getContext('2d');
            if (!ctx || !canvas) {
              throw new Error('Could not create canvas context');
            }

            // Set canvas dimensions
            canvas.width = img.width;
            canvas.height = img.height;

            // Draw image on canvas
            ctx.drawImage(img, 0, 0);

            // Get image data
            const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
            
            if (imageData.data.length === 0) {
              throw new Error('No data found in image. Please check the image file.');
            }
            
            const data: number[][] = [];

            // Process image data into spectral format
            for (let x = 0; x < canvas.width; x++) {
              let totalIntensity = 0;
              for (let y = 0; y < canvas.height; y++) {
                const index = (y * canvas.width + x) * 4;
                const intensity = (imageData.data[index] + imageData.data[index + 1] + imageData.data[index + 2]) / 3;
                totalIntensity += intensity;
              }
              data.push([x, totalIntensity / canvas.height]);
            }
            
            if (data.length === 0) {
              throw new Error('Failed to extract data from image. Please try a different image.');
            }
            
            resolve(data);
          } catch (err) {
            reject(err);
          }
        };

        img.onerror = () => {
          URL.revokeObjectURL(img.src);
          reject(new Error('Failed to load image. Please check if the file is a valid image.'));
        };

        // Create object URL from file
        img.src = e.target?.result as string;
      };

      reader.onerror = reject;
      reader.readAsDataURL(file);
    });
  };

  const { getRootProps, getInputProps } = useDropzone({
    onDrop,
    accept: {
      'image/*': ['.png', '.jpg', '.jpeg', '.gif'],
      'application/x-jcamp-dx': ['.jdx', '.dx'],
      'text/csv': ['.csv'],
      'application/vnd.ms-excel': ['.csv']
    },
    maxFiles: 1
  });

  const parseJCAMPDX = (text: string): number[][] => {
    const lines = text.split('\n');
    const data: number[][] = [];
    let dataStarted = false;
    
    if (lines.length === 0) {
      throw new Error('Empty JCAMP-DX file. Please check the file content.');
    }
    
    for (const line of lines) {
      if (line.startsWith('##XYDATA=')) {
        dataStarted = true;
        continue;
      }
      
      if (dataStarted && !line.startsWith('##')) {
        const values = line.trim().split(/\s+/).map(Number);
        if (values.length === 2 && !values.some(isNaN)) {
          data.push(values);
        }
      }
    }

    if (data.length === 0) {
      throw new Error('No valid data found in JCAMP-DX file. Please check the file format.');
    }

    return data;
  };

  const parseCSV = (text: string): number[][] => {
    return text
      .split('\n')
      .map(line => {
        const values = line.split(',').map(Number);
        if (values.length !== 2) {
          throw new Error('Invalid CSV format. Each line must contain exactly two numbers (x,y).');
        }
        return values;
      })
      .filter(row => row.length === 2 && !row.some(isNaN));
  };

  const determineSpectrumType = (filename: string): SpectroscopicData['type'] => {
    filename = filename.toLowerCase();
    if (filename.includes('nmr')) return 'NMR';
    if (filename.includes('ir') || filename.includes('infrared')) return 'IR';
    if (filename.includes('uv') || filename.includes('vis')) return 'UV-Vis';
    if (filename.includes('ms') || filename.includes('mass')) return 'Mass';
    return 'NMR'; // Default to NMR
  };

  const analyzeSpectrum = async (data: number[][]) => {
    if (!service || !data || data.length === 0) return;
    
    // Limit data points for analysis to prevent stack overflow
    const sampledData = sampleData(data, 1000);
    
    try {
      const prompt = `Analyze this spectroscopic data and identify key features. Format response as JSON:
      {
        "metadata": {
          "spectrumType": "string",
          "instrumentType": "string",
          "resolution": "string",
          "scanRange": "string"
        },
        "peaks": [
          {
            "position": number,
            "intensity": number,
            "assignment": "Chemical group or feature description",
            "confidence": number,
            "details": {
              "type": "string",
              "characteristics": ["string"],
              "possibleGroups": ["string"]
            }
          }
        ],
        "analysis": {
          "summary": "Overall interpretation",
          "keyFeatures": ["List of important spectral features"],
          "structuralFeatures": ["Identified structural elements"],
          "possibleStructures": ["Suggested molecular structures"],
          "correlations": [
            {
              "peaks": [number, number],
              "relationship": "string",
              "significance": "string"
            }
          ],
          "reliability": {
            "score": number,
            "factors": ["string"]
          },
          "recommendations": ["Suggestions for further analysis"]
        }
      }

      Raw spectral data points (sampled):
      ${JSON.stringify(sampledData.slice(0, 100))}
      
      Total data points: ${sampledData.length}
      `;

      const response = await service.generateResponse(prompt);
      const result = JSON.parse(response);

      // Update peaks with assignments
      setPeaks(result.peaks.map((peak: any) => ({
        x: peak.position,
        y: peak.intensity,
        text: peak.assignment
      })));

      // Set analysis text
      setAnalysis(JSON.stringify(result.analysis, null, 2));

    } catch (error) {
      console.error('Failed to analyze spectrum:', error);
      setError('Failed to analyze spectrum. Please try again.');
    }
  };

  // Helper function to sample data points evenly
  const sampleData = (data: number[][], targetPoints: number): number[][] => {
    if (data.length <= targetPoints) return data;
    
    const step = Math.max(1, Math.floor(data.length / targetPoints));
    const sampled: number[][] = [];
    
    for (let i = 0; i < data.length; i += step) {
      sampled.push(data[i]);
    }
    
    return sampled;
  };

  // Find peaks in spectral data
  const findPeaks = (data: number[][]) => {
    const peaks: { position: number; intensity: number }[] = [];
    const windowSize = 5;
    
    // Limit data points for peak finding to prevent stack overflow
    const sampledData = sampleData(data, 1000);
    
    if (sampledData.length < windowSize * 2 + 1) {
      setValidationError('Not enough data points to find peaks. Please provide more data.');
      return peaks;
    }
    
    for (let i = windowSize; i < sampledData.length - windowSize; i++) {
      const current = sampledData[i][1];
      let isPeak = true;
      
      // Check if current point is higher than surrounding points
      for (let j = i - windowSize; j <= i + windowSize; j++) {
        if (j !== i && sampledData[j][1] >= current) {
          isPeak = false;
          break;
        }
      }
      
      if (isPeak) {
        peaks.push({
          position: sampledData[i][0],
          intensity: current
        });
      }
    }
    
    // Sort peaks by intensity
    peaks.sort((a, b) => b.intensity - a.intensity);
    
    // Limit number of peaks to prevent performance issues
    return peaks.slice(0, 20);
  };

  return (
    <div className="h-[calc(100vh-200px)] flex flex-col bg-[#2C2C2E] rounded-lg">
      {/* Header */}
      <div className="flex items-center justify-between p-4 bg-[#1C1C1E] rounded-t-lg">
        <div className="flex items-center gap-4">
          <h2 className="text-lg font-medium">Spectroscopic Analysis</h2>
          <button
            onClick={() => setShowChat(!showChat)}
            className={`flex items-center gap-2 px-3 py-1.5 rounded-lg transition-colors ${
              showChat ? 'bg-blue-500 hover:bg-blue-600' : 'bg-[#3A3A3C] hover:bg-[#4A4A4C]'
            }`}
          >
            {showChat ? 'Hide Assistant' : 'Show Assistant'}
          </button>
        </div>
      </div>

      {/* Main Content */}
      <div className="flex-1 flex gap-4 p-4 overflow-y-auto">
        {/* Left Panel - Upload and Spectrum View */}
        <div className={`${showChat ? 'w-1/3' : 'w-1/2'} flex flex-col gap-4 min-w-[400px] transition-all duration-300`}>
          {/* Upload Area */}
          <div 
            {...getRootProps()} 
            className="border-2 border-dashed border-[#3A3A3C] rounded-lg p-4 text-center cursor-pointer hover:border-blue-500 transition-colors"
          >
            <input {...getInputProps()} />
            {file ? (
              <div className="flex items-center justify-center gap-2 text-blue-400">
                <FileText className="w-6 h-6" />
                <div>
                  <p className="font-medium">{file.name}</p>
                  <p className="text-sm text-gray-400">
                    {(file.size / 1024).toFixed(1)} KB
                  </p>
                </div>
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    setFile(null);
                    setProcessedData(null);
                  }}
                  className="p-1 hover:bg-[#3A3A3C] rounded-full ml-2"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>
            ) : (
              <div>
                <Upload className="w-6 h-6 text-gray-400 mx-auto mb-2" />
                <p className="text-gray-400">Upload spectroscopic data</p>
                <p className="text-sm text-gray-500 mt-1">
                  Supports JCAMP-DX (.jdx, .dx), CSV, and images
                </p>
              </div>
            )}
          </div>

          {/* Spectrum Plot */}
          <div className="flex-1 bg-[#1C1C1E] rounded-lg p-4 overflow-hidden">
            {loading ? (
              <div className="flex items-center justify-center h-full">
                <div className="flex items-center gap-2 text-gray-400">
                  <RefreshCw className="w-5 h-5 animate-spin" />
                  Processing data...
                </div>
              </div>
            ) : error ? (
              <div className="flex items-center justify-center h-full">
                <div className="text-red-500">{error}</div>
              </div>
            ) : processedData ? (
              <Plot
                data={[
                  {
                    x: processedData.data.map(point => point[0]),
                    y: processedData.data.map(point => point[1]),
                    type: 'scatter',
                    mode: 'lines',
                    line: { color: '#60A5FA' },
                    name: 'Spectrum'
                  },
                  {
                    x: peaks.map(peak => peak.x),
                    y: peaks.map(peak => peak.y),
                    type: 'scatter',
                    mode: 'markers+text',
                    marker: { color: '#F87171', size: 8 },
                    text: peaks.map(peak => peak.text),
                    textposition: 'top center',
                    name: 'Peaks'
                  }
                ]}
                layout={{
                  plot_bgcolor: '#1C1C1E',
                  paper_bgcolor: '#1C1C1E',
                  font: { color: '#FFFFFF' },
                  xaxis: {
                    gridcolor: '#3A3A3C',
                    zerolinecolor: '#3A3A3C',
                    title: 'Position'
                  },
                  yaxis: {
                    gridcolor: '#3A3A3C',
                    zerolinecolor: '#3A3A3C',
                    title: 'Intensity'
                  },
                  margin: { t: 40, r: 20, b: 40, l: 40 },
                  showlegend: true,
                  legend: {
                    x: 0,
                    y: 1,
                    bgcolor: '#2C2C2E',
                    bordercolor: '#3A3A3C'
                  }
                }}
                useResizeHandler
                style={{ width: '100%', height: '100%' }}
              />
            ) : (
              <div className="flex items-center justify-center h-full">
                <div className="text-gray-400">
                  Upload a file to view spectrum
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Right Panel - Analysis */}
        <div className={`${showChat ? 'w-1/3' : 'w-1/2'} min-w-[400px] transition-all duration-300`}>
          <div className="bg-[#1C1C1E] rounded-lg p-4">
            <h3 className="text-lg font-medium mb-4">Spectral Analysis</h3>
            
            {loading ? (
              <div className="flex items-center justify-center h-32">
                <div className="flex items-center gap-2 text-gray-400">
                  <RefreshCw className="w-5 h-5 animate-spin" />
                  Analyzing spectrum...
                </div>
              </div>
            ) : processedData ? (
              <div className="space-y-6">
                {/* Analysis Content */}
                {analysis && (
                <div className="space-y-4">
                  {/* Metadata Section */}
                  <div className="bg-[#2C2C2E] rounded-lg overflow-hidden">
                    <button
                      onClick={() => toggleSection('metadata')}
                      className="w-full p-4 flex items-center justify-between hover:bg-[#3A3A3C] transition-colors"
                    >
                      <h4 className="text-sm font-medium text-gray-400">Metadata</h4>
                      <ChevronRight 
                        className={`w-4 h-4 transition-transform ${
                          expandedSections.includes('metadata') ? 'rotate-90' : ''
                        }`}
                      />
                    </button>
                    <div className={`grid grid-cols-2 gap-4 p-4 bg-[#1C1C1E] transition-all ${
                      expandedSections.includes('metadata') ? 'block' : 'hidden'
                    }`}>
                    {Object.entries(JSON.parse(analysis || '{}').metadata || {}).map(([key, value]) => (
                      <div key={key}>
                        <div className="text-xs text-gray-500">{key}</div>
                        <div className="text-sm">{String(value)}</div>
                      </div>
                    ))}
                    </div>
                  </div>

                  {/* Peak Analysis Section */}
                  <div className="bg-[#2C2C2E] rounded-lg overflow-hidden">
                    <button
                      onClick={() => toggleSection('peaks')}
                      className="w-full p-4 flex items-center justify-between hover:bg-[#3A3A3C] transition-colors"
                    >
                      <h4 className="text-sm font-medium text-gray-400">Peak Analysis</h4>
                      <ChevronRight 
                        className={`w-4 h-4 transition-transform ${
                          expandedSections.includes('peaks') ? 'rotate-90' : ''
                        }`}
                      />
                    </button>
                    <div className={`space-y-2 p-4 bg-[#1C1C1E] transition-all ${
                      expandedSections.includes('peaks') ? 'block' : 'hidden'
                    }`}>
                    {JSON.parse(analysis || '{}').peaks?.map((peak: any, index: number) => (
                      <div key={index} className="bg-[#1C1C1E] rounded p-2">
                        <div className="flex items-center justify-between">
                          <div className="text-sm font-medium">{peak.assignment}</div>
                          <div className="text-xs text-gray-400">
                            Confidence: {(peak.confidence * 100).toFixed(1)}%
                          </div>
                        </div>
                        <div className="mt-1 text-xs text-gray-400">
                          Position: {peak.position.toFixed(2)}, Intensity: {peak.intensity.toFixed(2)}
                        </div>
                        {peak.details && (
                          <div className="mt-2 text-xs">
                            <div>Type: {peak.details.type}</div>
                            <div>Characteristics: {peak.details.characteristics.join(', ')}</div>
                            <div>Possible Groups: {peak.details.possibleGroups.join(', ')}</div>
                          </div>
                        )}
                      </div>
                    ))}
                    </div>
                  </div>

                  {/* Structural Analysis Section */}
                  <div className="bg-[#2C2C2E] rounded-lg overflow-hidden">
                    <button
                      onClick={() => toggleSection('structural')}
                      className="w-full p-4 flex items-center justify-between hover:bg-[#3A3A3C] transition-colors"
                    >
                      <h4 className="text-sm font-medium text-gray-400">Structural Analysis</h4>
                      <ChevronRight 
                        className={`w-4 h-4 transition-transform ${
                          expandedSections.includes('structural') ? 'rotate-90' : ''
                        }`}
                      />
                    </button>
                    <div className={`space-y-4 p-4 bg-[#1C1C1E] transition-all ${
                      expandedSections.includes('structural') ? 'block' : 'hidden'
                    }`}>
                    <div>
                      <div className="text-xs text-gray-500 mb-1">Key Features</div>
                      <ul className="list-disc list-inside text-sm">
                        {JSON.parse(analysis || '{}').analysis?.keyFeatures?.map((feature: string, index: number) => (
                          <li key={index}>{feature}</li>
                        ))}
                      </ul>
                    </div>
                    <div>
                      <div className="text-xs text-gray-500 mb-1">Structural Features</div>
                      <ul className="list-disc list-inside text-sm">
                        {JSON.parse(analysis || '{}').analysis?.structuralFeatures?.map((feature: string, index: number) => (
                          <li key={index}>{feature}</li>
                        ))}
                      </ul>
                    </div>
                    </div>
                  </div>

                  {/* Reliability Assessment Section */}
                  <div className="bg-[#2C2C2E] rounded-lg overflow-hidden">
                    <button
                      onClick={() => toggleSection('reliability')}
                      className="w-full p-4 flex items-center justify-between hover:bg-[#3A3A3C] transition-colors"
                    >
                      <h4 className="text-sm font-medium text-gray-400">Reliability Assessment</h4>
                      <ChevronRight 
                        className={`w-4 h-4 transition-transform ${
                          expandedSections.includes('reliability') ? 'rotate-90' : ''
                        }`}
                      />
                    </button>
                    <div className={`space-y-2 p-4 bg-[#1C1C1E] transition-all ${
                      expandedSections.includes('reliability') ? 'block' : 'hidden'
                    }`}>
                    <div className="flex items-center gap-2">
                      <div className="text-sm">Score:</div>
                      <div className="flex-1 bg-[#1C1C1E] h-2 rounded-full overflow-hidden">
                        <div 
                          className="h-full bg-blue-500 transition-all duration-300"
                          style={{ width: `${JSON.parse(analysis || '{}').analysis?.reliability?.score * 100 || 0}%` }}
                        />
                      </div>
                      <div className="text-sm">
                        {(JSON.parse(analysis || '{}').analysis?.reliability?.score * 100 || 0).toFixed(1)}%
                      </div>
                    </div>
                    <div>
                      <div className="text-xs text-gray-500 mb-1">Factors</div>
                      <ul className="list-disc list-inside text-sm">
                        {JSON.parse(analysis || '{}').analysis?.reliability?.factors?.map((factor: string, index: number) => (
                          <li key={index}>{factor}</li>
                        ))}
                      </ul>
                    </div>
                  </div>
                  </div>
                </div>
                )}
              </div>
            ) : (
              <div className="text-gray-400 text-center">
                Upload a spectrum to see analysis
              </div>
            )}
          </div>
        </div>

        {/* Chat Assistant Panel */}
        {showChat && (
          <div className="w-1/3 min-w-[400px] border-l border-[#3A3A3C]">
            <div className="flex flex-col h-full">
              <Chat 
                pdfText={processedData ? JSON.stringify({
                  type: processedData.type,
                  analysis: analysis ? JSON.parse(analysis) : {},
                  peaks: peaks,
                  dataPoints: processedData.data.length
                }, null, 2) : undefined}
              />
              {/* Generated Report */}
              <div className="mt-4 p-4 bg-[#2C2C2E] rounded-lg">
                <h4 className="text-sm font-medium mb-2">Generated Report</h4>
                <div className="prose prose-invert max-w-none">
                  <div className="bg-[#1C1C1E] p-4 rounded-lg overflow-x-auto">
                    <pre className="whitespace-pre-wrap">
                      {analysis ? JSON.stringify(JSON.parse(analysis), null, 2) : 'No analysis available'}
                    </pre>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}