import { NextRequest, NextResponse } from 'next/server';
import { spotifyService } from '@/lib/api/spotify';
import { apiCache } from '@/lib/cache/simple-cache';
import { rateLimiter } from '@/lib/rateLimiter';

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  
  if (!id) {
    return NextResponse.json({ error: 'Artist ID is required' }, { status: 400 });
  }

  // Check rate limit
  const rateCheck = rateLimiter.checkLimit('spotify-albums');
  if (!rateCheck.allowed) {
    console.warn(`Rate limit exceeded for spotify-albums: ${rateCheck.message}`);
    return NextResponse.json({ 
      error: rateCheck.message || 'Rate limit exceeded',
      rateLimitInfo: {
        remaining: rateCheck.remaining,
        resetIn: rateCheck.resetIn
      }
    }, { status: 429 });
  }

  try {
    // Convert ID back to artist name
    const artistName = id.replace(/-/g, ' ');
    
    // Check cache first
    const cacheKey = `latest-album:${artistName.toLowerCase()}`;
    const cachedData = apiCache.get(cacheKey);
    if (cachedData) {
      console.log(`Cache hit for latest album: ${artistName}`);
      return NextResponse.json({ data: cachedData });
    }
    
    console.log(`Cache miss for latest album: ${artistName}, fetching from Spotify`);
    
    // Check if Spotify is configured
    if (!spotifyService.isConfigured()) {
      console.log('Spotify not configured, returning null');
      return NextResponse.json({ data: null });
    }

    // Get the artist's latest album from Spotify
    const albumResult = await spotifyService.getArtistLatestAlbum(artistName);
    
    if (!albumResult.success || !albumResult.data) {
      console.log(`No latest album found for ${artistName}`);
      // Cache null result for shorter time
      apiCache.set(cacheKey, null, 600); // 10 minutes
      return NextResponse.json({ data: null });
    }

    const album = albumResult.data;
    
    // Format the album data for the frontend
    const formattedAlbum = {
      id: album.id,
      title: album.name,
      releaseDate: album.release_date,
      totalTracks: album.total_tracks,
      image: album.images && album.images.length > 0 ? album.images[0].url : null,
      spotifyUrl: album.external_urls?.spotify,
      spotifyId: album.id
    };

    // Cache the result for 2 hours (latest albums don't change frequently)
    apiCache.set(cacheKey, formattedAlbum, 7200);

    return NextResponse.json({ data: formattedAlbum });
  } catch (error) {
    console.error('Latest album API error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}