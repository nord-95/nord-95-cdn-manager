/**
 * Utility functions for file previews in grid view
 */

export interface FilePreviewInfo {
  type: 'image' | 'video' | 'audio' | 'document' | 'other';
  extension: string;
  mimeType?: string;
}

/**
 * Get file type and extension from filename
 */
export function getFileType(filename: string): FilePreviewInfo {
  const extension = filename.split('.').pop()?.toLowerCase() || '';
  
  const imageTypes = ['jpg', 'jpeg', 'png', 'gif', 'webp', 'svg', 'bmp', 'ico'];
  const videoTypes = ['mp4', 'webm', 'ogg', 'avi', 'mov', 'wmv', 'flv', 'mkv'];
  const audioTypes = ['mp3', 'wav', 'ogg', 'aac', 'flac', 'm4a', 'wma'];
  const documentTypes = ['pdf', 'doc', 'docx', 'txt', 'rtf', 'odt'];
  
  if (imageTypes.includes(extension)) {
    return { type: 'image', extension, mimeType: `image/${extension}` };
  }
  if (videoTypes.includes(extension)) {
    return { type: 'video', extension, mimeType: `video/${extension}` };
  }
  if (audioTypes.includes(extension)) {
    return { type: 'audio', extension, mimeType: `audio/${extension}` };
  }
  if (documentTypes.includes(extension)) {
    return { type: 'document', extension };
  }
  
  return { type: 'other', extension };
}

/**
 * Generate a thumbnail URL for images with size parameters
 */
export function generateImageThumbnailUrl(baseUrl: string, width: number = 200): string {
  // For Cloudflare R2, we can add resize parameters
  // This is a simple approach - you might want to use Cloudflare Image Resizing service
  return `${baseUrl}?width=${width}&quality=80`;
}

/**
 * Format file size for display
 */
export function formatFileSize(bytes: number): string {
  if (bytes === 0) return '0 Bytes';
  const k = 1024;
  const sizes = ['Bytes', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(1)) + ' ' + sizes[i];
}
