import { NextRequest, NextResponse } from 'next/server';
import { lastFmService } from '@/lib/api/lastfm';
import { artistService } from '@/lib/services/artistService';
import { youtubeService } from '@/lib/api/youtube';
import { apiCache } from '@/lib/cache/simple-cache';
import { rateLimiter } from '@/lib/rateLimiter';

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const limit = parseInt(searchParams.get('limit') || '4');

  // Check rate limit before proceeding
  const rateCheck = rateLimiter.checkLimit('trending-artists');
  if (!rateCheck.allowed) {
    console.warn(`Rate limit exceeded for trending-artists: ${rateCheck.message}`);
    return NextResponse.json({ 
      error: rateCheck.message || 'Rate limit exceeded',
      rateLimitInfo: {
        remaining: rateCheck.remaining,
        resetIn: rateCheck.resetIn
      }
    }, { status: 429 });
  }

  try {
    // Check cache first
    const cacheKey = `trending-kpop-artists:${limit}`;
    const cachedData = apiCache.get(cacheKey);
    if (cachedData) {
      console.log(`Cache hit for trending K-pop artists`);
      return NextResponse.json({ data: cachedData });
    }
    
    console.log(`Cache miss for trending K-pop artists, fetching from Last.fm API`);
    const result = await lastFmService.getTopKpopArtists(limit);

    if (!result.success) {
      return NextResponse.json({ error: result.error?.message || 'Failed to fetch trending artists' }, { status: 500 });
    }

    // Transform to the format expected by the homepage with Spotify data
    const trendingArtists = await Promise.all(result.data.map(async (artist) => {
      // Get Spotify data using our unified service
      const spotifyResult = await artistService.getArtistData(artist.name);
      
      if (spotifyResult.success && spotifyResult.data) {
        return {
          id: artist.name.toLowerCase().replace(/\s+/g, '-'),
          name: artist.name,
          followers: spotifyResult.data.followers.toString(),
          popularity: spotifyResult.data.popularity,
          loading: false
        };
      } else {
        // Fallback to Last.fm data if Spotify not available
        const detailResult = await lastFmService.getArtistInfo(artist.name);
        
        if (detailResult.success) {
          return {
            id: artist.name.toLowerCase().replace(/\s+/g, '-'),
            name: artist.name,
            followers: detailResult.data.stats?.listeners || '0',
            loading: false
          };
        } else {
          return {
            id: artist.name.toLowerCase().replace(/\s+/g, '-'),
            name: artist.name,
            followers: artist.stats?.listeners || '0',
            loading: false
          };
        }
      }
    }));

    // Cache the result for 10 minutes (K-pop trending changes less frequently)
    apiCache.set(cacheKey, trendingArtists, 600);

    // Pre-fetch YouTube videos for trending artists in background (non-blocking)
    if (trendingArtists.length > 0) {
      const artistNames = trendingArtists.map(artist => artist.name);
      setImmediate(() => {
        youtubeService.prefetchArtistVideos(artistNames).catch(error => {
          console.error('[YouTube] Pre-fetch failed for trending artists:', error);
        });
      });
    }

    return NextResponse.json({ data: trendingArtists });
  } catch (error) {
    console.error('Trending artists API error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}