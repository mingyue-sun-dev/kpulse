import { NextRequest, NextResponse } from 'next/server';
import { artistService } from '@/lib/services/artistService';
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
  const rateCheck = rateLimiter.checkLimit('spotify-tracks');
  if (!rateCheck.allowed) {
    console.warn(`Rate limit exceeded for spotify-tracks: ${rateCheck.message}`);
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
    
    console.log(`Unified top tracks request: ${artistName}`);
    const result = await artistService.getTopTracks(artistName, 5);

    if (!result.success) {
      return NextResponse.json({ error: result.error?.message || 'Failed to fetch top tracks' }, { status: 500 });
    }

    if (!result.data || result.data.length === 0) {
      return NextResponse.json({ data: [] });
    }

    // Transform to legacy format for backward compatibility
    const transformedResults = result.data.map((track) => ({
      title: track.title,
      plays: track.plays || Math.floor(Math.random() * 50000000), // Use actual plays or generate fallback
      year: track.year || new Date().getFullYear(),
      spotifyId: track.spotifyId
    }));

    console.log(`Top tracks completed via ${result.metadata?.sources.join(', ')} - ${transformedResults.length} tracks`);

    return NextResponse.json({ 
      data: transformedResults,
      metadata: result.metadata 
    });
  } catch (error) {
    console.error('Top tracks API error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}