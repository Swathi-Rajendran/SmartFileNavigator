import { useState, FormEvent } from 'react';
import { Search, Mic } from 'lucide-react';

interface SearchBarProps {
  query: string;
  setQuery: (query: string) => void;
  onSearch: () => void;
  isLoading?: boolean;
}

export default function SearchBar({ query, setQuery, onSearch, isLoading = false }: SearchBarProps) {
  const handleSubmit = (e: FormEvent) => {
    e.preventDefault();
    if (query.trim()) {
      onSearch();
    }
  };

  return (
    <div className="max-w-3xl mx-auto">
      <form onSubmit={handleSubmit}>
        <div className="relative flex items-center">
          <input
            type="text"
            placeholder="Search anything in your files..."
            className="w-full px-4 py-3 pl-12 pr-20 rounded-xl border border-neutral-300 focus:outline-none focus:ring-2 focus:ring-primary focus:border-primary transition-colors"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
          />
          <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
            <Search className="h-5 w-5 text-neutral-400" />
          </div>
          <div className="absolute inset-y-0 right-0 pr-3 flex items-center">
            <button 
              type="button" 
              className="p-1.5 text-neutral-400 hover:text-neutral-600 focus:outline-none" 
              aria-label="Voice search"
            >
              <Mic className="h-5 w-5" />
            </button>
            <button 
              type="submit" 
              className="ml-2 bg-primary hover:bg-primary-600 text-white rounded-lg px-4 py-1.5 text-sm font-medium transition-colors focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary"
              disabled={isLoading}
            >
              {isLoading ? 'Searching...' : 'Search'}
            </button>
          </div>
        </div>
      </form>
    </div>
  );
}
