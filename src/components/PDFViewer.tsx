import React, { useState, useRef, useEffect } from 'react';
import { Document, Page, pdfjs } from 'react-pdf';
import { ChevronLeft, ChevronRight, Maximize2, Minimize2 } from 'lucide-react';
import { useResizable } from '../hooks/useResizable';
import 'react-pdf/dist/Page/AnnotationLayer.css';
import 'react-pdf/dist/Page/TextLayer.css';

// Set up the worker for PDF.js
pdfjs.GlobalWorkerOptions.workerSrc = `//unpkg.com/pdfjs-dist@${pdfjs.version}/build/pdf.worker.min.js`;

interface PDFViewerProps {
  file: File | null;
  onTextExtracted?: (text: string) => void;
}

export function PDFViewer({ file, onTextExtracted }: PDFViewerProps) {
  const [numPages, setNumPages] = useState<number>(0);
  const [pageNumber, setPageNumber] = useState<number>(1);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [dimensions, setDimensions] = useState({
    width: 'auto',
    height: 500
  });
  const previousDimensions = useRef(dimensions);
  const containerRef = useRef<HTMLDivElement>(null);
  const verticalResizeRef = useRef<HTMLDivElement>(null);
  const cornerResizeRef = useRef<HTMLDivElement>(null);

  function onDocumentLoadSuccess({ numPages }: { numPages: number }): void {
    setNumPages(numPages);
    if (file && onTextExtracted) {
      extractTextFromPDF(file).then(onTextExtracted);
    }
  }

  async function extractTextFromPDF(file: File): Promise<string> {
    const arrayBuffer = await file.arrayBuffer();
    const pdf = await pdfjs.getDocument(arrayBuffer).promise;
    let fullText = '';
    
    for (let i = 1; i <= pdf.numPages; i++) {
      const page = await pdf.getPage(i);
      const textContent = await page.getTextContent();
      const pageText = textContent.items
        .map((item: any) => item.str)
        .join(' ');
      fullText += pageText + '\n';
    }
    
    return fullText;
  }

  function changePage(offset: number) {
    setPageNumber(prevPageNumber => prevPageNumber + offset);
  }

  const { startResize: startVerticalResize } = useResizable({
    resizeRef: verticalResizeRef,
    minWidth: 0,
    maxWidth: 0,
    minHeight: 200,
    maxHeight: window.innerHeight - 200,
    direction: 'vertical',
    onHeightResize: (height) => setDimensions(prev => ({ ...prev, height })),
  });

  // Handle corner resize
  const handleCornerResize = (e: React.MouseEvent) => {
    e.preventDefault();
    const startX = e.clientX;
    const startY = e.clientY;
    const startWidth = containerRef.current?.offsetWidth || 0;
    const startHeight = containerRef.current?.offsetHeight || 0;

    const handleMouseMove = (e: MouseEvent) => {
      const deltaX = e.clientX - startX;
      const deltaY = e.clientY - startY;
      
      const newWidth = Math.max(300, Math.min(window.innerWidth - 400, startWidth + deltaX));
      const newHeight = Math.max(200, Math.min(window.innerHeight - 200, startHeight + deltaY));
      
      setDimensions({
        width: newWidth,
        height: newHeight
      });
    };

    const handleMouseUp = () => {
      document.removeEventListener('mousemove', handleMouseMove);
      document.removeEventListener('mouseup', handleMouseUp);
      document.body.style.cursor = 'default';
    };

    document.addEventListener('mousemove', handleMouseMove);
    document.addEventListener('mouseup', handleMouseUp);
    document.body.style.cursor = 'se-resize';
  };

  const toggleFullscreen = () => {
    if (!isFullscreen) {
      previousDimensions.current = dimensions;
      setDimensions({
        width: window.innerWidth - 48, // Account for padding
        height: window.innerHeight - 48
      });
    } else {
      setDimensions(previousDimensions.current);
    }
    setIsFullscreen(!isFullscreen);
  };

  if (!file) {
    return (
      <div className="flex items-center justify-center h-full bg-[#1C1C1E] text-gray-400">
        <p>Upload a PDF file to view its contents.</p>
      </div>
    );
  }

  // Check if file is empty
  if (file.size === 0) {
    return (
      <div className="flex items-center justify-center h-full bg-[#1C1C1E] text-red-400">
        <p>Error: The PDF file is empty. Please upload a valid PDF file.</p>
      </div>
    );
  }

  return (
    <div 
      ref={containerRef}
      className={`relative flex flex-col bg-[#1C1C1E] transition-all duration-300 ${
        isFullscreen ? 'fixed inset-4 z-50' : ''
      }`}
      style={{ 
        width: dimensions.width,
        height: dimensions.height 
      }}
    >
      {/* Toolbar */}
      <div className="flex items-center justify-between p-2 bg-[#2C2C2E] border-b border-[#3A3A3C]">
        <div className="flex items-center gap-2">
          <button
            onClick={() => changePage(-1)}
            disabled={pageNumber <= 1}
            className="p-1 rounded-lg hover:bg-[#3A3A3C] disabled:opacity-50"
          >
            <ChevronLeft className="h-5 w-5" />
          </button>
          
          <span className="text-sm">
            Page {pageNumber} of {numPages}
          </span>
          
          <button
            onClick={() => changePage(1)}
            disabled={pageNumber >= numPages}
            className="p-1 rounded-lg hover:bg-[#3A3A3C] disabled:opacity-50"
          >
            <ChevronRight className="h-5 w-5" />
          </button>
        </div>

        <button
          onClick={toggleFullscreen}
          className="p-1 rounded-lg hover:bg-[#3A3A3C]"
          title={isFullscreen ? 'Exit fullscreen' : 'Enter fullscreen'}
        >
          {isFullscreen ? (
            <Minimize2 className="w-5 h-5" />
          ) : (
            <Maximize2 className="w-5 h-5" />
          )}
        </button>
      </div>

      {/* PDF Document */}
      <div className="flex-1 overflow-auto">
        <Document
          file={file}
          error={
            <div className="flex items-center justify-center p-4 text-red-400">
              <p>Error: Failed to load PDF. Please ensure it's a valid PDF file.</p>
            </div>
          }
          noData={
            <div className="flex items-center justify-center p-4 text-gray-400">
              <p>No PDF file selected.</p>
            </div>
          }
          onLoadSuccess={onDocumentLoadSuccess}
          className="flex justify-center"
        >
          <Page 
            pageNumber={pageNumber} 
            className="max-w-full"
            renderTextLayer={true}
            renderAnnotationLayer={true}
          />
        </Document>
      </div>

      {/* Resize handles */}
      {!isFullscreen && (
        <>
          {/* Vertical resize handle */}
          <div
            ref={verticalResizeRef}
            className="absolute bottom-0 left-1/2 -translate-x-1/2 w-20 h-1 cursor-row-resize group"
            onMouseDown={startVerticalResize}
          >
            <div className="absolute bottom-0 left-0 w-full h-1 bg-transparent group-hover:bg-blue-500/20" />
          </div>

          {/* Corner resize handle */}
          <div
            ref={cornerResizeRef}
            className="absolute bottom-0 right-0 w-4 h-4 cursor-se-resize"
            onMouseDown={handleCornerResize}
          >
            <div className="absolute bottom-0 right-0 w-0 h-0 border-8 border-transparent border-r-[#3A3A3C] border-b-[#3A3A3C] hover:border-r-blue-500/20 hover:border-b-blue-500/20" />
          </div>
        </>
      )}

      {/* Fullscreen instructions */}
      {isFullscreen && (
        <div className="absolute bottom-4 left-1/2 -translate-x-1/2 text-xs text-gray-500">
          Press Esc to exit fullscreen
        </div>
      )}
    </div>
  );
}