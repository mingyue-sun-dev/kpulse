// API utility exports
export { spotifyService } from './spotify';
export { lastFmService } from './lastfm';
export { youtubeService } from './youtube';
export { newsService } from './news';

// Common API error handling utilities
export interface ApiError {
  message: string;
  code?: string;
  status?: number;
}

export interface ApiResponse<T> {
  success: boolean;
  data?: T;
  error?: ApiError;
}

export function createApiError(message: string, code?: string, status?: number): ApiError {
  return { message, code: code ?? '', status: status ?? 500 };
}

export function createApiResponse<T>(data: T): ApiResponse<T> {
  return { success: true, data };
}

export function createApiErrorResponse<T>(error: ApiError): ApiResponse<T> {
  return { success: false, error };
}

// Simple error type check
export function isApiError(error: any): error is ApiError {
  return error && typeof error === 'object' && 'message' in error;
}