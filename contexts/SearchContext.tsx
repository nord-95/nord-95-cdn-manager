'use client';

import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';

interface SearchContextType {
  searchQuery: string;
  setSearchQuery: (query: string) => void;
  isSearchOpen: boolean;
  openSearch: () => void;
  closeSearch: () => void;
  toggleSearch: () => void;
  clearSearch: () => void;
}

const SearchContext = createContext<SearchContextType | undefined>(undefined);

export function SearchProvider({ children }: { children: React.ReactNode }) {
  const [searchQuery, setSearchQuery] = useState('');
  const [isSearchOpen, setIsSearchOpen] = useState(false);
  const router = useRouter();

  const openSearch = useCallback(() => {
    setIsSearchOpen(true);
  }, []);

  const closeSearch = useCallback(() => {
    setIsSearchOpen(false);
    setSearchQuery(''); // Clear search query when closing
  }, []);

  const toggleSearch = useCallback(() => {
    setIsSearchOpen(prev => !prev);
  }, []);

  const clearSearch = useCallback(() => {
    setSearchQuery('');
  }, []);

  // Keyboard shortcuts
  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      // Ignore if user is typing in an input field
      if (event.target instanceof HTMLInputElement || event.target instanceof HTMLTextAreaElement) {
        return;
      }

      // Search shortcuts
      if (event.key === '/' || event.key === 'f' || event.key === 'F') {
        event.preventDefault();
        openSearch();
        return;
      }

      // Escape to close search
      if (event.key === 'Escape' && isSearchOpen) {
        event.preventDefault();
        closeSearch();
        return;
      }

      // CDN navigation shortcut (C key)
      if (event.key === 'c' || event.key === 'C') {
        event.preventDefault();
        router.push('/dashboard');
        return;
      }

      // Upload shortcut (U key) - only on CDN pages
      if ((event.key === 'u' || event.key === 'U') && window.location.pathname.includes('/cdn/')) {
        event.preventDefault();
        const fileInput = document.getElementById('file-upload') as HTMLInputElement;
        if (fileInput) {
          fileInput.click();
        }
        return;
      }

      // Check for updates shortcut (Shift + U)
      if (event.shiftKey && (event.key === 'U' || event.key === 'u')) {
        event.preventDefault();
        // Trigger update check - we'll need to access this from the UpdateContext
        const updateButton = document.querySelector('[data-update-check]') as HTMLButtonElement;
        if (updateButton) {
          updateButton.click();
        }
        return;
      }
    };

    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [isSearchOpen, openSearch, closeSearch, router]);

  return (
    <SearchContext.Provider value={{
      searchQuery,
      setSearchQuery,
      isSearchOpen,
      openSearch,
      closeSearch,
      toggleSearch,
      clearSearch
    }}>
      {children}
    </SearchContext.Provider>
  );
}

export function useSearch() {
  const context = useContext(SearchContext);
  if (context === undefined) {
    throw new Error('useSearch must be used within a SearchProvider');
  }
  return context;
}
