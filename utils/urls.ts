export function buildPublicUrl(publicBase: string, key: string, prefix?: string): string {
  const cleanPrefix = prefix?.replace(/\/$/, '') || '';
  const cleanKey = key.replace(/^\//, '');
  
  const fullKey = cleanPrefix ? `${cleanPrefix}/${cleanKey}` : cleanKey;
  const cleanPublicBase = publicBase.replace(/\/$/, '');
  
  return `${cleanPublicBase}/${fullKey}`;
}

export function buildCdnUrl(customDomain: string | null | undefined, publicBase: string, key: string, prefix?: string): string {
  const cleanPrefix = prefix?.replace(/\/$/, '') || '';
  const cleanKey = key.replace(/^\//, '');
  
  const fullKey = cleanPrefix ? `${cleanPrefix}/${cleanKey}` : cleanKey;
  
  // Use custom domain if available, otherwise fall back to public base
  const baseUrl = customDomain ? customDomain.replace(/\/$/, '') : publicBase.replace(/\/$/, '');
  
  return `${baseUrl}/${fullKey}`;
}

export function copyToClipboard(text: string): Promise<void> {
  if (navigator.clipboard && window.isSecureContext) {
    return navigator.clipboard.writeText(text);
  } else {
    // Fallback for older browsers
    const textArea = document.createElement('textarea');
    textArea.value = text;
    textArea.style.position = 'fixed';
    textArea.style.left = '-999999px';
    textArea.style.top = '-999999px';
    document.body.appendChild(textArea);
    textArea.focus();
    textArea.select();
    return new Promise((resolve, reject) => {
      document.execCommand('copy') ? resolve() : reject();
      textArea.remove();
    });
  }
}
