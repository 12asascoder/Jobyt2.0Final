/**
 * Normalizes a URL by ensuring it starts with http:// or https://.
 * If the URL is empty or invalid, it returns null.
 */
export const normalizeUrl = (url?: string | null): string | null => {
  if (!url) return null;
  const trimmed = url.trim();
  if (trimmed === '') return null;
  
  // If it already starts with http:// or https://, return it as is
  if (/^https?:\/\//i.test(trimmed)) {
    return trimmed;
  }
  
  // Otherwise, prepend https://
  return `https://${trimmed}`;
};
