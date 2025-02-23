import React, { useState, useRef } from 'react';
import { useOpenAIStore } from '../store/openai';
import { Upload, SendHorizontal, RefreshCw, Download, X, FileText, Layout, Presentation } from 'lucide-react';
import { useDropzone } from 'react-dropzone';
import { BlockMath } from 'react-katex';
import ReactMarkdown from 'react-markdown';
import remarkMath from 'remark-math';
import rehypeKatex from 'rehype-katex'; 
import { PresentationChat } from './PresentationChat';

interface Slide {
  title: string;
  content: string[];
  notes?: string;
  imagePrompt?: string;
  equations?: string[];
  diagrams?: string[];
  references?: string[];
}

interface Presentation {
  title: string;
  slides: Slide[];
  theme: string;
  style: string;
  outline: string[];
  summary: string;
  keywords: string[];
}

export function PresentationMaker() {
  const [content, setContent] = useState('');
  const [presentations, setPresentations] = useState<Presentation[]>([]);
  const [loading, setLoading] = useState(false);
  const [uploadedFile, setUploadedFile] = useState<File | null>(null);
  const [showChat, setShowChat] = useState(false);
  const [currentSlide, setCurrentSlide] = useState<number | null>(null);
  const service = useOpenAIStore((state) => state.service);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const onDrop = async (acceptedFiles: File[]) => {
    const file = acceptedFiles[0];
    if (file) {
      setUploadedFile(file);
      // Read file content
      const text = await file.text();
      setContent(text);
    }
  };

  const { getRootProps, getInputProps } = useDropzone({
    onDrop,
    accept: {
      'text/plain': ['.txt'],
      'text/markdown': ['.md'],
      'application/pdf': ['.pdf']
    },
    maxFiles: 1
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!content.trim() || !service || loading) return;

    setLoading(true);
    try {
      const prompt = `Create a professional presentation based on this content. Format as JSON:
      Use DeepSeek's advanced capabilities to create a comprehensive presentation.

Content: ${content}

{
  "title": "Presentation title",
  "slides": [
    {
      "title": "Slide title",
      "content": ["Bullet point 1", "Bullet point 2"],
      "notes": "Speaker notes",
      "imagePrompt": "Description for AI image generation (optional)",
      "equations": ["LaTeX equation 1", "LaTeX equation 2"],
      "diagrams": ["Diagram description 1", "Diagram description 2"],
      "references": ["Reference 1", "Reference 2"]
    }
  ],
  "theme": "modern|classic|minimal",
  "style": "professional|academic|creative",
  "outline": ["Section 1", "Section 2"],
  "summary": "Executive summary of the presentation",
  "keywords": ["Keyword 1", "Keyword 2"]
}

Guidelines:
1. Create a comprehensive outline
2. Generate 10-15 detailed slides
3. Include mathematical equations in LaTeX where relevant
4. Add detailed speaker notes with timing suggestions
5. Suggest relevant diagrams and visualizations
6. Include citations and references
7. Add key takeaways for each section
8. Maintain academic rigor and clarity
9. Follow presentation best practices
10. Use consistent formatting throughout`;

      const response = await service.generateResponse(prompt);
      const presentation = JSON.parse(response);

      setPresentations(prev => [presentation, ...prev]);
      setContent('');
      setUploadedFile(null);

      // Generate PowerPoint file
      const pptx = generatePowerPoint(presentation);
      downloadPresentation(pptx, presentation.title);
      
      messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    } catch (error) {
      console.error('Failed to generate presentation:', error);
    } finally {
      setLoading(false);
    }
  };

  const generatePowerPoint = (presentation: Presentation) => {
    // This would use a library like pptxgenjs to create the PowerPoint file
    // For now, we'll return a simple text representation
    return presentation.slides.map(slide => `
# ${slide.title}
${slide.content.join('\n')}
${slide.notes ? `\nNotes: ${slide.notes}` : ''}
    `).join('\n\n');
  };

  const downloadPresentation = (content: string, title: string) => {
    const blob = new Blob([content], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${title.toLowerCase().replace(/\s+/g, '-')}.txt`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  return (
    <div className="h-full flex flex-col gap-4 p-4 bg-[#1C1C1E] rounded-lg">
      {/* Header */}
      <div className="bg-[#2C2C2E] p-4 rounded-lg">
        <h2 className="text-lg font-medium flex items-center gap-2">
          <Presentation className="w-5 h-5" />
          <span>Presentation Maker</span>
          <button
            onClick={() => setShowChat(!showChat)}
            className={`ml-4 px-3 py-1.5 rounded-lg transition-colors ${
              showChat ? 'bg-blue-500 hover:bg-blue-600' : 'bg-[#3A3A3C] hover:bg-[#4A4A4C]'
            }`}
          >
            {showChat ? 'Hide Assistant' : 'Show Assistant'}
          </button>
        </h2>
        <p className="text-sm text-gray-400 mt-1">
          Upload your content or paste text to generate a professional presentation
        </p>
      </div>

      <div className="flex-1 flex gap-4 overflow-hidden">
        {/* Main Content */}
        <div className={`flex-1 flex flex-col gap-4 overflow-hidden ${showChat ? 'w-2/3' : 'w-full'}`}>
          {/* Input Form */}
          <form onSubmit={handleSubmit} className="space-y-4 bg-[#2C2C2E] p-4 rounded-lg">
            {/* File Upload */}
            <div 
              {...getRootProps()} 
              className="border-2 border-dashed border-[#3A3A3C] rounded-lg p-4 text-center cursor-pointer hover:border-blue-500 transition-colors"
            >
              <input {...getInputProps()} />
              {uploadedFile ? (
                <div className="relative">
                  <div className="flex items-center justify-center gap-2 text-blue-400">
                    <FileText className="w-8 h-8" />
                    <div>
                      <p className="font-medium">{uploadedFile.name}</p>
                      <p className="text-sm text-gray-400">
                        {(uploadedFile.size / 1024).toFixed(1)} KB
                      </p>
                    </div>
                  </div>
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      setUploadedFile(null);
                      setContent('');
                    }}
                    className="absolute top-2 right-2 p-1 bg-[#2C2C2E] rounded-full hover:bg-[#3A3A3C]"
                  >
                    <X className="w-4 h-4" />
                  </button>
                </div>
              ) : (
                <div className="flex flex-col items-center gap-2">
                  <Upload className="w-8 h-8 text-gray-400" />
                  <p className="text-gray-400">Drop a file here or click to upload</p>
                  <p className="text-sm text-gray-500">Supports TXT, MD, and PDF files</p>
                </div>
              )}
            </div>

            {/* Text Input */}
            <div className="space-y-2">
              <label className="block text-sm font-medium">
                Or paste your content here:
              </label>
              <textarea
                value={content}
                onChange={(e) => setContent(e.target.value)}
                placeholder="Enter the content for your presentation..."
                className="w-full h-40 bg-[#1C1C1E] rounded-lg px-4 py-3 border-2 border-[#3A3A3C] focus:border-blue-500 focus:outline-none transition-colors resize-none"
              />
            </div>

            {/* Generate Button */}
            <div className="flex justify-end">
              <button
                type="submit"
                disabled={loading || !content.trim()}
                className="px-6 py-3 bg-blue-500 rounded-lg hover:bg-blue-600 transition-colors disabled:opacity-50 disabled:hover:bg-blue-500 flex items-center gap-2"
              >
                {loading ? (
                  <>
                    <RefreshCw className="w-4 h-4 animate-spin" />
                    Generating...
                  </>
                ) : (
                  <>
                    <Layout className="w-4 h-4" />
                    Generate Presentation
                  </>
                )}
              </button>
            </div>
          </form>

          {/* Generated Presentations */}
          <div className="space-y-6 overflow-y-auto flex-1 pr-2">
            {presentations.map((presentation, index) => (
              <div key={index} className="bg-[#2C2C2E] rounded-lg p-6 border border-[#3A3A3C]">
                {/* Presentation Header */}
                <div className="flex items-center justify-between pb-4 border-b border-[#3A3A3C]">
                  <div>
                    <h3 className="font-medium">{presentation.title}</h3>
                    <div className="flex items-center gap-2 mt-2">
                      <span className="text-sm text-gray-400">
                        {presentation.slides.length} slides
                      </span>
                      <span className="text-sm px-2 py-0.5 bg-[#3A3A3C] rounded">
                        {presentation.theme}
                      </span>
                      <span className="text-sm px-2 py-0.5 bg-[#3A3A3C] rounded">
                        {presentation.style}
                      </span>
                      {presentation.keywords.map((keyword, i) => (
                        <span key={i} className="text-sm px-2 py-0.5 bg-blue-500/20 text-blue-400 rounded">
                          {keyword}
                        </span>
                      ))}
                    </div>
                  </div>
                  <button
                    onClick={() => {
                      const pptx = generatePowerPoint(presentation);
                      downloadPresentation(pptx, presentation.title);
                    }}
                    className="p-2 hover:bg-[#3A3A3C] rounded-lg transition-colors"
                    title="Download presentation"
                  >
                    <Download className="w-4 h-4" />
                  </button>
                </div>

                {/* Outline and Summary */}
                <div className="mt-4 p-4 bg-[#1C1C1E] rounded-lg">
                  <h4 className="font-medium mb-2">Presentation Outline</h4>
                  <ul className="list-disc list-inside space-y-1 text-gray-300">
                    {presentation.outline.map((section, i) => (
                      <li key={i}>{section}</li>
                    ))}
                  </ul>
                  <div className="mt-4 pt-4 border-t border-[#3A3A3C]">
                    <h4 className="font-medium mb-2">Executive Summary</h4>
                    <p className="text-gray-400">{presentation.summary}</p>
                  </div>
                </div>

                {/* Slides Preview */}
                <div className="mt-4 space-y-4">
                  {presentation.slides.map((slide, slideIndex) => (
                    <div key={slideIndex} className="bg-[#1C1C1E] rounded-lg p-4">
                      <div className="flex items-center gap-2 mb-4">
                        <div className="w-8 h-8 bg-blue-500/20 rounded-full flex items-center justify-center text-blue-400 font-medium">
                          {slideIndex + 1}
                        </div>
                        <button
                          onClick={() => setCurrentSlide(slideIndex)}
                          className={`font-medium text-left ${
                            currentSlide === slideIndex ? 'text-blue-400' : 'text-gray-300 hover:text-blue-400'
                          }`}
                        >
                          <h4>{slide.title}</h4>
                        </button>
                      </div>

                      <ul className="space-y-2 list-disc list-inside text-gray-300 ml-4">
                        {slide.content.map((point, pointIndex) => (
                          <li key={pointIndex}>{point}</li>
                        ))}
                      </ul>

                      {/* Equations */}
                      {slide.equations && slide.equations.length > 0 && (
                        <div className="mt-4 space-y-2">
                          {slide.equations.map((equation, i) => (
                            <BlockMath key={i} math={equation} />
                          ))}
                        </div>
                      )}

                      {/* Diagrams */}
                      {slide.diagrams && slide.diagrams.length > 0 && (
                        <div className="mt-4 space-y-2">
                          <h5 className="text-sm font-medium text-gray-400">Suggested Diagrams:</h5>
                          <ul className="list-disc list-inside text-gray-400 ml-4">
                            {slide.diagrams.map((diagram, i) => (
                              <li key={i}>{diagram}</li>
                            ))}
                          </ul>
                        </div>
                      )}

                      {/* References */}
                      {slide.references && slide.references.length > 0 && (
                        <div className="mt-4 space-y-2">
                          <h5 className="text-sm font-medium text-gray-400">References:</h5>
                          <ul className="list-disc list-inside text-gray-400 text-sm ml-4">
                            {slide.references.map((ref, i) => (
                              <li key={i}>{ref}</li>
                            ))}
                          </ul>
                        </div>
                      )}

                      {slide.notes && (
                        <div className="mt-4 pt-4 border-t border-[#3A3A3C]">
                          <p className="text-sm text-gray-400">
                            <span className="font-medium">Speaker Notes:</span> {slide.notes}
                          </p>
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            ))}
            <div ref={messagesEndRef} />
          </div>

          {/* Chat Assistant */}
          {showChat && (
            <div className="w-1/3 border-l border-[#3A3A3C] overflow-hidden">
              <PresentationChat
                currentSlide={currentSlide}
                onUpdateSlide={(slideIndex, updates) => {
                  setPresentations(prev => {
                    const newPresentations = [...prev];
                    if (newPresentations[0]?.slides[slideIndex]) {
                      newPresentations[0].slides[slideIndex] = {
                        ...newPresentations[0].slides[slideIndex],
                        ...updates
                      };
                    }
                    return newPresentations;
                  });
                }}
              />
            </div>
          )}
        </div>
      </div>
    </div>
  );
}