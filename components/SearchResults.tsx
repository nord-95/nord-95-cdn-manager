'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { useRouter, usePathname } from 'next/navigation';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { 
  Search, 
  X, 
  FileText, 
  Image, 
  Music, 
  Video, 
  Download,
  ExternalLink,
  Tag
} from 'lucide-react';
import { authenticatedFetch } from '@/lib/api';
import { useToast } from '@/components/ui/use-toast';
import { useSearch } from '@/contexts/SearchContext';

interface SearchResult {
  key: string;
  tags: string[];
  size?: number;
  lastModified?: string;
}

export function SearchResults() {
  const router = useRouter();
  const pathname = usePathname();
  const { searchQuery, isSearchOpen, closeSearch } = useSearch();
  const [results, setResults] = useState<SearchResult[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [searchInput, setSearchInput] = useState(searchQuery);
  const [selectedTags, setSelectedTags] = useState<string[]>([]);
  const [availableTags, setAvailableTags] = useState<string[]>([]);
  const { toast } = useToast();

  // Extract CDN ID from current path
  const cdnId = pathname.startsWith('/cdn/') ? pathname.split('/')[2] : null;

  const fetchAvailableTags = useCallback(async () => {
    if (!cdnId) return;
    
    try {
      const response = await authenticatedFetch(`/api/cdns/${cdnId}/files`);
      if (response.ok) {
        const data = await response.json();
        const allTags = new Set<string>();
        
        // Get all files and extract their tags
        for (const file of data.files || []) {
          if (file.tags && Array.isArray(file.tags)) {
            file.tags.forEach((tag: string) => allTags.add(tag));
          }
        }
        
        setAvailableTags(Array.from(allTags));
      }
    } catch (error) {
      console.error('Error fetching available tags:', error);
    }
  }, [cdnId]);

  // Get available tags for this CDN
  useEffect(() => {
    if (cdnId && isSearchOpen) {
      fetchAvailableTags();
    }
  }, [cdnId, isSearchOpen, fetchAvailableTags]);

  const performSearch = async () => {
    if (!cdnId || (!searchInput.trim() && selectedTags.length === 0)) {
      console.log('Search skipped - no CDN ID or search criteria');
      return;
    }

    console.log('Performing search:', { cdnId, searchInput, selectedTags });
    setIsLoading(true);
    try {
      const params = new URLSearchParams();
      if (searchInput.trim()) {
        params.append('q', searchInput.trim());
      }
      if (selectedTags.length > 0) {
        params.append('tags', selectedTags.join(','));
      }

      const url = `/api/cdns/${cdnId}/files/search?${params.toString()}`;
      console.log('Search URL:', url);
      
      const response = await authenticatedFetch(url);
      console.log('Search response status:', response.status);
      
      if (response.ok) {
        const data = await response.json();
        console.log('Search response data:', data);
        setResults(data.files || []);
      } else {
        const errorData = await response.json();
        console.error('Search API error:', errorData);
        throw new Error(`Search failed: ${errorData.error || 'Unknown error'}`);
      }
    } catch (error) {
      console.error('Search error:', error);
      toast({
        title: "Search Error",
        description: error instanceof Error ? error.message : "Failed to search files",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    performSearch();
  };

  const toggleTag = (tag: string) => {
    setSelectedTags(prev => 
      prev.includes(tag) 
        ? prev.filter(t => t !== tag)
        : [...prev, tag]
    );
  };

  const getFileIcon = (key: string) => {
    const extension = key.split('.').pop()?.toLowerCase();
    if (['jpg', 'jpeg', 'png', 'gif', 'webp', 'svg'].includes(extension || '')) {
      return <Image className="h-4 w-4" />;
    } else if (['mp3', 'wav', 'ogg', 'm4a'].includes(extension || '')) {
      return <Music className="h-4 w-4" />;
    } else if (['mp4', 'avi', 'mov', 'webm'].includes(extension || '')) {
      return <Video className="h-4 w-4" />;
    }
    return <FileText className="h-4 w-4" />;
  };

  const handleFileClick = (fileKey: string) => {
    // Navigate to the CDN page and scroll to the file
    router.push(`/cdn/${cdnId}?highlight=${encodeURIComponent(fileKey)}`);
    closeSearch();
  };

  if (!isSearchOpen || !cdnId) {
    return null;
  }

  return (
    <div className="fixed inset-0 bg-black/50 z-50 flex items-start justify-center pt-20">
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow-lg w-full max-w-4xl mx-4 max-h-[80vh] overflow-hidden">
        <div className="p-4 border-b border-gray-200 dark:border-gray-700">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-semibold text-gray-900 dark:text-white">Search Files</h2>
            <Button variant="ghost" size="sm" onClick={closeSearch}>
              <X className="h-4 w-4" />
            </Button>
          </div>
          
          <form onSubmit={handleSearch} className="space-y-4">
            <div className="flex items-center space-x-2">
              <Search className="h-4 w-4 text-gray-400" />
              <Input
                type="text"
                placeholder="Search files by name..."
                value={searchInput}
                onChange={(e) => setSearchInput(e.target.value)}
                className="flex-1"
              />
              <Button type="submit" disabled={isLoading}>
                {isLoading ? 'Searching...' : 'Search'}
              </Button>
            </div>
            
            {availableTags.length > 0 && (
              <div>
                <label className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-2 block">
                  Filter by tags:
                </label>
                <div className="flex flex-wrap gap-2">
                  {availableTags.map((tag) => (
                    <Badge
                      key={tag}
                      variant={selectedTags.includes(tag) ? "default" : "secondary"}
                      className="cursor-pointer hover:bg-blue-100 dark:hover:bg-blue-900"
                      onClick={() => toggleTag(tag)}
                    >
                      <Tag className="h-3 w-3 mr-1" />
                      {tag}
                    </Badge>
                  ))}
                </div>
              </div>
            )}
          </form>
        </div>
        
        <div className="p-4 overflow-y-auto max-h-[60vh]">
          {results.length === 0 && !isLoading ? (
            <div className="text-center py-8">
              <Search className="h-12 w-12 text-gray-400 mx-auto mb-4" />
              <p className="text-gray-500 dark:text-gray-400">
                {searchInput || selectedTags.length > 0 
                  ? 'No files found matching your search.' 
                  : 'Enter a search term or select tags to search files.'}
              </p>
            </div>
          ) : (
            <div className="space-y-2">
              {results.map((file) => (
                <Card 
                  key={file.key} 
                  className="cursor-pointer hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors"
                  onClick={() => handleFileClick(file.key)}
                >
                  <CardContent className="p-3">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center space-x-3">
                        {getFileIcon(file.key)}
                        <div>
                          <p className="font-medium text-gray-900 dark:text-white">
                            {file.key.split('/').pop()}
                          </p>
                          <p className="text-sm text-gray-500 dark:text-gray-400">
                            {file.key}
                          </p>
                        </div>
                      </div>
                      <div className="flex items-center space-x-2">
                        {file.tags && file.tags.length > 0 && (
                          <div className="flex space-x-1">
                            {file.tags.slice(0, 3).map((tag) => (
                              <Badge key={tag} variant="outline" className="text-xs">
                                {tag}
                              </Badge>
                            ))}
                            {file.tags.length > 3 && (
                              <Badge variant="outline" className="text-xs">
                                +{file.tags.length - 3}
                              </Badge>
                            )}
                          </div>
                        )}
                        <ExternalLink className="h-4 w-4 text-gray-400" />
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
