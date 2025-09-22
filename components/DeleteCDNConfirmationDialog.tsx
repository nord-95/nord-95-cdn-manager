'use client';

import React, { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { AlertTriangle, Trash2, Cloud } from 'lucide-react';

interface DeleteCDNConfirmationDialogProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: () => void;
  cdnName: string;
  isDeleting?: boolean;
}

export function DeleteCDNConfirmationDialog({
  isOpen,
  onClose,
  onConfirm,
  cdnName,
  isDeleting = false
}: DeleteCDNConfirmationDialogProps) {
  const [confirmationText, setConfirmationText] = useState('');

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
            Delete CDN
          </DialogTitle>
          <DialogDescription>
            This will remove the CDN from the CDN Manager. The Cloudflare R2 bucket and files will remain unchanged.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          {/* Important Notice */}
          <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg p-3">
            <div className="flex items-start gap-2">
              <Cloud className="h-4 w-4 text-blue-600 dark:text-blue-400 mt-0.5" />
              <div>
                <p className="text-sm font-medium text-blue-800 dark:text-blue-200">
                  Important Notice
                </p>
                <p className="text-sm text-blue-700 dark:text-blue-300 mt-1">
                  This action only removes the CDN from the CDN Manager. Your Cloudflare R2 bucket and all files will remain intact and accessible.
                </p>
              </div>
            </div>
          </div>

          {/* CDN Info */}
          <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg p-3">
            <div className="flex items-center gap-2">
              <Trash2 className="h-4 w-4 text-red-600 dark:text-red-400" />
              <span className="text-sm font-medium text-red-800 dark:text-red-200">
                CDN to be removed:
              </span>
            </div>
            <p className="text-sm text-red-700 dark:text-red-300 mt-1 font-medium">
              {cdnName}
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
                  Removing...
                </>
              ) : (
                <>
                  <Trash2 className="h-4 w-4" />
                  Remove CDN
                </>
              )}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
