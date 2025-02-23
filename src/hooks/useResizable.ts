import { useEffect, useRef } from 'react';

interface UseResizableProps {
  resizeRef: React.RefObject<HTMLDivElement>;
  minWidth: number;
  maxWidth: number;
  minHeight?: number;
  maxHeight?: number;
  direction?: 'horizontal' | 'vertical' | 'both';
  onResize?: (width: number) => void;
  onHeightResize?: (height: number) => void;
}

export function useResizable({ 
  resizeRef, 
  minWidth, 
  maxWidth, 
  minHeight = 100,
  maxHeight = window.innerHeight,
  direction = 'horizontal',
  onResize,
  onHeightResize
}: UseResizableProps) {
  const isResizing = useRef(false);
  const startPos = useRef({ x: 0, y: 0 });
  const startWidth = useRef(0);
  const startHeight = useRef(0);

  const handleMouseMove = (e: MouseEvent) => {
    if (!isResizing.current) return;

    if (direction === 'horizontal' || direction === 'both') {
      const dx = e.clientX - startPos.current.x;
      const newWidth = Math.min(Math.max(startWidth.current + dx, minWidth), maxWidth);
      onResize(newWidth);
    }
    
    if ((direction === 'vertical' || direction === 'both') && onHeightResize) {
      const dy = e.clientY - startPos.current.y;
      const newHeight = Math.min(Math.max(startHeight.current + dy, minHeight), maxHeight);
      onHeightResize(newHeight);
    }
  };

  const handleMouseUp = () => {
    isResizing.current = false;
    document.body.style.cursor = '';
    document.removeEventListener('mousemove', handleMouseMove);
    document.removeEventListener('mouseup', handleMouseUp);
  };

  const startResize = (e: React.MouseEvent) => {
    e.preventDefault(); // Prevent text selection while dragging
    
    if (!resizeRef.current?.parentElement) return;
    
    isResizing.current = true;
    startPos.current = { x: e.clientX, y: e.clientY };
    startWidth.current = resizeRef.current.parentElement.offsetWidth;
    startHeight.current = resizeRef.current.parentElement.offsetHeight;
    
    document.body.style.cursor = direction === 'horizontal' ? 'col-resize' : 
                                direction === 'vertical' ? 'row-resize' : 
                                'nw-resize';
    
    // Add event listeners to document
    document.addEventListener('mousemove', handleMouseMove);
    document.addEventListener('mouseup', handleMouseUp);
  };

  // Cleanup event listeners on unmount
  useEffect(() => {
    return () => {
      document.removeEventListener('mousemove', handleMouseMove);
      document.removeEventListener('mouseup', handleMouseUp);
    };
  }, []);

  return { startResize };
}