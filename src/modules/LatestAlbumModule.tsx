'use client';

import { useState, useEffect } from 'react';
import ArtistModule from '@/components/artist/ArtistModule';
import SpotifyAlbumEmbed from '@/components/ui/SpotifyAlbumEmbed';
import { Artist } from '@/types/artist';

interface LatestAlbum {
  id: string;
  title: string;
  releaseDate: string;
  totalTracks: number;
  image?: string;
  spotifyUrl?: string;
  spotifyId?: string;
}

export default function LatestAlbumModule({ artist }: { artist: Artist | null }) {
  const [latestAlbum, setLatestAlbum] = useState<LatestAlbum | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!artist) return;

    const fetchLatestAlbum = async () => {
      setIsLoading(true);
      setError(null);
      
      try {
        const artistId = artist.name.toLowerCase().replace(/\s+/g, '-');
        const response = await fetch(`/api/artists/${artistId}/latest-album`);
        
        if (!response.ok) {
          throw new Error('Failed to fetch latest album');
        }
        
        const data = await response.json();
        setLatestAlbum(data.data);
      } catch (err) {
        console.error('Error fetching latest album:', err);
        setError('Failed to load latest album');
      } finally {
        setIsLoading(false);
      }
    };

    fetchLatestAlbum();
  }, [artist]);

  if (!artist) return null;

  // Show loading state
  if (isLoading) {
    return (
      <ArtistModule title="Latest Album">
        <div className="animate-pulse">
          <div className="h-64 bg-gray-200 rounded-lg"></div>
        </div>
      </ArtistModule>
    );
  }

  // Show empty state if no album found
  if (!latestAlbum) {
    return (
      <ArtistModule title="Latest Album">
        <div className="text-center py-8">
          <div className="text-gray-400 mb-2">💿</div>
          <p className="text-sm text-gray-600">
            {error ? error : 'No recent albums found on Spotify'}
          </p>
        </div>
      </ArtistModule>
    );
  }


  return (
    <ArtistModule title="Latest Album">
      <SpotifyAlbumEmbed 
        albumId={latestAlbum.spotifyId}
        artistName={artist.name}
        albumTitle={latestAlbum.title}
      />
    </ArtistModule>
  );
}