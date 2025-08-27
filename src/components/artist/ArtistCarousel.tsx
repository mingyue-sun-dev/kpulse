'use client';

import { useState, useRef, useEffect } from 'react';
import Card from '@/components/ui/Card';
import ArtistImage from '@/components/artist/ArtistImage';
import FavoriteButton from '@/components/artist/FavoriteButton';
import FollowButton from '@/components/artist/FollowButton';
import Link from 'next/link';

interface TrendingArtistData {
  id: string;
  name: string;
  followers: string;
  popularity?: number;
  loading: boolean;
}

interface ArtistCarouselProps {
  artists: TrendingArtistData[];
  loading?: boolean;
  error?: string | null;
}

// Simple arrow icons as SVG components
const ChevronLeftIcon = ({ className }: { className?: string }) => (
  <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
  </svg>
);

const ChevronRightIcon = ({ className }: { className?: string }) => (
  <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
  </svg>
);

export default function ArtistCarousel({ artists, loading = false, error = null }: ArtistCarouselProps) {
  const [currentSlide, setCurrentSlide] = useState(0);
  const [cardsPerView, setCardsPerView] = useState(4);
  const carouselRef = useRef<HTMLDivElement>(null);

  // Responsive cards per view
  useEffect(() => {
    const updateCardsPerView = () => {
      const width = window.innerWidth;
      if (width < 640) {
        setCardsPerView(1); // mobile
      } else if (width < 1024) {
        setCardsPerView(2); // tablet
      } else if (width < 1280) {
        setCardsPerView(3); // laptop
      } else {
        setCardsPerView(4); // desktop
      }
    };

    updateCardsPerView();
    window.addEventListener('resize', updateCardsPerView);
    return () => window.removeEventListener('resize', updateCardsPerView);
  }, []);

  const totalSlides = Math.max(0, artists.length - cardsPerView + 1);
  const canScrollLeft = totalSlides > 1; // Always true when there are slides to scroll
  const canScrollRight = totalSlides > 1; // Always true when there are slides to scroll

  const scrollToSlide = (slideIndex: number) => {
    let newIndex = slideIndex;
    
    // Handle looping
    if (slideIndex < 0) {
      newIndex = totalSlides - 1; // Go to last slide
    } else if (slideIndex >= totalSlides) {
      newIndex = 0; // Go to first slide
    }
    
    setCurrentSlide(newIndex);
    
    if (carouselRef.current) {
      const cardWidth = carouselRef.current.scrollWidth / artists.length;
      carouselRef.current.scrollTo({
        left: cardWidth * newIndex,
        behavior: 'smooth'
      });
    }
  };

  const scrollLeft = () => scrollToSlide(currentSlide - 1);
  const scrollRight = () => scrollToSlide(currentSlide + 1);

  // Keyboard navigation
  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'ArrowLeft') {
        event.preventDefault();
        scrollLeft();
      } else if (event.key === 'ArrowRight') {
        event.preventDefault();
        scrollRight();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [scrollLeft, scrollRight]);


  if (loading) {
    return (
      <div className="relative">
        <div className="flex gap-6 overflow-hidden">
          {[...Array(cardsPerView)].map((_, index) => (
            <div key={index} className="flex-shrink-0" style={{ width: `calc((100% - ${(cardsPerView - 1) * 24}px) / ${cardsPerView})` }}>
              <Card className="text-center animate-pulse">
                <div className="w-24 h-24 bg-gray-200 rounded-full mx-auto mb-4"></div>
                <div className="h-5 bg-gray-200 rounded mb-3"></div>
                <div className="grid grid-cols-2 gap-2 mb-4">
                  <div className="bg-gray-200 h-12 rounded"></div>
                  <div className="bg-gray-200 h-12 rounded"></div>
                </div>
                <div className="h-8 bg-gray-200 rounded"></div>
              </Card>
            </div>
          ))}
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="text-center py-12">
        <div className="text-red-500 mb-4">{error}</div>
        <div className="text-gray-500">Showing fallback artists</div>
      </div>
    );
  }

  if (artists.length === 0) {
    return (
      <div className="text-center py-12">
        <div className="text-gray-500">No trending artists available</div>
      </div>
    );
  }

  return (
    <div className="relative">
      {/* Navigation buttons */}
      {totalSlides > 1 && (
        <>
          <button
            onClick={scrollLeft}
            disabled={!canScrollLeft}
            className={`absolute left-0 top-1/2 -translate-y-1/2 z-10 w-10 h-10 rounded-full bg-white shadow-lg border border-gray-200 flex items-center justify-center transition-all ${
              canScrollLeft 
                ? 'hover:bg-gray-50 hover:shadow-xl text-gray-700' 
                : 'text-gray-300 cursor-not-allowed'
            }`}
            aria-label="Previous artists"
          >
            <ChevronLeftIcon className="w-5 h-5" />
          </button>
          
          <button
            onClick={scrollRight}
            disabled={!canScrollRight}
            className={`absolute right-0 top-1/2 -translate-y-1/2 z-10 w-10 h-10 rounded-full bg-white shadow-lg border border-gray-200 flex items-center justify-center transition-all ${
              canScrollRight 
                ? 'hover:bg-gray-50 hover:shadow-xl text-gray-700' 
                : 'text-gray-300 cursor-not-allowed'
            }`}
            aria-label="Next artists"
          >
            <ChevronRightIcon className="w-5 h-5" />
          </button>
        </>
      )}

      {/* Artist cards carousel */}
      <div 
        ref={carouselRef}
        className="flex gap-6 overflow-x-auto scroll-smooth scrollbar-hide px-12"
        style={{ scrollbarWidth: 'none', msOverflowStyle: 'none' }}
        onScroll={(e) => {
          // Update current slide based on scroll position for touch devices
          if (carouselRef.current) {
            const scrollLeft = e.currentTarget.scrollLeft;
            const cardWidth = e.currentTarget.scrollWidth / artists.length;
            const newSlide = Math.round(scrollLeft / cardWidth);
            setCurrentSlide(Math.max(0, Math.min(newSlide, totalSlides - 1)));
          }
        }}
      >
        {artists.map((artist) => (
          <div 
            key={artist.id} 
            className="flex-shrink-0"
            style={{ width: `calc((100% - ${(cardsPerView - 1) * 24}px) / ${cardsPerView})` }}
          >
            <Card className="text-center relative overflow-hidden h-full">
              {/* Heart button positioned absolutely over the card */}
              <div className="absolute top-4 right-4 z-10">
                <FavoriteButton
                  artistId={artist.id}
                  artistName={artist.name}
                  className="transform hover:scale-110 transition-all"
                />
              </div>
              
              <Link href={`/artist/${artist.id}`} className="block cursor-pointer">
                <div className="relative">
                  <div className="mx-auto mb-4 relative">
                    <ArtistImage 
                      artistId={artist.id}
                      artistName={artist.name}
                      size="lg"
                    />
                  </div>
                  <h3 className="text-lg font-semibold text-gray-900 mb-3 line-clamp-2">{artist.name}</h3>
                  
                  <div className="grid grid-cols-2 gap-2 text-xs mb-4">
                    <div className="bg-gradient-to-r from-pink-50 to-purple-50 p-2 rounded">
                      <div className="font-medium text-gray-900">
                        {artist.loading ? '...' : parseInt(artist.followers || '0').toLocaleString()}
                      </div>
                      <div className="text-gray-600">Spotify Followers</div>
                    </div>
                    <div className="bg-gradient-to-r from-blue-50 to-teal-50 p-2 rounded">
                      <div className="font-medium text-gray-900">
                        {artist.loading ? '...' : artist.popularity || 'N/A'}
                      </div>
                      <div className="text-gray-600">Popularity</div>
                    </div>
                  </div>
                </div>
              </Link>
              
              {/* Follow button positioned at the bottom */}
              <div className="mt-3 px-2">
                <FollowButton
                  artistId={artist.id}
                  artistName={artist.name}
                  size="sm"
                  variant="default"
                  className="w-full"
                />
              </div>
            </Card>
          </div>
        ))}
      </div>

      {/* Dots indicator */}
      {totalSlides > 1 && (
        <div className="flex justify-center mt-6 space-x-2">
          {Array.from({ length: totalSlides }, (_, index) => (
            <button
              key={index}
              onClick={() => scrollToSlide(index)}
              className={`w-2 h-2 rounded-full transition-all ${
                index === currentSlide 
                  ? 'bg-purple-600 w-4' 
                  : 'bg-gray-300 hover:bg-gray-400'
              }`}
              aria-label={`Go to slide ${index + 1}`}
            />
          ))}
        </div>
      )}
    </div>
  );
}