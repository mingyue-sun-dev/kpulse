import { NextRequest, NextResponse } from 'next/server';
import { spotifyService } from '@/lib/api/spotify';
import { apiCache } from '@/lib/cache/simple-cache';
import { rateLimiter } from '@/lib/rateLimiter';

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  
  if (!id) {
    return NextResponse.json({ error: 'Artist ID is required' }, { status: 400 });
  }

  // Check rate limit before proceeding  
  const rateCheck = rateLimiter.checkLimit('artist-image');
  if (!rateCheck.allowed) {
    console.warn(`Rate limit exceeded for artist image: ${rateCheck.message}`);
    return NextResponse.json({ 
      error: rateCheck.message || 'Rate limit exceeded',
      rateLimitInfo: {
        remaining: rateCheck.remaining,
        resetIn: rateCheck.resetIn
      }
    }, { status: 429 });
  }

  try {
    // Convert ID back to artist name (reverse the transformation)
    const artistName = id.replace(/-/g, ' ');
    
    // Check cache first (cache images for 1 hour)
    const cacheKey = `artist-image:${artistName.toLowerCase()}`;
    const cachedData = apiCache.get(cacheKey);
    if (cachedData !== null && cachedData !== undefined) {
      console.log(`Cache hit for artist image: ${artistName}`);
      return NextResponse.json({ 
        data: { 
          image: cachedData,
          source: 'spotify',
          cached: true 
        } 
      });
    }
    
    console.log(`Cache miss for artist image: ${artistName}, fetching from Spotify`);
    
    // Check if Spotify is configured
    if (!spotifyService.isConfigured()) {
      console.warn('Spotify API not configured, returning fallback');
      return NextResponse.json({ 
        data: { 
          image: null, 
          source: 'fallback',
          message: 'Spotify API not configured' 
        } 
      });
    }

    const result = await spotifyService.getArtistImage(artistName);

    if (!result.success) {
      console.error('Spotify API error:', result.error);
      // Return null image so component can use gradient fallback
      return NextResponse.json({ 
        data: { 
          image: null, 
          source: 'fallback',
          error: result.error.message 
        } 
      });
    }

    const imageUrl = result.data;
    
    // Cache the result for 1 hour (3600 seconds)
    apiCache.set(cacheKey, imageUrl, 3600);

    return NextResponse.json({ 
      data: { 
        image: imageUrl,
        source: imageUrl ? 'spotify' : 'fallback',
        cached: false 
      } 
    });
  } catch (error) {
    console.error('Artist image API error:', error);
    return NextResponse.json({ 
      data: { 
        image: null, 
        source: 'fallback',
        error: 'Internal server error' 
      } 
    });
  }
}