'use client';

import { useState, useRef, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useArtist } from '@/context/ArtistContext';
import ArtistImage from '@/components/artist/ArtistImage';

interface SearchBarProps {
  placeholder?: string;
}

export default function SearchBar({ placeholder = "Search for K-Pop artists..." }: SearchBarProps) {
  const [query, setQuery] = useState('');
  const [showResults, setShowResults] = useState(false);
  const { searchArtists, searchLiveArtists, loading: _loading } = useArtist();
  const router = useRouter();

  const [results, setResults] = useState<any[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const searchRef = useRef<HTMLDivElement>(null);

  const handleSearch = async (searchQuery: string) => {
    setQuery(searchQuery);
    setShowResults(searchQuery.length > 0);
    
    if (searchQuery.length > 2) {
      setIsSearching(true);
      try {
        // Try live search first, fallback to placeholder data
        const liveResults = await searchLiveArtists(searchQuery);
        setResults(liveResults);
      } catch (error) {
        console.error('Search failed:', error);
        // Fallback to placeholder search
        const fallbackResults = await searchArtists(searchQuery);
        setResults(fallbackResults);
      } finally {
        setIsSearching(false);
      }
    } else {
      setResults([]);
    }
  };

  const handleArtistSelect = (artistId: string) => {
    router.push(`/artist/${artistId}`);
    setQuery('');
    setShowResults(false);
    setResults([]);
  };

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (searchRef.current && !searchRef.current.contains(event.target as Node)) {
        setShowResults(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, []);

  return (
    <div ref={searchRef} className="relative w-full max-w-md">
      <div className="relative">
        <input
          type="text"
          placeholder={placeholder}
          value={query}
          onChange={(e) => handleSearch(e.target.value)}
          className="w-full px-4 py-2 pl-10 pr-4 text-gray-700 bg-white border border-gray-200 rounded-full focus:outline-none focus:ring-2 focus:ring-pink-300 focus:border-transparent"
        />
        <div className="absolute inset-y-0 left-0 flex items-center pl-3">
          <svg className="w-5 h-5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
          </svg>
        </div>
      </div>

      {showResults && (
        <div className="absolute z-10 w-full mt-1 bg-white border border-gray-200 rounded-lg shadow-lg">
          {isSearching && (
            <div className="px-4 py-3 text-center text-gray-500">
              <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-pink-500 inline-block mr-2"></div>
              Searching...
            </div>
          )}
          
          {!isSearching && results.length === 0 && query.length > 2 && (
            <div className="px-4 py-3 text-center text-gray-500">
              No artists found for &quot;{query}&quot;
            </div>
          )}
          
          {!isSearching && results.length > 0 && results.map((artist) => (
            <button
              key={artist.id}
              onClick={() => handleArtistSelect(artist.id)}
              className="w-full px-4 py-3 text-left hover:bg-gray-50 focus:bg-gray-50 focus:outline-none first:rounded-t-lg last:rounded-b-lg"
            >
              <div className="flex items-center space-x-3">
                <ArtistImage 
                  artistId={artist.id}
                  artistName={artist.name}
                  size="sm"
                />
                <div>
                  <p className="font-medium text-gray-900">{artist.name}</p>
                  <p className="text-sm text-gray-500">
                    {artist.followers ? `${artist.followers.toLocaleString()} listeners` : `Debut: ${artist.debutYear || 'Unknown'}`}
                  </p>
                </div>
              </div>
            </button>
          ))}
        </div>
      )}
    </div>
  );
}