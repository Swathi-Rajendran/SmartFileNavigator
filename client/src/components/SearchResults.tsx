import { useState } from 'react';
import { SearchResult as SearchResultType } from '@/lib/types';
import ResultCard from './ResultCard';
import PreviewPane from './PreviewPane';
import { ChevronDown } from 'lucide-react';

interface SearchResultsProps {
  results: SearchResultType[];
  isLoading: boolean;
  query: string;
  onLoadMore?: () => void;
  hasMore?: boolean;
}

export default function SearchResults({ 
  results, 
  isLoading, 
  query,
  onLoadMore,
  hasMore = false
}: SearchResultsProps) {
  const [selectedResult, setSelectedResult] = useState<SearchResultType | null>(null);
  const [sortBy, setSortBy] = useState<'relevance' | 'date' | 'name'>('relevance');
  const [showPreview, setShowPreview] = useState(false);

  // Handle result click
  const handleResultClick = (result: SearchResultType) => {
    setSelectedResult(result);
    setShowPreview(true);
  };

  // Close preview pane
  const handleClosePreview = () => {
    setShowPreview(false);
  };

  // Sort results
  const sortedResults = [...results].sort((a, b) => {
    if (sortBy === 'relevance') {
      return b.relevanceScore - a.relevanceScore;
    }
    if (sortBy === 'date') {
      return new Date(b.modifiedAt).getTime() - new Date(a.modifiedAt).getTime();
    }
    if (sortBy === 'name') {
      return a.filename.localeCompare(b.filename);
    }
    return 0;
  });

  if (isLoading) {
    return (
      <div className="max-w-3xl mx-auto py-8 text-center">
        <div className="animate-pulse flex flex-col items-center">
          <div className="h-12 w-12 bg-neutral-200 rounded-full mb-4"></div>
          <div className="h-4 bg-neutral-200 rounded w-1/3 mb-2"></div>
          <div className="h-4 bg-neutral-200 rounded w-1/4"></div>
        </div>
      </div>
    );
  }

  if (results.length === 0) {
    return (
      <div className="max-w-3xl mx-auto py-12 text-center">
        <div className="bg-white rounded-xl shadow-sm border border-neutral-200 p-8">
          <div className="text-neutral-400 mb-4">
            <svg className="mx-auto h-12 w-12" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
            </svg>
          </div>
          <h3 className="text-lg font-medium text-neutral-900">No results found</h3>
          <p className="mt-2 text-sm text-neutral-600">
            {query ? `No matches found for "${query}". Try a different search term.` : 'Enter a search query to get started.'}
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-1 overflow-hidden">
      <div className="flex-1 overflow-y-auto p-4 lg:p-6 bg-mesh">
        <div className="max-w-3xl mx-auto">
          {/* Stats & sort */}
          <div className="flex items-center justify-between mb-4">
            <p className="text-sm text-neutral-600">
              Found <span className="font-medium">{results.length} results</span>
              {query && <> for "<span className="font-medium">{query}</span>"</>}
            </p>
            <div className="flex items-center space-x-2">
              <label htmlFor="sort" className="text-sm text-neutral-600">Sort by:</label>
              <select 
                id="sort" 
                className="text-sm border-neutral-300 rounded-md focus:ring-primary focus:border-primary"
                value={sortBy}
                onChange={(e) => setSortBy(e.target.value as 'relevance' | 'date' | 'name')}
              >
                <option value="relevance">Relevance</option>
                <option value="date">Date</option>
                <option value="name">Name</option>
              </select>
            </div>
          </div>

          {/* Results grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {sortedResults.map(result => (
              <ResultCard
                key={result.fileId}
                result={result}
                onClick={() => handleResultClick(result)}
              />
            ))}
          </div>

          {/* Load more */}
          {hasMore && (
            <div className="mt-6 text-center">
              <button 
                className="inline-flex items-center px-4 py-2 border border-neutral-300 text-sm font-medium rounded-md text-neutral-700 bg-white hover:bg-neutral-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary"
                onClick={onLoadMore}
              >
                Load more results
                <ChevronDown className="ml-2 h-4 w-4" />
              </button>
            </div>
          )}
        </div>
      </div>

      {/* Preview pane */}
      {showPreview && selectedResult && (
        <aside className="hidden xl:block w-96 border-l border-neutral-200 bg-white overflow-y-auto">
          <PreviewPane 
            result={selectedResult} 
            onClose={handleClosePreview} 
          />
        </aside>
      )}

      {/* Mobile preview modal */}
      {showPreview && selectedResult && (
        <div className="xl:hidden fixed inset-0 bg-black bg-opacity-50 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-xl w-full max-w-md max-h-[90vh] overflow-y-auto">
            <PreviewPane 
              result={selectedResult} 
              onClose={handleClosePreview} 
              isMobile={true}
            />
          </div>
        </div>
      )}
    </div>
  );
}
