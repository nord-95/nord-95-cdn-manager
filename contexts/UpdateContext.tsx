'use client';

import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { useToast } from '@/components/ui/use-toast';
import { authenticatedFetch } from '@/lib/api';

interface UpdateInfo {
  hasUpdate: boolean;
  currentVersion: string;
  currentBuildTime: string;
  latestVersion?: string;
  updateAvailable: boolean;
  message: string;
  error?: string;
}

interface UpdateContextType {
  updateInfo: UpdateInfo | null;
  isCheckingForUpdates: boolean;
  checkForUpdates: () => Promise<void>;
  refreshApp: () => void;
  dismissUpdate: () => void;
}

const UpdateContext = createContext<UpdateContextType | undefined>(undefined);

export function UpdateProvider({ children }: { children: React.ReactNode }) {
  const [updateInfo, setUpdateInfo] = useState<UpdateInfo | null>(null);
  const [isCheckingForUpdates, setIsCheckingForUpdates] = useState(false);
  const { toast } = useToast();

  const checkForUpdates = useCallback(async () => {
    setIsCheckingForUpdates(true);
    try {
      const response = await authenticatedFetch('/api/updates/check');
      const data = await response.json();
      
      setUpdateInfo(data);
      
      if (data.hasUpdate) {
        toast({
          title: "Update Available",
          description: data.message,
          action: (
            <button
              onClick={() => window.location.reload()}
              className="px-3 py-2 rounded-md bg-blue-600 text-white text-sm font-medium hover:bg-blue-700"
            >
              Refresh Now
            </button>
          ),
          duration: 10000,
        });
      } else if (!data.error) {
        toast({
          title: "No Updates",
          description: data.message,
          duration: 3000,
        });
      }
    } catch (error) {
      console.error('Error checking for updates:', error);
      toast({
        title: "Error",
        description: "Failed to check for updates",
        variant: "destructive",
      });
    } finally {
      setIsCheckingForUpdates(false);
    }
  }, [toast]);

  const refreshApp = useCallback(() => {
    // Clear any cached data
    if ('caches' in window) {
      caches.keys().then((cacheNames) => {
        cacheNames.forEach((cacheName) => {
          caches.delete(cacheName);
        });
      });
    }
    
    // Reload the page
    window.location.reload();
  }, []);

  const dismissUpdate = useCallback(() => {
    setUpdateInfo(null);
  }, []);

  // Check for updates on app start (but not in development)
  useEffect(() => {
    if (process.env.NODE_ENV === 'production') {
      // Check for updates after a short delay to let the app load
      const timer = setTimeout(() => {
        checkForUpdates();
      }, 5000);
      
      return () => clearTimeout(timer);
    }
  }, [checkForUpdates]);

  // Listen for service worker updates
  useEffect(() => {
    if ('serviceWorker' in navigator) {
      navigator.serviceWorker.addEventListener('message', (event) => {
        if (event.data && event.data.type === 'SW_UPDATE_AVAILABLE') {
          setUpdateInfo({
            hasUpdate: true,
            currentVersion: 'current',
            currentBuildTime: new Date().toISOString(),
            updateAvailable: true,
            message: 'A new version is available. Refresh to update!'
          });
        }
      });
    }
  }, []);

  return (
    <UpdateContext.Provider value={{
      updateInfo,
      isCheckingForUpdates,
      checkForUpdates,
      refreshApp,
      dismissUpdate
    }}>
      {children}
    </UpdateContext.Provider>
  );
}

export function useUpdate() {
  const context = useContext(UpdateContext);
  if (context === undefined) {
    throw new Error('useUpdate must be used within an UpdateProvider');
  }
  return context;
}
