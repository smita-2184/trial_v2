import React from 'react';
import { useOpenAIStore } from '../store/openai';

export function APIKeyInput() {
  const [key, setKey] = React.useState('');
  const { setApiKey, error, clearError } = useOpenAIStore();

  React.useEffect(() => {
    if (error) {
      const timer = setTimeout(clearError, 5000);
      return () => clearTimeout(timer);
    }
  }, [error, clearError]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (key.trim()) {
      setApiKey(key.trim());
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div>
        <label htmlFor="api-key" className="block text-sm font-medium mb-2">
          OpenAI API Key
        </label>
        <input
          id="api-key"
          type="password"
          value={key}
          onChange={(e) => setKey(e.target.value)}
          className={`flex h-10 w-full rounded-md border px-3 py-2 text-sm ${
            error ? 'border-red-500' : 'border-input'
          } bg-background ring-offset-background file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50`}
          placeholder="sk-..."
          required
        />
        {error && (
          <p className="text-red-500 text-sm mt-2">{error}</p>
        )}
      </div>
      <button
        type="submit"
        className="inline-flex items-center justify-center whitespace-nowrap rounded-md text-sm font-medium ring-offset-background transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50 bg-primary text-primary-foreground hover:bg-primary/90 h-10 px-4 py-2 w-full"
      >
        Save API Key
      </button>
    </form>
  );
}