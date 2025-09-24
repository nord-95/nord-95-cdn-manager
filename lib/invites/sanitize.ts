/**
 * Sanitize filename for safe storage
 * - Normalize unicode
 * - Remove control characters
 * - Replace spaces with hyphens
 * - Allow only safe characters: [a-zA-Z0-9/_ .-]
 * - Collapse repeated characters
 * - Trim to 200 chars base (preserve extension)
 */
export function sanitizeFilename(filename: string): string {
  if (!filename || typeof filename !== 'string') {
    return 'file';
  }

  // Normalize unicode and remove control characters
  let sanitized = filename
    .normalize('NFD')
    .replace(/[\u0000-\u001F\u007F-\u009F]/g, '')
    .trim();

  // Replace spaces with hyphens
  sanitized = sanitized.replace(/\s+/g, '-');

  // Keep only safe characters: letters, numbers, underscore, forward slash, dot, hyphen
  sanitized = sanitized.replace(/[^a-zA-Z0-9/_ .-]/g, '');

  // Collapse repeated characters
  sanitized = sanitized.replace(/-+/g, '-');
  sanitized = sanitized.replace(/\.+/g, '.');
  sanitized = sanitized.replace(/_+/g, '_');

  // Remove leading/trailing dots and hyphens
  sanitized = sanitized.replace(/^[-.]+|[-.]+$/g, '');

  // Split into name and extension
  const lastDotIndex = sanitized.lastIndexOf('.');
  let name = sanitized;
  let extension = '';

  if (lastDotIndex > 0 && lastDotIndex < sanitized.length - 1) {
    name = sanitized.substring(0, lastDotIndex);
    extension = sanitized.substring(lastDotIndex);
  }

  // Trim name to 200 chars max (extension preserved)
  if (name.length > 200) {
    name = name.substring(0, 200);
  }

  // Ensure we have something
  if (!name) {
    name = 'file';
  }

  return name + extension;
}

/**
 * Extract file extension from filename (without leading dot)
 */
export function getFileExtension(filename: string): string {
  if (!filename || typeof filename !== 'string') {
    return '';
  }

  const lastDotIndex = filename.lastIndexOf('.');
  if (lastDotIndex > 0 && lastDotIndex < filename.length - 1) {
    return filename.substring(lastDotIndex + 1).toLowerCase();
  }

  return '';
}

/**
 * Validate file extension against allowed list
 */
export function validateFileExtension(
  filename: string, 
  allowedExtensions: string[]
): boolean {
  const extension = getFileExtension(filename);
  return allowedExtensions.includes(extension);
}

/**
 * Validate MIME type against allowed list
 */
export function validateMimeType(
  contentType: string,
  allowedMimeTypes: string[]
): boolean {
  return allowedMimeTypes.includes(contentType);
}

/**
 * Validate file size against maximum
 */
export function validateFileSize(size: number, maxSizeBytes: number): boolean {
  return size > 0 && size <= maxSizeBytes;
}
