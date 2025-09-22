import { NextRequest, NextResponse } from 'next/server';
import { youtubeService } from '@/lib/api/youtube';
import { swrCache } from '@/lib/cache/swr-cache';
import { rateLimiter } from '@/lib/rateLimiter';
import type { CachedVideoData } from '@/lib/api/types';

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  
  if (!id) {
    return NextResponse.json({ error: 'Artist ID is required' }, { status: 400 });
  }

  // Check rate limit before proceeding - use strict limits for YouTube
  const rateCheck = rateLimiter.checkLimit('youtube-videos');
  if (!rateCheck.allowed) {
    console.warn(`Rate limit exceeded for youtube-videos: ${rateCheck.message}`);
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
    
    // Use SWR cache for video metadata
    const cacheKey = `youtube-video:${artistName.toLowerCase()}`;
    
    const { data: cachedVideos, isStale, source } = await swrCache.get(
      cacheKey,
      'videos',
      async () => {
        return await fetchTopVideosMetadata(artistName);
      }
    );

    if (cachedVideos) {
      return NextResponse.json({ 
        data: cachedVideos,
        metadata: { 
          source,
          isStale,
          quotaStatus: youtubeService.getQuotaStatus()
        }
      });
    }

    return NextResponse.json({ data: [] });
  } catch (error) {
    console.error('YouTube videos API error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

async function fetchTopVideosMetadata(artistName: string): Promise<CachedVideoData[]> {
  // Check YouTube quota before making request
  if (!youtubeService.canMakeRequest()) {
    const quotaStatus = youtubeService.getQuotaStatus();
    throw new Error(`YouTube API quota exhausted (${quotaStatus.dailyUsage}/${quotaStatus.dailyLimit} units used). Resets tomorrow.`);
  }
  
  console.log(`Fetching top video for: ${artistName} (Quota: ${youtubeService.getQuotaStatus().remaining} units remaining)`);
  
  const videosResult = await youtubeService.getTopMusicVideos(artistName, 1);

  if (!videosResult.success) {
    if (videosResult.error?.code === 'QUOTA_EXCEEDED') {
      throw new Error(videosResult.error.message);
    }
    throw new Error(videosResult.error?.message || 'Failed to fetch videos');
  }

  if (!videosResult.data || videosResult.data.length === 0) {
    return [];
  }

  const videos = videosResult.data;
  
  // Transform to cached video metadata format
  const cachedVideosData: CachedVideoData[] = videos.map(video => ({
    metadata: {
      id: video.id.videoId,
      title: video.snippet.title,
      description: video.snippet.description,
      thumbnail: youtubeService.getVideoThumbnail(video, 'high'),
      channelTitle: video.snippet.channelTitle,
      publishedAt: video.snippet.publishedAt,
      viewCount: (video as any).viewCount, // From getTopMusicVideos enhancement
      score: (video as any).score,
      isOfficial: (video as any).isOfficial
    },
    embedUrl: youtubeService.getEmbedUrl(video),
    url: youtubeService.getVideoUrl(video),
    cachedAt: Date.now()
  }));

  console.log(`[YouTube] Cached ${cachedVideosData.length} video metadata for ${artistName}`);
  return cachedVideosData;
}