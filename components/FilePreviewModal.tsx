'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Download, ExternalLink, X, Play, Pause, Volume2, VolumeX } from 'lucide-react';
import { useToast } from '@/components/ui/use-toast';

interface FilePreviewModalProps {
  isOpen: boolean;
  onClose: () => void;
  file: {
    key: string;
    size: number;
    lastModified: string;
    url?: string;
  };
  cdnId: string;
}

export function FilePreviewModal({ isOpen, onClose, file, cdnId }: FilePreviewModalProps) {
  const [previewUrl, setPreviewUrl] = useState<string>('');
  const [isLoading, setIsLoading] = useState(false);
  const [isPlaying, setIsPlaying] = useState(false);
  const [isMuted, setIsMuted] = useState(false);
  const { toast } = useToast();

  const getFileType = (filename: string) => {
    const extension = filename.split('.').pop()?.toLowerCase();
    
    if (!extension) return 'unknown';
    
    const imageTypes = ['jpg', 'jpeg', 'png', 'gif', 'webp', 'svg', 'bmp', 'ico'];
    const videoTypes = ['mp4', 'webm', 'ogg', 'avi', 'mov', 'wmv', 'flv', 'mkv'];
    const audioTypes = ['mp3', 'wav', 'ogg', 'aac', 'flac', 'm4a', 'wma'];
    
    if (imageTypes.includes(extension)) return 'image';
    if (videoTypes.includes(extension)) return 'video';
    if (audioTypes.includes(extension)) return 'audio';
    
    return 'unknown';
  };

  const formatFileSize = (bytes: number) => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const generatePreviewUrl = useCallback(async () => {
    if (file.url) {
      setPreviewUrl(file.url);
      return;
    }

    setIsLoading(true);
    try {
      const response = await fetch(`/api/cdns/${cdnId}/files/sign-get`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ key: file.key }),
      });

      if (response.ok) {
        const data = await response.json();
        setPreviewUrl(data.url);
      } else {
        throw new Error('Failed to generate preview URL');
      }
    } catch (error) {
      console.error('Error generating preview URL:', error);
      toast({
        title: "Error",
        description: "Failed to generate preview URL",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  }, [file.url, file.key, cdnId, toast]);

  useEffect(() => {
    if (isOpen && file) {
      generatePreviewUrl();
    }
  }, [isOpen, file, generatePreviewUrl]);

  const handleDownload = async () => {
    if (!previewUrl) return;
    
    try {
      const link = document.createElement('a');
      link.href = previewUrl;
      link.download = file.key.split('/').pop() || 'download';
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
    } catch (error) {
      console.error('Error downloading file:', error);
      toast({
        title: "Error",
        description: "Failed to download file",
        variant: "destructive",
      });
    }
  };

  const handleOpenInNewTab = () => {
    if (previewUrl) {
      window.open(previewUrl, '_blank');
    }
  };

  const fileType = getFileType(file.key);
  const fileName = file.key.split('/').pop() || file.key;

  const renderPreview = () => {
    if (isLoading) {
      return (
        <div className="flex items-center justify-center h-96">
          <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-gray-900 dark:border-gray-100"></div>
        </div>
      );
    }

    if (!previewUrl) {
      return (
        <div className="flex items-center justify-center h-96 text-gray-500 dark:text-gray-400">
          <p>Preview not available</p>
        </div>
      );
    }

    switch (fileType) {
      case 'image':
        return (
          <div className="flex items-center justify-center">
            <img
              src={previewUrl}
              alt={fileName}
              className="max-w-full max-h-96 object-contain rounded-lg shadow-lg"
              onError={() => {
                setPreviewUrl('');
                toast({
                  title: "Error",
                  description: "Failed to load image preview",
                  variant: "destructive",
                });
              }}
            />
          </div>
        );

      case 'video':
        return (
          <div className="flex items-center justify-center">
            <video
              src={previewUrl}
              controls
              className="max-w-full max-h-96 rounded-lg shadow-lg"
              onPlay={() => setIsPlaying(true)}
              onPause={() => setIsPlaying(false)}
              onError={() => {
                setPreviewUrl('');
                toast({
                  title: "Error",
                  description: "Failed to load video preview",
                  variant: "destructive",
                });
              }}
            >
              Your browser does not support the video tag.
            </video>
          </div>
        );

      case 'audio':
        return (
          <div className="flex flex-col items-center justify-center h-96 space-y-4">
            <div className="w-32 h-32 bg-blue-100 dark:bg-blue-900 rounded-full flex items-center justify-center">
              {isPlaying ? (
                <Pause className="h-16 w-16 text-blue-600 dark:text-blue-400" />
              ) : (
                <Play className="h-16 w-16 text-blue-600 dark:text-blue-400" />
              )}
            </div>
            <audio
              src={previewUrl}
              controls
              className="w-full max-w-md"
              onPlay={() => setIsPlaying(true)}
              onPause={() => setIsPlaying(false)}
              onError={() => {
                setPreviewUrl('');
                toast({
                  title: "Error",
                  description: "Failed to load audio preview",
                  variant: "destructive",
                });
              }}
            >
              Your browser does not support the audio tag.
            </audio>
          </div>
        );

      default:
        return (
          <div className="flex flex-col items-center justify-center h-96 text-gray-500 dark:text-gray-400">
            <div className="text-6xl mb-4">📄</div>
            <p className="text-lg font-medium">{fileName}</p>
            <p className="text-sm">Preview not available for this file type</p>
          </div>
        );
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center justify-between">
            <div className="flex items-center space-x-2">
              <span>{fileName}</span>
              <Badge variant="secondary">
                {fileType.toUpperCase()}
              </Badge>
            </div>
            <Button variant="ghost" size="icon" onClick={onClose}>
              <X className="h-4 w-4" />
            </Button>
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          {/* Preview */}
          <div className="bg-gray-50 dark:bg-gray-800 rounded-lg p-4">
            {renderPreview()}
          </div>

          {/* File Info */}
          <div className="grid grid-cols-2 gap-4 text-sm">
            <div>
              <span className="font-medium text-gray-700 dark:text-gray-300">Size:</span>
              <span className="ml-2 text-gray-600 dark:text-gray-400">
                {formatFileSize(file.size)}
              </span>
            </div>
            <div>
              <span className="font-medium text-gray-700 dark:text-gray-300">Modified:</span>
              <span className="ml-2 text-gray-600 dark:text-gray-400">
                {formatDate(file.lastModified)}
              </span>
            </div>
          </div>

          {/* Actions */}
          <div className="flex space-x-2">
            <Button onClick={handleDownload} className="flex items-center space-x-2">
              <Download className="h-4 w-4" />
              <span>Download</span>
            </Button>
            <Button variant="outline" onClick={handleOpenInNewTab} className="flex items-center space-x-2">
              <ExternalLink className="h-4 w-4" />
              <span>Open in New Tab</span>
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
