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

  // Get the last seen version from localStorage
  const getLastSeenVersion = useCallback(() => {
    if (typeof window === 'undefined') return null;
    return localStorage.getItem('lastSeenVersion');
  }, []);

  // Update the last seen version in localStorage
  const updateLastSeenVersion = useCallback((version: string) => {
    if (typeof window === 'undefined') return;
    localStorage.setItem('lastSeenVersion', version);
  }, []);

  const checkForUpdates = useCallback(async () => {
    setIsCheckingForUpdates(true);
    try {
      const lastSeenVersion = getLastSeenVersion();
      
      const response = await authenticatedFetch('/api/updates/check', {
        headers: {
          'x-last-seen-version': lastSeenVersion || ''
        }
      });
      const data = await response.json();
      
      setUpdateInfo(data);
      
      if (data.hasUpdate) {
        toast({
          title: "Update Available",
          description: data.message,
          action: (
            <button
              onClick={() => {
                // Update the last seen version before refreshing
                updateLastSeenVersion(data.currentVersion);
                window.location.reload();
              }}
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
  }, [toast, getLastSeenVersion, updateLastSeenVersion]);

  const refreshApp = useCallback(() => {
    // Update the last seen version before refreshing
    if (updateInfo?.currentVersion) {
      updateLastSeenVersion(updateInfo.currentVersion);
    }
    
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
  }, [updateInfo, updateLastSeenVersion]);

  const dismissUpdate = useCallback(() => {
    // When dismissing an update, mark the current version as seen
    if (updateInfo?.currentVersion) {
      updateLastSeenVersion(updateInfo.currentVersion);
    }
    setUpdateInfo(null);
  }, [updateInfo, updateLastSeenVersion]);

  // Check for updates on app start (but not in development)
  useEffect(() => {
    if (process.env.NODE_ENV === 'production') {
      // Only check for updates if we haven't checked in this session
      const hasCheckedThisSession = sessionStorage.getItem('updateCheckedThisSession');
      
      if (!hasCheckedThisSession) {
        // Check for updates after a short delay to let the app load
        const timer = setTimeout(() => {
          checkForUpdates();
          // Mark that we've checked for updates in this session
          sessionStorage.setItem('updateCheckedThisSession', 'true');
        }, 5000);
        
        return () => clearTimeout(timer);
      }
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
