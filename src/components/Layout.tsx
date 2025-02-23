import React from 'react';
import { Footer } from './Footer';

interface LayoutProps {
  children: React.ReactNode;
}

export function Layout({ children }: LayoutProps) {
  return (
    <div className="min-h-screen flex flex-col bg-[#1C1C1E] text-white">
      {/* Header */}
      <div className="flex-none bg-[#2C2C2E] border-b border-[#3A3A3C]">
        <div className="px-6 py-4">
          <h1 className="text-xl font-semibold">Study Assistant</h1>
        </div>
      </div>
      
      {/* Main Content */}
      <div className="flex-1 overflow-auto">
        {children}
      </div>

      {/* Footer */}
      <Footer />
    </div>
  );
} 