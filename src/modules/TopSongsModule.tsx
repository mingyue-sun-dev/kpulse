'use client';

import { useState, useEffect } from 'react';
import { Artist } from "@/types/artist";
import ArtistModule from '@/components/artist/ArtistModule';
import SpotifyEmbed from '@/components/ui/SpotifyEmbed';

interface SpotifyTrack {
  spotifyId?: string | null;
}

export default function TopSongsModule({ artist }: { artist: Artist | null }) {
  const [spotifyTracks, setSpotifyTracks] = useState<SpotifyTrack[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!artist) return;

    const fetchSpotifyTracks = async () => {
      setIsLoading(true);
      setError(null);
      
      try {
        const artistId = artist.name.toLowerCase().replace(/\s+/g, '-');
        const response = await fetch(`/api/artists/${artistId}/spotify-tracks`);
        
        if (!response.ok) {
          throw new Error('Failed to fetch Spotify tracks');
        }
        
        const data = await response.json();
        setSpotifyTracks(data.data || []);
      } catch (err) {
        console.error('Error fetching Spotify tracks:', err);
        setError('Failed to load Spotify tracks');
        setSpotifyTracks([]);
      } finally {
        setIsLoading(false);
      }
    };

    fetchSpotifyTracks();
  }, [artist]);

  if (!artist) return null;

  // Show loading state
  if (isLoading) {
    return (
      <ArtistModule title="Top Songs">
        <div className="space-y-4">
          {[...Array(5)].map((_, index) => (
            <div key={index} className="animate-pulse">
              <div className="flex items-start p-2 mb-2">
                <div className="w-8 h-8 bg-gray-300 rounded-lg mr-4 mt-1"></div>
                <div className="h-20 bg-gray-200 rounded-lg flex-1"></div>
              </div>
            </div>
          ))}
        </div>
      </ArtistModule>
    );
  }

  // Use Spotify tracks only
  const tracksToShow = spotifyTracks;

  return (
    <ArtistModule title="Top Songs">
      <div className="space-y-4">
        {tracksToShow.map((song, index) => (
          <div key={index} className="flex items-start space-x-4">
            {/* Order Number */}
            <div className="w-8 h-8 bg-gradient-to-br from-blue-400 to-teal-500 rounded-lg flex items-center justify-center flex-shrink-0 mt-1">
              <span className="text-white text-sm font-bold">{index + 1}</span>
            </div>
            
            {/* Spotify Embed */}
            <div className="flex-1">
              <SpotifyEmbed 
                trackId={song.spotifyId || undefined}
                artistName={artist.name}
                songTitle={`Track ${index + 1}`}
              />
            </div>
          </div>
        ))}
        
        {error && (
          <div className="text-center text-red-600 bg-red-50 p-3 rounded-lg text-sm">
            {error}
          </div>
        )}
        
        {!isLoading && tracksToShow.length === 0 && !error && (
          <div className="text-center text-gray-500 p-8">
            <p className="font-medium mb-2">No top tracks available</p>
            <p className="text-sm">Unable to find top tracks for this artist on Spotify</p>
          </div>
        )}
      </div>
    </ArtistModule>
  );
}