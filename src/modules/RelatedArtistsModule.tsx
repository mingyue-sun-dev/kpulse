import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import ArtistModule from '@/components/artist/ArtistModule';
import ArtistImage from '@/components/artist/ArtistImage';
import { Artist } from '@/types/artist';

interface RelatedArtist {
  id: string;
  name: string;
  image: string;
  source: string;
}

export default function RelatedArtistsModule({ artist }: { artist: Artist | null }) {
  const [relatedArtists, setRelatedArtists] = useState<RelatedArtist[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const router = useRouter();

  useEffect(() => {
    const fetchRelatedArtists = async () => {
      if (!artist?.id) return;

      setLoading(true);
      setError(null);

      try {
        const response = await fetch(`/api/artists/${encodeURIComponent(artist.id)}/related`);
        const result = await response.json();

        if (!response.ok) {
          setError(result.error || 'Failed to load related artists');
          return;
        }

        setRelatedArtists(result.data);
      } catch (err) {
        console.error('Error fetching related artists:', err);
        setError('Failed to load related artists');
      } finally {
        setLoading(false);
      }
    };

    fetchRelatedArtists();
  }, [artist?.id]);

  const handleArtistClick = (artistId: string) => {
    router.push(`/artist/${artistId}`);
  };

  if (!artist) return null;

  return (
    <ArtistModule title="Related Artists">
      {loading ? (
        <div className="flex items-center justify-center py-8">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-pink-500"></div>
          <span className="ml-3 text-gray-600">Loading related artists...</span>
        </div>
      ) : error ? (
        <div className="text-center py-8">
          <div className="text-red-500 mb-2">😅</div>
          <p className="text-sm text-gray-600">{error}</p>
        </div>
      ) : relatedArtists.length === 0 ? (
        <div className="text-center py-8">
          <div className="text-gray-400 mb-2">🎭</div>
          <p className="text-sm text-gray-600">No related artists found</p>
        </div>
      ) : (
        <div className="grid grid-cols-2 gap-3">
          {relatedArtists.map((relatedArtist) => (
            <button
              key={relatedArtist.id}
              onClick={() => handleArtistClick(relatedArtist.id)}
              className="group bg-gradient-to-br from-purple-50 to-pink-50 rounded-xl p-3 text-left hover:from-purple-100 hover:to-pink-100 transition-all duration-200 border border-transparent hover:border-purple-200 focus:outline-none focus:ring-2 focus:ring-pink-300"
            >
              <div className="flex items-center space-x-3">
                <ArtistImage 
                  artistId={relatedArtist.id}
                  artistName={relatedArtist.name}
                  size="md"
                  className="flex-shrink-0"
                />
                <div className="flex-1 min-w-0">
                  <p className="font-medium text-gray-900 truncate group-hover:text-purple-700 transition-colors">
                    {relatedArtist.name}
                  </p>
                  <p className="text-xs text-gray-500 truncate capitalize">{relatedArtist.source} • Related Artist</p>
                </div>
                <div className="text-gray-400 group-hover:text-purple-500 transition-colors flex-shrink-0">
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                  </svg>
                </div>
              </div>
            </button>
          ))}
        </div>
      )}
      
    </ArtistModule>
  );
}