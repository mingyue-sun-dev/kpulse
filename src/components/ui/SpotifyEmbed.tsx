'use client';

import { useState } from 'react';

interface SpotifyEmbedProps {
  trackId?: string | undefined;
  artistName: string;
  songTitle: string;
  className?: string;
}

export default function SpotifyEmbed({ trackId, artistName, songTitle, className = '' }: SpotifyEmbedProps) {
  const [isLoading, setIsLoading] = useState(true);
  const [hasError, setHasError] = useState(false);

  if (!trackId) {
    return (
      <div className={`bg-gray-100 rounded-lg p-3 ${className}`}>
        <div className="flex items-center space-x-2">
          <div className="w-8 h-8 bg-gray-300 rounded flex items-center justify-center">
            <svg className="w-4 h-4 text-gray-500" fill="currentColor" viewBox="0 0 24 24">
              <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-2 14.5v-9l6 4.5-6 4.5z"/>
            </svg>
          </div>
          <div className="text-sm text-gray-600">
            Preview not available
          </div>
        </div>
      </div>
    );
  }

  const handleLoad = () => {
    setIsLoading(false);
    setHasError(false);
  };

  const handleError = () => {
    setIsLoading(false);
    setHasError(true);
  };

  if (hasError) {
    return (
      <div className={`bg-gray-100 rounded-lg p-3 ${className}`}>
        <div className="flex items-center space-x-2">
          <div className="w-8 h-8 bg-gray-300 rounded flex items-center justify-center">
            <svg className="w-4 h-4 text-gray-500" fill="currentColor" viewBox="0 0 24 24">
              <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-2 14.5v-9l6 4.5-6 4.5z"/>
            </svg>
          </div>
          <div className="text-sm text-gray-600">
            Preview unavailable
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className={`relative ${className}`}>
      {isLoading && (
        <div className="bg-gray-100 rounded-lg p-3 animate-pulse">
          <div className="flex items-center space-x-2">
            <div className="w-8 h-8 bg-gray-300 rounded"></div>
            <div className="h-4 bg-gray-300 rounded flex-1"></div>
          </div>
        </div>
      )}
      
      <iframe
        src={`https://open.spotify.com/embed/track/${trackId}?utm_source=generator&theme=0`}
        width="100%"
        height="80"
        frameBorder="0"
        allow="autoplay; clipboard-write; encrypted-media; fullscreen; picture-in-picture"
        loading="lazy"
        title={`${songTitle} by ${artistName}`}
        onLoad={handleLoad}
        onError={handleError}
        className={`rounded-lg ${isLoading ? 'opacity-0' : 'opacity-100'} transition-opacity duration-300`}
      />
    </div>
  );
}