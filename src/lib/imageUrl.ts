/**
 * Image URL resolver
 * Supports R2 custom domain, relative paths, data URLs, and object URLs.
 */
const BASE = (import.meta.env.VITE_IMAGE_BASE as string | undefined) ?? '/images/';

export const imageUrl = (name: string): string => {
  if (!name) return '';
  if (
    name.startsWith('data:') ||
    name.startsWith('blob:') ||
    name.startsWith('http://') ||
    name.startsWith('https://')
  ) {
    return name;
  }
  return BASE + name;
};
