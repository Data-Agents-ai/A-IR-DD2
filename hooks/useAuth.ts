/**
 * @file hooks/useAuth.ts
 * @description Authentication hook (re-export from context)
 * @domain Design Domain - Authentication
 *
 * PURPOSE: Provide a clean public API for auth hook
 * Allows future migration to different auth state management (Redux, Zustand)
 */

export { useAuth } from '../contexts/AuthContext';
