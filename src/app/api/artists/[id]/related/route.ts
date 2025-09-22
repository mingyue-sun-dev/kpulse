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

  // Check rate limit before proceeding  
  const rateCheck = rateLimiter.checkLimit('artist-detail');
  if (!rateCheck.allowed) {
    console.warn(`Rate limit exceeded for related artists: ${rateCheck.message}`);
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
    
    console.log(`Unified related artists request: ${artistName}`);
    const result = await artistService.getRelatedArtists(artistName, 6);

    if (!result.success) {
      return NextResponse.json({ error: result.error?.message || 'Failed to fetch related artists' }, { status: 500 });
    }

    if (!result.data || result.data.length === 0) {
      return NextResponse.json({ data: [] });
    }

    // Transform to clean format without legacy fields
    const transformedResults = result.data.map((artist) => ({
      id: artist.id,
      name: artist.name,
      image: artist.image,
      source: artist.source
    }));

    console.log(`Related artists completed via ${result.metadata?.sources.join(', ')} - ${transformedResults.length} results`);

    return NextResponse.json({ 
      data: transformedResults,
      metadata: result.metadata 
    });
  } catch (error) {
    console.error('Related artists API error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}