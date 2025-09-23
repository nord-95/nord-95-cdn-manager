'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { Button } from '@/components/ui/button';
import { Play, Pause, Volume2, FileText, Image, Video, Music } from 'lucide-react';
import { getFileType, formatFileSize } from '@/utils/filePreview';
import { authenticatedFetch } from '@/lib/api';

interface FileGridPreviewProps {
  file: {
    key: string;
    size: number;
    lastModified: string;
  };
  cdnId: string;
  onPreview?: () => void;
}

export function FileGridPreview({ file, cdnId, onPreview }: FileGridPreviewProps) {
  const [previewUrl, setPreviewUrl] = useState<string>('');
  const [isLoading, setIsLoading] = useState(false);
  const [isPlaying, setIsPlaying] = useState(false);
  const fileInfo = getFileType(file.key);
  const fileName = file.key.split('/').pop() || file.key;

  const generatePreviewUrl = useCallback(async () => {
    if (fileInfo.type !== 'image') return;
    
    setIsLoading(true);
    try {
      const response = await authenticatedFetch(`/api/cdns/${cdnId}/files/sign-get`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ key: file.key }),
      });

      if (response.ok) {
        const data = await response.json();
        // Use the signed URL directly - Cloudflare R2 doesn't support query parameters for resizing
        console.log('Generated preview URL for', file.key, ':', data.signedUrl);
        setPreviewUrl(data.signedUrl);
      }
    } catch (error) {
      console.error('Error generating preview URL:', error);
    } finally {
      setIsLoading(false);
    }
  }, [file.key, cdnId, fileInfo.type]);

  useEffect(() => {
    if (fileInfo.type === 'image') {
      generatePreviewUrl();
    }
  }, [fileInfo.type, generatePreviewUrl]);

  const handlePlayClick = () => {
    if (onPreview) {
      onPreview();
    }
  };

  const renderPreview = () => {
    switch (fileInfo.type) {
      case 'image':
        if (isLoading) {
          return (
            <div className="w-full h-32 bg-gray-100 dark:bg-gray-800 rounded-lg flex items-center justify-center">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-gray-600"></div>
            </div>
          );
        }
        
        if (previewUrl) {
          return (
            <div className="w-full h-32 bg-gray-100 dark:bg-gray-800 rounded-lg overflow-hidden">
              <img
                src={previewUrl}
                alt={fileName}
                className="w-full h-full object-cover hover:scale-105 transition-transform duration-200"
                onLoad={() => {
                  console.log('Image loaded successfully:', fileName);
                }}
                onError={(e) => {
                  console.error('Image failed to load:', fileName, previewUrl, e);
                  setPreviewUrl('');
                }}
              />
            </div>
          );
        }
        
        return (
          <div className="w-full h-32 bg-gray-100 dark:bg-gray-800 rounded-lg flex items-center justify-center">
            <Image className="h-8 w-8 text-gray-400" />
          </div>
        );

      case 'audio':
        return (
          <div className="w-full h-32 bg-gradient-to-br from-purple-100 to-pink-100 dark:from-purple-900 dark:to-pink-900 rounded-lg flex flex-col items-center justify-center space-y-2">
            <Music className="h-8 w-8 text-purple-600 dark:text-purple-400" />
            <div className="text-center">
              <p className="text-sm font-medium text-purple-800 dark:text-purple-200">
                {fileInfo.extension.toUpperCase()}
              </p>
              <Button
                variant="ghost"
                size="sm"
                onClick={handlePlayClick}
                className="mt-1 h-8 w-8 p-0"
              >
                <Play className="h-4 w-4" />
              </Button>
            </div>
          </div>
        );

      case 'video':
        return (
          <div className="w-full h-32 bg-gradient-to-br from-blue-100 to-cyan-100 dark:from-blue-900 dark:to-cyan-900 rounded-lg flex flex-col items-center justify-center space-y-2">
            <Video className="h-8 w-8 text-blue-600 dark:text-blue-400" />
            <div className="text-center">
              <p className="text-sm font-medium text-blue-800 dark:text-blue-200">
                {fileInfo.extension.toUpperCase()}
              </p>
              <Button
                variant="ghost"
                size="sm"
                onClick={handlePlayClick}
                className="mt-1 h-8 w-8 p-0"
              >
                <Play className="h-4 w-4" />
              </Button>
            </div>
          </div>
        );

      case 'document':
        return (
          <div className="w-full h-32 bg-gradient-to-br from-green-100 to-emerald-100 dark:from-green-900 dark:to-emerald-900 rounded-lg flex flex-col items-center justify-center space-y-2">
            <FileText className="h-8 w-8 text-green-600 dark:text-green-400" />
            <p className="text-sm font-medium text-green-800 dark:text-green-200">
              {fileInfo.extension.toUpperCase()}
            </p>
          </div>
        );

      default:
        return (
          <div className="w-full h-32 bg-gray-100 dark:bg-gray-800 rounded-lg flex flex-col items-center justify-center space-y-2">
            <FileText className="h-8 w-8 text-gray-400" />
            <p className="text-sm font-medium text-gray-600 dark:text-gray-400">
              {fileInfo.extension.toUpperCase() || 'FILE'}
            </p>
          </div>
        );
    }
  };

  return (
    <div className="space-y-2">
      {renderPreview()}
      <div className="text-center">
        <p className="text-xs text-gray-500 dark:text-gray-400 truncate" title={fileName}>
          {fileName}
        </p>
        <p className="text-xs text-gray-400 dark:text-gray-500">
          {formatFileSize(file.size)}
        </p>
      </div>
    </div>
  );
}
