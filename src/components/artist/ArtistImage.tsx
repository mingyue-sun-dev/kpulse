'use client';

import { useArtistImage } from '@/hooks/useArtistImage';
import { useState } from 'react';

interface ArtistImageProps {
  artistId: string;
  artistName: string;
  size?: 'sm' | 'md' | 'lg' | 'xl';
  className?: string;
  showName?: boolean;
}

const sizeClasses = {
  sm: 'w-10 h-10 text-sm',
  md: 'w-12 h-12 text-sm', 
  lg: 'w-32 h-32 text-3xl',
  xl: 'w-48 h-48 text-6xl'
};

export default function ArtistImage({ 
  artistId, 
  artistName, 
  size = 'md', 
  className = '',
  showName = false 
}: ArtistImageProps) {
  const { imageUrl, loading, source } = useArtistImage(artistId);
  const [imageError, setImageError] = useState(false);
  
  const shouldShowGradient = !imageUrl || imageError || source === 'fallback';
  const sizeClass = sizeClasses[size];
  
  const handleImageError = () => {
    setImageError(true);
  };

  if (shouldShowGradient) {
    // Show gradient fallback
    const isRounded = size === 'sm' || size === 'md';
    const roundingClass = isRounded ? 'rounded-full' : 'rounded-2xl';
    
    return (
      <div className={`${sizeClass} bg-gradient-to-br from-pink-400 via-purple-500 to-blue-500 ${roundingClass} flex items-center justify-center shadow-lg ${className}`}>
        {showName && size === 'xl' ? (
          <div className="text-center text-white">
            <div className="font-bold mb-2">
              {artistName.charAt(0).toUpperCase()}
            </div>
            <div className="text-sm opacity-80 px-4">
              {artistName}
            </div>
          </div>
        ) : (
          <span className="text-white font-bold">
            {artistName.charAt(0).toUpperCase()}
          </span>
        )}
      </div>
    );
  }

  // Show Spotify image
  const isRounded = size === 'sm' || size === 'md';
  const roundingClass = isRounded ? 'rounded-full' : 'rounded-2xl';
  
  return (
    <div className={`${sizeClass} relative ${className}`}>
      <img
        src={imageUrl!}
        alt={artistName}
        className={`w-full h-full ${roundingClass} object-cover shadow-lg`}
        onError={handleImageError}
        loading="lazy"
      />
      {/* Fallback gradient (hidden until image error) */}
      {imageError && (
        <div className={`absolute inset-0 ${sizeClass} bg-gradient-to-br from-pink-400 via-purple-500 to-blue-500 ${roundingClass} flex items-center justify-center shadow-lg`}>
          {showName && size === 'xl' ? (
            <div className="text-center text-white">
              <div className="font-bold mb-2">
                {artistName.charAt(0).toUpperCase()}
              </div>
              <div className="text-sm opacity-80 px-4">
                {artistName}
              </div>
            </div>
          ) : (
            <span className="text-white font-bold">
              {artistName.charAt(0).toUpperCase()}
            </span>
          )}
        </div>
      )}
      
      {/* Loading indicator */}
      {loading && (
        <div className={`absolute inset-0 ${roundingClass} bg-gray-200 flex items-center justify-center`}>
          <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-purple-500"></div>
        </div>
      )}
    </div>
  );
}