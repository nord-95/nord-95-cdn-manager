/**
 * Resolve tokens in upload prefix string
 * Supported tokens: {label}, {YYYY}, {MM}, {DD}
 */
export function resolvePrefixTokens(
  prefix: string, 
  label: string, 
  date: Date = new Date()
): string {
  const year = date.getFullYear().toString();
  const month = (date.getMonth() + 1).toString().padStart(2, '0');
  const day = date.getDate().toString().padStart(2, '0');

  return prefix
    .replace(/{label}/g, label)
    .replace(/{YYYY}/g, year)
    .replace(/{MM}/g, month)
    .replace(/{DD}/g, day);
}

/**
 * Build a complete file key from prefix, sanitized filename, and random suffix
 */
export function buildFileKey(
  prefix: string,
  filename: string,
  suffix: string
): string {
  const sanitizedFilename = sanitizeFilename(filename);
  
  // Ensure prefix doesn't start with slash
  const cleanPrefix = prefix.replace(/^\/+/, '');
  
  // Ensure prefix ends with slash
  const normalizedPrefix = cleanPrefix.endsWith('/') ? cleanPrefix : cleanPrefix + '/';
  
  // Build the key: prefix + sanitized-filename-suffix
  const key = normalizedPrefix + sanitizedFilename.replace(/\.([^.]+)$/, `-${suffix}.$1`);
  
  // Ensure key doesn't exceed 1024 characters
  if (key.length > 1024) {
    const extension = getFileExtension(sanitizedFilename);
    const baseName = sanitizedFilename.replace(/\.([^.]+)$/, '');
    const maxBaseLength = 1024 - normalizedPrefix.length - suffix.length - extension.length - 2; // -2 for dots
    
    const truncatedBase = baseName.substring(0, Math.max(1, maxBaseLength));
    return normalizedPrefix + truncatedBase + '-' + suffix + '.' + extension;
  }
  
  return key;
}

// Re-export sanitizeFilename for convenience
import { sanitizeFilename, getFileExtension } from './sanitize';
export { sanitizeFilename, getFileExtension };
