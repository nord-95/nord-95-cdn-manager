'use client';

import React, { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { AlertTriangle, Trash2 } from 'lucide-react';

interface DeleteConfirmationDialogProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: () => void;
  fileName: string;
  isDeleting?: boolean;
}

export function DeleteConfirmationDialog({
  isOpen,
  onClose,
  onConfirm,
  fileName,
  isDeleting = false
}: DeleteConfirmationDialogProps) {
  const [confirmationText, setConfirmationText] = useState('');
  
  console.log('DeleteConfirmationDialog rendered with:', { isOpen, fileName });

  const handleConfirm = () => {
    if (confirmationText === 'DELETE') {
      onConfirm();
    }
  };

  const handleClose = () => {
    setConfirmationText('');
    onClose();
  };

  const isConfirmDisabled = confirmationText !== 'DELETE' || isDeleting;

  return (
    <Dialog open={isOpen} onOpenChange={handleClose}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-red-600 dark:text-red-400">
            <AlertTriangle className="h-5 w-5" />
            Delete File
          </DialogTitle>
          <DialogDescription>
            This action cannot be undone. This will permanently delete the file.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          {/* File Info */}
          <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg p-3">
            <div className="flex items-center gap-2">
              <Trash2 className="h-4 w-4 text-red-600 dark:text-red-400" />
              <span className="text-sm font-medium text-red-800 dark:text-red-200">
                File to be deleted:
              </span>
            </div>
            <p className="text-sm text-red-700 dark:text-red-300 mt-1 font-mono break-all">
              {fileName}
            </p>
          </div>

          {/* Confirmation Input */}
          <div className="space-y-2">
            <Label htmlFor="confirmation">
              Type <span className="font-bold text-red-600 dark:text-red-400">DELETE</span> to confirm:
            </Label>
            <Input
              id="confirmation"
              type="text"
              placeholder="Type DELETE here"
              value={confirmationText}
              onChange={(e) => setConfirmationText(e.target.value)}
              className="font-mono"
              autoComplete="off"
              disabled={isDeleting}
            />
          </div>

          {/* Actions */}
          <div className="flex justify-end space-x-2">
            <Button
              variant="outline"
              onClick={handleClose}
              disabled={isDeleting}
            >
              Cancel
            </Button>
            <Button
              variant="destructive"
              onClick={handleConfirm}
              disabled={isConfirmDisabled}
              className="flex items-center gap-2"
            >
              {isDeleting ? (
                <>
                  <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                  Deleting...
                </>
              ) : (
                <>
                  <Trash2 className="h-4 w-4" />
                  Delete File
                </>
              )}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
