import { NextRequest, NextResponse } from 'next/server';
import { artistService } from '@/lib/services/artistService';
import { youtubeService } from '@/lib/api/youtube';
import { rateLimiter } from '@/lib/rateLimiter';

export async function GET(request: NextRequest) {
  const searchParams = request.nextUrl.searchParams;
  const query = searchParams.get('q');
  const limit = parseInt(searchParams.get('limit') || '10');

  if (!query) {
    return NextResponse.json({ error: 'Query parameter is required' }, { status: 400 });
  }

  // Check rate limit before proceeding
  const rateCheck = rateLimiter.checkLimit('artist-search');
  if (!rateCheck.allowed) {
    console.warn(`Rate limit exceeded for artist-search: ${rateCheck.message}`);
    return NextResponse.json({ 
      error: rateCheck.message || 'Rate limit exceeded',
      rateLimitInfo: {
        remaining: rateCheck.remaining,
        resetIn: rateCheck.resetIn
      }
    }, { status: 429 });
  }

  try {
    console.log(`Unified search request: ${query} (limit: ${limit})`);
    const result = await artistService.searchArtists(query, limit);
    
    if (!result.success) {
      return NextResponse.json({ error: result.error?.message || 'Search failed' }, { status: 500 });
    }

    // Transform to format with only available data (no fake listeners)
    const transformedResults = result.data!.map((artist) => ({
      id: artist.id,
      name: artist.name,
      image: artist.image,
      followers: artist.followers,
      popularity: artist.popularity, // Spotify popularity score (0-100)
      debutYear: artist.debutYear || new Date().getFullYear(),
      company: artist.company || 'Unknown'
    }));

    console.log(`Search completed via ${result.metadata?.sources.join(', ')} - ${transformedResults.length} results`);

    // Pre-fetch YouTube videos for search results in background (non-blocking)
    if (transformedResults.length > 0) {
      const artistNames = transformedResults.slice(0, 3).map(artist => artist.name); // Top 3 results
      setImmediate(() => {
        youtubeService.prefetchArtistVideos(artistNames).catch(error => {
          console.error('[YouTube] Pre-fetch failed for search results:', error);
        });
      });
    }

    return NextResponse.json({ 
      data: transformedResults,
      metadata: result.metadata 
    });
  } catch (error) {
    console.error('Search API error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}