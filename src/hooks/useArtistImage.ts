import { useState, useEffect } from 'react';

interface ArtistImageData {
  image: string | null;
  source: 'spotify' | 'fallback';
  cached?: boolean;
  error?: string;
}

interface UseArtistImageResult {
  imageUrl: string | null;
  loading: boolean;
  error: string | null;
  source: 'spotify' | 'fallback';
}

export function useArtistImage(artistId: string | null): UseArtistImageResult {
  const [imageData, setImageData] = useState<ArtistImageData>({ image: null, source: 'fallback' });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!artistId) {
      setImageData({ image: null, source: 'fallback' });
      setLoading(false);
      setError(null);
      return;
    }

    const fetchArtistImage = async () => {
      setLoading(true);
      setError(null);

      try {
        const response = await fetch(`/api/artists/${encodeURIComponent(artistId)}/image`);
        const result = await response.json();

        if (!response.ok) {
          // If API fails, use fallback
          setImageData({ image: null, source: 'fallback' });
          setError(result.error || 'Failed to load artist image');
          return;
        }

        setImageData(result.data);
      } catch (err) {
        console.error('Error fetching artist image:', err);
        setImageData({ image: null, source: 'fallback' });
        setError('Network error while loading artist image');
      } finally {
        setLoading(false);
      }
    };

    fetchArtistImage();
  }, [artistId]);

  return {
    imageUrl: imageData.image,
    loading,
    error,
    source: imageData.source
  };
}