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
    console.warn(`Rate limit exceeded for artist-detail: ${rateCheck.message}`);
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
    
    console.log(`Fetching artist data: ${artistName}`);
    const artistResult = await artistService.getArtistData(artistName);

    if (!artistResult.success) {
      return NextResponse.json({ error: artistResult.error?.message || 'Artist not found' }, { status: 500 });
    }

    const artistData = artistResult.data!;
    
    // Transform to legacy format for backward compatibility
    const transformedArtist = {
      id: artistData.id,
      name: artistData.name,
      image: artistData.image,
      debutYear: new Date().getFullYear(),
      company: 'Unknown',
      members: [],
      followers: artistData.followers.toString(),
      popularity: artistData.popularity, // Spotify popularity score (0-100)
      bio: artistData.biography || 'No biography available.',
      timeline: [],
      topSongs: [],
      topAlbums: [],
      recentNews: [],
      sentimentData: { positive: 70, neutral: 25, negative: 5 }
    };

    return NextResponse.json({ data: transformedArtist });
  } catch (error) {
    console.error('Artist API error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}