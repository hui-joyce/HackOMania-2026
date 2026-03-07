/**
 * Convert a resident name to an image filename
 * Example: "Richard Lee" -> "/richard-lee.png"
 * @param name The resident's full name
 * @returns The image path
 */
export function getResidentImagePath(name: string): string {
  if (!name) return '/default-avatar.png';
  
  // Convert name to lowercase and replace spaces with hyphens
  const imageName = name.toLowerCase().replace(/\s+/g, '-');
  return `/${imageName}.png`;
}

/**
 * Get a fallback image path (can be used as placeholder)
 * @returns The default avatar image path
 */
export function getDefaultAvatarPath(): string {
  return '/default-avatar.png';
}