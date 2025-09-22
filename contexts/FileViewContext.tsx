'use client';

import { createContext, useContext, useEffect, useState } from 'react';

type FileView = 'list' | 'grid';

interface FileViewContextType {
  fileView: FileView;
  setFileView: (view: FileView) => void;
}

const FileViewContext = createContext<FileViewContextType | undefined>(undefined);

export function FileViewProvider({ children }: { children: React.ReactNode }) {
  const [fileView, setFileView] = useState<FileView>('list');

  useEffect(() => {
    // Load file view preference from localStorage
    const savedView = localStorage.getItem('fileView') as FileView || 'list';
    setFileView(savedView);
  }, []);

  const handleSetFileView = (view: FileView) => {
    setFileView(view);
    localStorage.setItem('fileView', view);
  };

  return (
    <FileViewContext.Provider
      value={{
        fileView,
        setFileView: handleSetFileView,
      }}
    >
      {children}
    </FileViewContext.Provider>
  );
}

export function useFileView() {
  const context = useContext(FileViewContext);
  if (context === undefined) {
    throw new Error('useFileView must be used within a FileViewProvider');
  }
  return context;
}
