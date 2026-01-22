/**
 * Avatar Utility - DiceBear Integration
 * 
 * Priority System:
 * 1. User's uploaded avatar from Supabase storage bucket (permanent, for existing users)
 * 2. DiceBear generated avatar (temporary fallback, only for new users without uploaded avatars)
 * 
 * Works seamlessly in both production and localhost environments.
 * 
 * Optional Environment Variables (in .env):
 * - VITE_DICEBEAR_BASE_URL: Override DiceBear API URL (default: https://api.dicebear.com/9.x)
 * - VITE_DICEBEAR_STYLE: Set default avatar style (default: 'toon-head')
 *   Options: 'toon-head', 'avataaars', 'personas'
 * 
 * Behavior:
 * - Existing users with uploaded avatars: Always use their uploaded avatar (preserved)
 * - New users without avatars: Get temporary DiceBear avatar until they upload one
 * - Same user gets same DiceBear avatar across all environments (consistent seed)
 */
const AVATAR_CONFIG = {
  // DiceBear API base URL (works in all environments)
  dicebearBaseUrl: import.meta.env.VITE_DICEBEAR_BASE_URL || 'https://api.dicebear.com/9.x',
  // Default style (can be overridden via env var)
  defaultStyle: (import.meta.env.VITE_DICEBEAR_STYLE || 'toon-head') as 'toon-head' | 'avataaars' | 'personas',
  // Available styles
  styles: ['toon-head', 'avataaars', 'personas'] as const,
};

/**
 * Check if we're in production or development
 */
function isProduction(): boolean {
  return import.meta.env.PROD || window.location.hostname !== 'localhost';
}

/**
 * Generate a DiceBear avatar URL for a user
 * Uses user details as seed to generate consistent avatars
 * Works in both production and localhost environments
 */
export function getDiceBearAvatar(
  seed?: string | null, 
  style: 'toon-head' | 'avataaars' | 'personas' = AVATAR_CONFIG.defaultStyle
): string {
  // Use the seed or fallback to a random string
  const avatarSeed = seed || Math.random().toString(36).substring(7);
  
  // DiceBear API works in both environments, but we can add environment-specific logic if needed
  const baseUrl = AVATAR_CONFIG.dicebearBaseUrl;
  
  return `${baseUrl}/${style}/svg?seed=${encodeURIComponent(avatarSeed)}`;
}

/**
 * Get avatar URL - returns user's uploaded avatar if exists, otherwise generates DiceBear avatar
 * 
 * Priority:
 * 1. User's uploaded avatar from Supabase storage bucket (if exists)
 * 2. DiceBear generated avatar (temporary fallback for new users without uploaded avatars)
 * 
 * Handles both production and localhost environments
 */
export function getAvatarUrl(
  avatarUrl: string | null | undefined,
  seed?: string | null,
  style: 'toon-head' | 'avataaars' | 'personas' = AVATAR_CONFIG.defaultStyle
): string | null {
  // PRIORITY 1: If user has uploaded avatar to Supabase storage bucket, always use it
  // This preserves existing users' uploaded avatars
  if (avatarUrl && avatarUrl.trim() !== '') {
    // Ensure the URL is absolute (handles both localhost and production Supabase URLs)
    if (avatarUrl.startsWith('http://') || avatarUrl.startsWith('https://')) {
      return avatarUrl;
    }
    // If relative URL from Supabase storage, it's already valid
    return avatarUrl;
  }
  
  // PRIORITY 2: Generate DiceBear avatar as temporary fallback
  // Only used for new users who haven't uploaded an avatar yet
  return getDiceBearAvatar(seed, style);
}

/**
 * Generate seed from user details (name, email, or id)
 * Creates consistent avatars across environments
 */
export function generateAvatarSeed(
  name?: string | null,
  email?: string | null,
  id?: string | null
): string {
  // Prefer name, then email, then id for consistent avatars
  // This ensures the same user gets the same avatar in both dev and production
  const seed = name || email || id;
  
  if (seed) {
    // Normalize the seed to ensure consistency
    return seed.trim().toLowerCase();
  }
  
  // Fallback to random (shouldn't happen in normal usage)
  return Math.random().toString(36).substring(7);
}

/**
 * Get environment info (for debugging)
 */
export function getAvatarConfig() {
  return {
    ...AVATAR_CONFIG,
    environment: isProduction() ? 'production' : 'development',
    hostname: typeof window !== 'undefined' ? window.location.hostname : 'unknown',
  };
}
