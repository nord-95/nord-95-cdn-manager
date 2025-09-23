'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { Tag, X, Plus } from 'lucide-react';
import { authenticatedFetch } from '@/lib/api';
import { useToast } from '@/components/ui/use-toast';

interface FileTagManagerProps {
  isOpen: boolean;
  onClose: () => void;
  file: {
    key: string;
    size: number;
    lastModified: string;
  };
  cdnId: string;
}

export function FileTagManager({ isOpen, onClose, file, cdnId }: FileTagManagerProps) {
  const [tags, setTags] = useState<string[]>([]);
  const [newTag, setNewTag] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const { toast } = useToast();

  const loadTags = useCallback(async () => {
    setIsLoading(true);
    try {
      const response = await authenticatedFetch(`/api/cdns/${cdnId}/files/${encodeURIComponent(file.key)}/tags`);
      if (response.ok) {
        const data = await response.json();
        setTags(data.tags || []);
      } else {
        const errorData = await response.json();
        console.error('Error loading tags:', errorData);
        // Don't show error toast for loading tags, just log it
      }
    } catch (error) {
      console.error('Error loading tags:', error);
    } finally {
      setIsLoading(false);
    }
  }, [cdnId, file.key]);

  // Load existing tags
  useEffect(() => {
    if (isOpen && file) {
      loadTags();
    }
  }, [isOpen, file, loadTags]);

  const addTag = () => {
    if (newTag.trim() && !tags.includes(newTag.trim())) {
      setTags([...tags, newTag.trim()]);
      setNewTag('');
    }
  };

  const removeTag = (tagToRemove: string) => {
    setTags(tags.filter(tag => tag !== tagToRemove));
  };

  const saveTags = async () => {
    setIsSaving(true);
    try {
      const url = `/api/cdns/${cdnId}/files/${encodeURIComponent(file.key)}/tags`;
      const requestBody = { tags };
      
      console.log('FileTagManager - Saving tags:', {
        url,
        cdnId,
        fileKey: file.key,
        encodedKey: encodeURIComponent(file.key),
        tags,
        requestBody
      });
      
      const response = await authenticatedFetch(url, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(requestBody),
      });
      
      console.log('FileTagManager - Response status:', response.status);
      console.log('FileTagManager - Response ok:', response.ok);

      if (response.ok) {
        toast({
          title: "Success",
          description: "File tags updated successfully",
        });
        onClose();
      } else {
        const errorData = await response.json();
        console.error('API Error:', errorData);
        throw new Error(errorData.error || 'Failed to save tags');
      }
    } catch (error) {
      console.error('FileTagManager - Error saving tags:', error);
      toast({
        title: "Error",
        description: error instanceof Error ? error.message : "Failed to update file tags",
        variant: "destructive",
      });
    } finally {
      setIsSaving(false);
    }
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      addTag();
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Tag className="h-5 w-5" />
            Manage Tags
          </DialogTitle>
          <DialogDescription>
            Add tags to help organize and find this file: {file.key.split('/').pop()}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          {/* Current Tags */}
          <div>
            <label className="text-sm font-medium">Current Tags</label>
            <div className="flex flex-wrap gap-2 mt-2">
              {isLoading ? (
                <div className="text-sm text-gray-500">Loading tags...</div>
              ) : tags.length === 0 ? (
                <div className="text-sm text-gray-500">No tags added yet</div>
              ) : (
                tags.map((tag) => (
                  <Badge key={tag} variant="secondary" className="flex items-center gap-1">
                    {tag}
                    <button
                      onClick={() => removeTag(tag)}
                      className="ml-1 hover:text-red-500"
                    >
                      <X className="h-3 w-3" />
                    </button>
                  </Badge>
                ))
              )}
            </div>
          </div>

          {/* Add New Tag */}
          <div>
            <label className="text-sm font-medium">Add New Tag</label>
            <div className="flex gap-2 mt-2">
              <Input
                value={newTag}
                onChange={(e) => setNewTag(e.target.value)}
                onKeyPress={handleKeyPress}
                placeholder="Enter tag name"
                className="flex-1"
              />
              <Button onClick={addTag} size="sm" variant="outline">
                <Plus className="h-4 w-4" />
              </Button>
            </div>
          </div>
        </div>

        <div className="flex justify-end gap-2">
          <Button variant="outline" onClick={onClose} disabled={isSaving}>
            Cancel
          </Button>
          <Button onClick={saveTags} disabled={isSaving}>
            {isSaving ? 'Saving...' : 'Save Tags'}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
