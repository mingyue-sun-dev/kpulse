"use client";

import { useState } from "react";

interface SpotifyAlbumEmbedProps {
  albumId?: string | undefined;
  artistName: string;
  albumTitle: string;
  className?: string;
}

export default function SpotifyAlbumEmbed({
  albumId,
  artistName,
  albumTitle,
  className = "",
}: SpotifyAlbumEmbedProps) {
  const [isLoading, setIsLoading] = useState(true);
  const [hasError, setHasError] = useState(false);

  if (!albumId) {
    return (
      <div className={`bg-gray-100 rounded-lg p-4 ${className}`}>
        <div className="flex items-center space-x-3">
          <div className="w-12 h-12 bg-gray-300 rounded flex items-center justify-center">
            <svg
              className="w-6 h-6 text-gray-500"
              fill="currentColor"
              viewBox="0 0 24 24"
            >
              <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm0 14.5c-2.49 0-4.5-2.01-4.5-4.5S9.51 7.5 12 7.5s4.5 2.01 4.5 4.5-2.01 4.5-4.5 4.5zm0-5.5c-.55 0-1 .45-1 1s.45 1 1 1 1-.45 1-1-.45-1-1-1z" />
            </svg>
          </div>
          <div className="flex-1">
            <div className="text-sm font-medium text-gray-700">
              Album Preview
            </div>
            <div className="text-xs text-gray-500">
              Not available on Spotify
            </div>
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
      <div className={`bg-gray-100 rounded-lg p-4 ${className}`}>
        <div className="flex items-center space-x-3">
          <div className="w-12 h-12 bg-gray-300 rounded flex items-center justify-center">
            <svg
              className="w-6 h-6 text-gray-500"
              fill="currentColor"
              viewBox="0 0 24 24"
            >
              <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm0 14.5c-2.49 0-4.5-2.01-4.5-4.5S9.51 7.5 12 7.5s4.5 2.01 4.5 4.5-2.01 4.5-4.5 4.5zm0-5.5c-.55 0-1 .45-1 1s.45 1 1 1 1-.45 1-1-.45-1-1-1z" />
            </svg>
          </div>
          <div className="flex-1">
            <div className="text-sm font-medium text-gray-700">
              Album Preview
            </div>
            <div className="text-xs text-gray-500">
              Unable to load from Spotify
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className={`relative ${className}`}>
      {isLoading && (
        <div className="bg-gray-100 rounded-lg p-4 animate-pulse">
          <div className="flex items-center space-x-3">
            <div className="w-12 h-12 bg-gray-300 rounded"></div>
            <div className="flex-1">
              <div className="h-4 bg-gray-300 rounded mb-2"></div>
              <div className="h-3 bg-gray-300 rounded w-2/3"></div>
            </div>
          </div>
        </div>
      )}

      <iframe
        src={`https://open.spotify.com/embed/album/${albumId}?utm_source=generator&theme=0`}
        width="100%"
        height="450"
        frameBorder="0"
        allow="autoplay; clipboard-write; encrypted-media; fullscreen; picture-in-picture"
        loading="lazy"
        title={`${albumTitle} by ${artistName}`}
        onLoad={handleLoad}
        onError={handleError}
        className={`rounded-lg ${
          isLoading ? "opacity-0" : "opacity-100"
        } transition-opacity duration-300`}
      />
    </div>
  );
}
