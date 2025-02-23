import React from 'react';
import { useOpenAIStore } from '../store/openai';

interface SummaryProps {
  text: string;
}

export function Summary({ text }: SummaryProps) {
  const [summary, setSummary] = React.useState<string>('');
  const [loading, setLoading] = React.useState(false);
  const service = useOpenAIStore((state) => state.service);

  React.useEffect(() => {
    if (!service) return;
    
    async function generateSummary() {
    setLoading(true);
    try {
      const result = await service.generateSummary(text);
      setSummary(result);
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Failed to generate summary';
      setSummary(`Error: ${errorMessage}`);
      console.error('Failed to generate summary:', errorMessage);
    } finally {
      setLoading(false);
    }
  }
    
    generateSummary();
  }, [text, service]);

  return (
    <div className="bg-[#2C2C2E] rounded-lg p-4 h-full overflow-y-auto">
      <h2 className="text-lg font-medium mb-4">Document Summary</h2>
      {loading ? (
        <div className="text-gray-400">Generating summary...</div>
      ) : (
        <p className="text-gray-400">{summary || 'Upload a document to generate a summary.'}</p>
      )}
    </div>
  );
}