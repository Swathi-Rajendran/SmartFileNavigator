import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { SearchResult, FileType } from "@/lib/types";

interface UseSearchOptions {
  initialQuery?: string;
  initialFileTypes?: FileType[];
}

export function useSearch({
  initialQuery = "",
  initialFileTypes = [],
}: UseSearchOptions = {}) {
  const [query, setQuery] = useState(initialQuery);
  const [fileTypes, setFileTypes] = useState<FileType[]>(initialFileTypes);
  const [isSearching, setIsSearching] = useState(false);
  const [searchResults, setSearchResults] = useState<
    SearchResult[] | undefined
  >(undefined);

  const { isLoading, isError, error, refetch } = useQuery({
    queryKey: ["/api/search", query, fileTypes],
    enabled: false, // Don't fetch on component mount
  });

  const handleSearch = async () => {
    if (!query.trim()) return;
    setIsSearching(true);
    try {
      const res = await apiRequest("POST", "/api/search", {
        query,
        fileTypes: fileTypes.length > 0 ? fileTypes : undefined,
        limit: 20,
      });
      const data = await res.json();
      setSearchResults(data as SearchResult[]);
      setIsSearching(false);
      return data as SearchResult[];
    } catch (err) {
      setIsSearching(false);
      throw err;
    }
  };

  return {
    query,
    setQuery,
    fileTypes,
    setFileTypes,
    results: searchResults,
    isLoading: isLoading || isSearching,
    isError,
    error,
    handleSearch,
    refetch,
  };
}
