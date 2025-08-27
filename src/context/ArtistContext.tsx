'use client';

import { createContext, useContext, useState, ReactNode } from 'react';
import { Artist } from '@/types/artist';
import { artistCache, searchCache } from '@/lib/cache/client-cache';

interface ArtistContextType {
  selectedArtist: Artist | null;
  searchQuery: string;
  loading: boolean;
  error: string | null;
  setSearchQuery: (query: string) => void;
  searchArtists: (query: string) => Promise<Artist[]>;
  getArtistById: (id: string) => Promise<Artist | null>;
  selectArtist: (artistId: string) => Promise<Artist | null>;
  clearSelectedArtist: () => void;
  searchLiveArtists: (query: string) => Promise<Artist[]>;
}

const ArtistContext = createContext<ArtistContextType | undefined>(undefined);

export function ArtistProvider({ children }: { children: ReactNode }) {
  const [selectedArtist, setSelectedArtist] = useState<Artist | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);


  // Fallback search (returns empty - live API search is primary)
  const searchArtists = async (query: string): Promise<Artist[]> => {
    if (!query.trim()) return [];
    return []; // Live API search is now primary method
  };

  // Search using live Last.fm API via Next.js API routes with caching
  const searchLiveArtists = async (query: string): Promise<Artist[]> => {
    if (!query.trim()) return [];
    
    const cacheKey = `search:${query.toLowerCase().trim()}`;
    
    // Check cache first
    const cachedResults = searchCache.get<Artist[]>(cacheKey);
    if (cachedResults) {
      console.log(`Cache hit for search: ${query}`);
      return cachedResults;
    }
    
    setLoading(true);
    setError(null);
    
    try {
      console.log(`Fetching search results from API: ${query}`);
      const response = await fetch(`/api/artists/search?q=${encodeURIComponent(query)}&limit=10`);
      const result = await response.json();
      
      if (!response.ok) {
        console.warn('Search API failed:', result.error);
        
        // Check if it's a rate limit error (429 or message content)
        if (response.status === 429 || (result.error && result.error.includes('Rate Limit'))) {
          const resetTime = result.rateLimitInfo?.resetIn ? ` (${result.rateLimitInfo.resetIn}s)` : '';
          setError(`Rate limit exceeded. Please wait${resetTime} and try again.`);
        } else {
          setError(result.error || 'Search failed');
        }
        
        // Fallback to placeholder data
        return searchArtists(query);
      }
      
      // Cache successful results
      searchCache.set(cacheKey, result.data);
      return result.data;
    } catch (err) {
      console.error('Search error:', err);
      setError('Search failed');
      // Fallback to placeholder data
      return searchArtists(query);
    } finally {
      setLoading(false);
    }
  };

  const getArtistById = async (id: string): Promise<Artist | null> => {
    const cacheKey = `artist:${id.toLowerCase()}`;
    
    // Check cache first
    const cachedArtist = artistCache.get<Artist>(cacheKey);
    if (cachedArtist) {
      console.log(`Cache hit for artist: ${id}`);
      return cachedArtist;
    }
    
    // Fetch from API if not cached
    setLoading(true);
    setError(null);
    
    try {
      console.log(`Fetching artist data from API: ${id}`);
      const response = await fetch(`/api/artists/${encodeURIComponent(id)}`);
      const result = await response.json();
      
      if (!response.ok) {
        console.warn('Artist API failed:', result.error);
        
        // Check if it's a rate limit error (429 or message content)
        if (response.status === 429 || (result.error && result.error.includes('Rate Limit'))) {
          const resetTime = result.rateLimitInfo?.resetIn ? ` (${result.rateLimitInfo.resetIn}s)` : '';
          setError(`Rate limit exceeded. Please wait${resetTime} and try again.`);
        } else {
          setError(result.error || 'Failed to fetch artist data');
        }
        return null;
      }
      
      // Cache successful results
      artistCache.set(cacheKey, result.data);
      return result.data;
    } catch (err) {
      console.error('Artist fetch error:', err);
      setError('Failed to fetch artist data');
      return null;
    } finally {
      setLoading(false);
    }
  };

  const selectArtist = async (artistId: string): Promise<Artist | null> => {
    const artist = await getArtistById(artistId);
    setSelectedArtist(artist);
    return artist;
  };

  const clearSelectedArtist = () => {
    setSelectedArtist(null);
    setError(null);
  };

  const value = {
    selectedArtist,
    searchQuery,
    loading,
    error,
    setSearchQuery,
    searchArtists,
    getArtistById,
    selectArtist,
    clearSelectedArtist,
    searchLiveArtists
  };

  return (
    <ArtistContext.Provider value={value}>
      {children}
    </ArtistContext.Provider>
  );
}

export function useArtist(): ArtistContextType {
  const context = useContext(ArtistContext);
  if (!context) {
    throw new Error('useArtist must be used within an ArtistProvider');
  }
  return context;
}