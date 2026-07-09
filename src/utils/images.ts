export function optimizeCloudinaryUrl(url: string | null | undefined, width?: number): string {
  if (!url) return '';
  if (!url.includes('res.cloudinary.com')) return url;
  const transform = `f_auto,q_auto${width ? ',w_' + width : ''}`;
  return url.replace('/upload/', `/upload/${transform}/`);
}
