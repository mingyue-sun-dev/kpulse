'use client';

import { useEffect, useState, lazy, Suspense } from 'react';
import { useParams } from 'next/navigation';
import Header from '@/components/ui/Header';
import Footer from '@/components/ui/Footer';
import ArtistImage from '@/components/artist/ArtistImage';
import { useArtist } from '@/context/ArtistContext';
import { Artist } from '@/types/artist';
import { formatNumber } from '@/utils/formatters';

// Lazy load heavy modules for better performance
const TopSongsModule = lazy(() => import('@/modules/TopSongsModule'));
const LatestAlbumModule = lazy(() => import('@/modules/LatestAlbumModule'));
const LatestNewsModule = lazy(() => import('@/modules/LatestNewsModule'));
const RelatedArtistsModule = lazy(() => import('@/modules/RelatedArtistsModule'));
const MusicVideoModule = lazy(() => import('@/modules/MusicVideoModule'));
import FavoriteButton from '@/components/artist/FavoriteButton';
import FollowButton from '@/components/artist/FollowButton';

// Loading fallback for lazy modules
function ModuleLoadingFallback() {
  return (
    <div className="bg-white rounded-lg shadow-md p-6 animate-pulse">
      <div className="h-6 bg-gray-200 rounded mb-4 w-1/3"></div>
      <div className="space-y-3">
        <div className="h-4 bg-gray-200 rounded"></div>
        <div className="h-4 bg-gray-200 rounded w-3/4"></div>
        <div className="h-4 bg-gray-200 rounded w-1/2"></div>
      </div>
    </div>
  );
}

export default function ArtistDashboard() {
  const params = useParams();
  const { getArtistById, selectArtist } = useArtist();
  const [artist, setArtist] = useState<Artist | null>(null);
  const [loading, setLoading] = useState(true);
  const [isLoadingRef, setIsLoadingRef] = useState(false);

  useEffect(() => {
    const loadArtist = async () => {
      if (params.id && typeof params.id === 'string' && !isLoadingRef) {
        setIsLoadingRef(true);
        setLoading(true);
        try {
          console.log(`Loading artist: ${params.id}`);
          const foundArtist = await getArtistById(params.id);
          if (foundArtist) {
            setArtist(foundArtist);
            await selectArtist(params.id);
          }
        } catch (error) {
          console.error('Error loading artist:', error);
        } finally {
          setLoading(false);
          setIsLoadingRef(false);
        }
      }
    };

    loadArtist();
  }, [params.id]); // Only depend on params.id to avoid infinite loop

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-pink-50 via-purple-50 to-blue-50">
        <Header />
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-16">
          <div className="text-center">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-pink-500 mx-auto"></div>
            <p className="mt-4 text-gray-600">Loading artist data...</p>
          </div>
        </div>
        <Footer />
      </div>
    );
  }

  if (!artist) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-pink-50 via-purple-50 to-blue-50">
        <Header />
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-16">
          <div className="text-center">
            <h1 className="text-2xl font-bold text-gray-900 mb-4">Artist Not Found</h1>
            <p className="text-gray-600">The artist you&apos;re looking for doesn&apos;t exist in our database.</p>
          </div>
        </div>
        <Footer />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-pink-50 via-purple-50 to-blue-50">
      <Header />

      {/* Artist Header Section */}
      <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-16">
        <div className="bg-white rounded-2xl shadow-lg p-8">
          <div className="flex flex-col md:flex-row items-center md:items-start space-y-6 md:space-y-0 md:space-x-8">
            <ArtistImage 
              artistId={artist.id}
              artistName={artist.name}
              size="xl"
              showName={true}
            />
            
            <div className="flex-1 text-center md:text-left">
              <div className="flex flex-col md:flex-row md:items-start md:justify-between gap-4 mb-4">
                <div className="flex items-center justify-center md:justify-start gap-4">
                  <h1 className="text-4xl md:text-5xl font-bold text-gray-900">{artist.name}</h1>
                  <div className="flex items-center gap-2">
                    <FavoriteButton
                      artistId={artist.id}
                      artistName={artist.name}
                      className="transform transition-transform hover:scale-110"
                    />
                    <FollowButton
                      artistId={artist.id}
                      artistName={artist.name}
                      size="md"
                      variant="default"
                    />
                  </div>
                </div>
                <div className="flex gap-3 justify-center md:justify-end">
                  <div className="bg-gradient-to-br from-pink-100 to-purple-100 p-3 rounded-xl text-center min-w-[120px]">
                    <div className="text-lg font-bold text-pink-600">{formatNumber(artist.followers)}</div>
                    <div className="text-xs text-gray-600">Spotify Followers</div>
                  </div>
                  <div className="bg-gradient-to-br from-blue-100 to-teal-100 p-3 rounded-xl text-center min-w-[120px]">
                    <div className="text-lg font-bold text-blue-600">{artist.popularity || 'N/A'}</div>
                    <div className="text-xs text-gray-600">Popularity Score</div>
                  </div>
                </div>
              </div>
              {artist.bio && (
                <p className="text-lg text-gray-600 mb-6 leading-relaxed">{artist.bio}</p>
              )}
            </div>
          </div>
        </div>
      </section>

      {/* Dashboard Grid */}
      <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pb-16">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <Suspense fallback={<ModuleLoadingFallback />}>
            <TopSongsModule artist={artist} />
          </Suspense>
          <Suspense fallback={<ModuleLoadingFallback />}>
            <LatestNewsModule artist={artist} />
          </Suspense>
          <Suspense fallback={<ModuleLoadingFallback />}>
            <LatestAlbumModule artist={artist} />
          </Suspense>
          <Suspense fallback={<ModuleLoadingFallback />}>
            <MusicVideoModule artistId={artist.id} artistName={artist.name} />
          </Suspense>
          <Suspense fallback={<ModuleLoadingFallback />}>
            <RelatedArtistsModule artist={artist} />
          </Suspense>
        </div>
      </section>

      <Footer />

    </div>
  );
}