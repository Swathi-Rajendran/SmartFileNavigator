import { useState, useEffect } from 'react';
import { useQuery } from '@tanstack/react-query';
import AppLayout from '@/components/AppLayout';
import SearchBar from '@/components/SearchBar';
import FilterTabs from '@/components/FilterTabs';
import SearchResults from '@/components/SearchResults';
import IndexingModal from '@/components/IndexingModal';
import { SearchResult, FileType, UploadProgressInfo, UploadStatus, FileCounts } from '@/lib/types';
import { apiRequest } from '@/lib/queryClient';
import { useSearch } from '@/hooks/useSearch';
import { useToast } from '@/hooks/use-toast';

export default function Home() {
  const [activeFilter, setActiveFilter] = useState('all');
  const [filteredResults, setFilteredResults] = useState<SearchResult[]>([]);
  const [indexingStatus, setIndexingStatus] = useState<UploadStatus>('idle');
  const [indexingProgress, setIndexingProgress] = useState(0);
  const [indexingFiles, setIndexingFiles] = useState<UploadProgressInfo[]>([]);
  const { toast } = useToast();

  // Get file counts for filter tabs
  const { data: fileCounts = { total: 0, document: 0, image: 0, video: 0 } } = useQuery<FileCounts>({
    queryKey: ['/api/files/counts'],
  });

  // Set up search
  const { 
    query, 
    setQuery, 
    results, 
    isLoading, 
    handleSearch 
  } = useSearch();

  // Filter results when activeFilter or results change
  useEffect(() => {
    if (!results) {
      setFilteredResults([]);
      return;
    }

    if (activeFilter === 'all') {
      setFilteredResults(results);
    } else {
      setFilteredResults(results.filter(result => result.fileType === activeFilter));
    }
  }, [activeFilter, results]);

  // Handle filter change
  const handleFilterChange = (filter: string) => {
    setActiveFilter(filter);
  };

  // Cancel indexing
  const handleCancelIndexing = () => {
    setIndexingStatus('idle');
    toast({
      title: 'Indexing cancelled',
      description: 'File indexing has been cancelled',
      variant: 'default',
    });
  };

  // Run indexing in background
  const handleRunInBackground = () => {
    setIndexingStatus('idle');
    toast({
      title: 'Running in background',
      description: 'File indexing will continue in the background',
      variant: 'default',
    });
  };

  return (
    <AppLayout>
      {/* Search & Filter Section */}
      <div className="bg-white border-b border-neutral-200 py-4 lg:py-6 px-4 lg:px-6">
        <SearchBar 
          query={query}
          setQuery={setQuery}
          onSearch={handleSearch}
          isLoading={isLoading}
        />

        <FilterTabs 
          activeFilter={activeFilter}
          setActiveFilter={handleFilterChange}
          counts={fileCounts}
        />
      </div>

      {/* Results area */}
      <SearchResults 
        results={filteredResults}
        isLoading={isLoading}
        query={query}
      />

      {/* Indexing Modal */}
      <IndexingModal 
        isVisible={indexingStatus === 'indexing'}
        progress={indexingProgress}
        files={indexingFiles}
        onCancel={handleCancelIndexing}
        onRunInBackground={handleRunInBackground}
      />
    </AppLayout>
  );
}
