/**
 * Redirect URL Utility
 * 
 * Automatically handles redirect URLs for both localhost and production environments.
 * Works seamlessly so you can develop locally while users use production.
 * 
 * Environment Variables (optional in .env):
 * - VITE_APP_URL: Override the app URL (default: auto-detected from window.location)
 * - VITE_PRODUCTION_URL: Set production URL explicitly
 */

/**
 * Get the current app URL based on environment
 * Automatically detects localhost vs production
 * 
 * Priority:
 * 1. VITE_APP_URL environment variable (if set)
 * 2. window.location.origin (auto-detected from browser)
 * 3. Fallback to localhost
 */
export function getAppUrl(): string {
  // Check if explicit URL is set in environment (useful for testing)
  if (import.meta.env.VITE_APP_URL) {
    return import.meta.env.VITE_APP_URL;
  }

  // Auto-detect from browser - this will be localhost when running locally
  if (typeof window !== 'undefined') {
    const origin = window.location.origin;
    // Log for debugging (remove in production if needed)
    if (import.meta.env.DEV) {
      console.log('[Redirect] Detected origin:', origin);
    }
    return origin;
  }

  // Fallback (shouldn't happen in browser context)
  return 'http://localhost:8080';
}

/**
 * Check if we're in production environment
 */
export function isProduction(): boolean {
  const url = getAppUrl();
  return !url.includes('localhost') && !url.includes('127.0.0.1');
}

/**
 * Get redirect URL for authentication callbacks
 * Automatically uses the correct URL for the current environment
 * 
 * @param path - Optional path to append (default: '/')
 * @returns Full URL for redirect
 */
export function getAuthRedirectUrl(path: string = '/'): string {
  const baseUrl = getAppUrl();
  // Ensure path starts with /
  const cleanPath = path.startsWith('/') ? path : `/${path}`;
  return `${baseUrl}${cleanPath}`;
}

/**
 * Get callback URL for OAuth providers (Google, etc.)
 * Same as getAuthRedirectUrl but with explicit callback path
 */
export function getOAuthCallbackUrl(): string {
  return getAuthRedirectUrl('/');
}

/**
 * Get email redirect URL for email verification links
 */
export function getEmailRedirectUrl(path: string = '/'): string {
  return getAuthRedirectUrl(path);
}

/**
 * Get password reset redirect URL
 */
export function getPasswordResetRedirectUrl(): string {
  return getAuthRedirectUrl('/auth/reset-password');
}

/**
 * Debug helper - get current redirect configuration
 */
export function getRedirectConfig() {
  return {
    appUrl: getAppUrl(),
    isProduction: isProduction(),
    authRedirectUrl: getAuthRedirectUrl(),
    oauthCallbackUrl: getOAuthCallbackUrl(),
    emailRedirectUrl: getEmailRedirectUrl(),
    passwordResetUrl: getPasswordResetRedirectUrl(),
  };
}
