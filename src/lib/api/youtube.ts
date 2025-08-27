import { YouTubeSearchResult, YouTubeVideo, ApiResponse } from './types';

const YOUTUBE_API_KEY = process.env.YOUTUBE_API_KEY;
const YOUTUBE_BASE_URL = 'https://www.googleapis.com/youtube/v3';

// YouTube API quota tracking (10,000 units/day, search costs 100 units)
class YouTubeQuotaTracker {
  private dailyUsage = 0;
  private lastResetDate = new Date().toDateString();
  private readonly DAILY_QUOTA_LIMIT = 9000; // Reserve 1000 units as safety buffer
  private readonly SEARCH_COST = 100;

  checkQuota(requestCost: number = this.SEARCH_COST): { allowed: boolean; remaining: number; message?: string } {
    // Reset daily usage if it's a new day
    const today = new Date().toDateString();
    if (this.lastResetDate !== today) {
      this.dailyUsage = 0;
      this.lastResetDate = today;
    }

    const wouldExceed = this.dailyUsage + requestCost > this.DAILY_QUOTA_LIMIT;
    
    if (wouldExceed) {
      return {
        allowed: false,
        remaining: Math.max(0, this.DAILY_QUOTA_LIMIT - this.dailyUsage),
        message: `YouTube API quota limit reached (${this.dailyUsage}/${this.DAILY_QUOTA_LIMIT} units used). Resets at midnight UTC.`
      };
    }

    return {
      allowed: true,
      remaining: this.DAILY_QUOTA_LIMIT - this.dailyUsage - requestCost
    };
  }

  recordUsage(cost: number = this.SEARCH_COST): void {
    this.dailyUsage += cost;
  }

  getStatus() {
    return {
      dailyUsage: this.dailyUsage,
      dailyLimit: this.DAILY_QUOTA_LIMIT,
      remaining: Math.max(0, this.DAILY_QUOTA_LIMIT - this.dailyUsage),
      resetDate: this.lastResetDate
    };
  }
}

const quotaTracker = new YouTubeQuotaTracker();

class YouTubeService {
  private async fetchFromYouTube<T>(endpoint: string, params: Record<string, string>): Promise<ApiResponse<T>> {
    if (!YOUTUBE_API_KEY) {
      return {
        success: false,
        error: {
          message: 'YouTube API key not configured. Please add YOUTUBE_API_KEY to .env.local',
          code: 'MISSING_API_KEY'
        }
      };
    }

    const searchParams = new URLSearchParams({
      key: YOUTUBE_API_KEY,
      ...params
    });

    try {
      const response = await fetch(`${YOUTUBE_BASE_URL}/${endpoint}?${searchParams.toString()}`);
      
      if (!response.ok) {
        return {
          success: false,
          error: {
            message: `YouTube API error: ${response.statusText}`,
            status: response.status
          }
        };
      }

      const data = await response.json();

      // Check for YouTube specific errors
      if (data.error) {
        return {
          success: false,
          error: {
            message: data.error.message || 'Unknown YouTube API error',
            code: data.error.code?.toString()
          }
        };
      }

      return {
        success: true,
        data
      };
    } catch (error) {
      return {
        success: false,
        error: {
          message: error instanceof Error ? error.message : 'Network error',
          code: 'NETWORK_ERROR'
        }
      };
    }
  }

  async searchVideos(
    query: string, 
    maxResults: number = 5, // Reduced default to conserve quota
    type: 'music' | 'interview' | 'any' = 'music'
  ): Promise<ApiResponse<YouTubeVideo[]>> {
    // Check quota before making request
    const quotaCheck = quotaTracker.checkQuota();
    if (!quotaCheck.allowed) {
      return {
        success: false,
        error: {
          message: quotaCheck.message!,
          code: 'QUOTA_EXCEEDED'
        }
      };
    }

    let searchQuery = query;
    
    // Add specific terms based on type
    if (type === 'music') {
      searchQuery += ' official music video OR live performance';
    } else if (type === 'interview') {
      searchQuery += ' interview';
    }

    const result = await this.fetchFromYouTube<YouTubeSearchResult>('search', {
      part: 'snippet',
      q: searchQuery,
      type: 'video',
      maxResults: Math.min(maxResults, 10).toString(), // Cap at 10 to prevent excessive usage
      order: 'relevance',
      videoDefinition: 'any',
      videoSyndicated: 'true'
    });

    if (!result.success) {
      return result;
    }

    // Record successful quota usage
    quotaTracker.recordUsage();
    console.log(`YouTube API quota used: ${quotaTracker.getStatus().dailyUsage}/${quotaTracker.getStatus().dailyLimit} units`);

    return {
      success: true,
      data: result.data.items || []
    };
  }

  async getArtistMusicVideos(artistName: string, maxResults: number = 5): Promise<ApiResponse<YouTubeVideo[]>> {
    return this.searchVideos(`${artistName} official music video`, maxResults, 'music');
  }

  async getArtistInterviews(artistName: string, maxResults: number = 3): Promise<ApiResponse<YouTubeVideo[]>> {
    return this.searchVideos(`${artistName} interview`, maxResults, 'interview');
  }

  // Get video statistics (views, likes, duration) for sorting by popularity
  async getVideoStatistics(videoIds: string[]): Promise<ApiResponse<any[]>> {
    if (!videoIds.length) {
      return { success: true, data: [] };
    }

    // Check quota (1 unit per video, so cost is number of videos)
    const quotaCheck = quotaTracker.checkQuota(1);
    if (!quotaCheck.allowed) {
      return {
        success: false,
        error: {
          message: quotaCheck.message!,
          code: 'QUOTA_EXCEEDED'
        }
      };
    }

    const result = await this.fetchFromYouTube('videos', {
      part: 'statistics,contentDetails',
      id: videoIds.join(','),
      maxResults: '50'
    });

    if (!result.success) {
      return result;
    }

    quotaTracker.recordUsage(1);
    return {
      success: true,
      data: result.data.items || []
    };
  }

  // Official K-pop channels that should be prioritized
  private readonly OFFICIAL_CHANNELS = [
    'SMTOWN', 'HYBE LABELS', 'JYPEntertainment', '1theK (원더케이)', 'Stone Music Entertainment',
    'YGEntertainment', 'StarshipTV', 'CUBE Entertainment', 'FNC Entertainment', 'RBW',
    'WM Entertainment', '(G)I-DLE (여자)아이들 (Official YouTube Channel)', 'IVE', 'aespa',
    'TWICE', 'BLACKPINK', 'BTS', 'NewJeans', 'LE SSERAFIM', 'ITZY', 'Red Velvet',
    'SEVENTEEN', 'Stray Kids', 'ATEEZ', 'ENHYPEN', 'TXT (TOMORROW X TOGETHER)'
  ];

  // Check if channel is official or likely official
  private isOfficialChannel(channelTitle: string): boolean {
    const normalizedChannel = channelTitle.toLowerCase();
    return this.OFFICIAL_CHANNELS.some(official => 
      normalizedChannel.includes(official.toLowerCase()) ||
      official.toLowerCase().includes(normalizedChannel)
    );
  }

  // Enhanced method to get top music videos (2-3 videos with official channel preference)
  async getTopMusicVideos(artistName: string, maxResults: number = 3): Promise<ApiResponse<YouTubeVideo[]>> {
    // Check quota before making multiple requests
    const quotaCheck = quotaTracker.checkQuota(100); // Search cost
    if (!quotaCheck.allowed) {
      return {
        success: false,
        error: {
          message: quotaCheck.message!,
          code: 'QUOTA_EXCEEDED'
        }
      };
    }

    // Get multiple results to choose from
    const videosResult = await this.searchVideos(`${artistName} official music video`, 10, 'music');
    
    if (!videosResult.success || !videosResult.data.length) {
      return { success: true, data: [] };
    }

    const videos = videosResult.data;

    // Get video statistics for sorting by view count
    const videoIds = videos.map(v => v.id.videoId);
    const statsResult = await this.getVideoStatistics(videoIds);
    
    if (!statsResult.success) {
      // Fallback to first few videos if stats fetch fails
      return { success: true, data: videos.slice(0, maxResults) };
    }

    // Combine videos with their statistics and enhanced scoring
    const videosWithStats = videos.map(video => {
      const stats = statsResult.data.find(s => s.id === video.id.videoId);
      const viewCount = stats?.statistics?.viewCount ? parseInt(stats.statistics.viewCount) : 0;
      const publishedAt = new Date(video.snippet.publishedAt);
      const monthsAgo = (Date.now() - publishedAt.getTime()) / (1000 * 60 * 60 * 24 * 30);
      
      // Enhanced scoring with official channel preference
      const recencyScore = monthsAgo < 24 ? (24 - monthsAgo) / 24 : 0.1;
      const viewScore = Math.log(viewCount + 1) / Math.log(10000000); // Normalize view count
      const officialBonus = this.isOfficialChannel(video.snippet.channelTitle) ? 0.2 : 0; // 20% bonus for official channels
      
      const combinedScore = (recencyScore * 0.3) + (viewScore * 0.7) + officialBonus;
      
      return {
        ...video,
        viewCount,
        publishedAt,
        score: combinedScore,
        isOfficial: this.isOfficialChannel(video.snippet.channelTitle)
      };
    });

    // Sort by combined score (recency + popularity + official channel bonus)
    videosWithStats.sort((a, b) => b.score - a.score);
    
    const topVideos = videosWithStats.slice(0, maxResults);
    console.log(`[YouTube] Selected top ${topVideos.length} videos for ${artistName}:`);
    topVideos.forEach((video, index) => {
      console.log(`  ${index + 1}. "${video.snippet.title}" (${video.viewCount.toLocaleString()} views, score: ${video.score.toFixed(3)}, official: ${video.isOfficial})`);
    });
    
    return { success: true, data: topVideos };
  }

  // Backward compatibility - keep the single video method
  async getBestMusicVideo(artistName: string): Promise<ApiResponse<YouTubeVideo | null>> {
    const result = await this.getTopMusicVideos(artistName, 1);
    if (!result.success) return result;
    
    return {
      success: true,
      data: result.data.length > 0 ? result.data[0] : null
    };
  }

  // Pre-fetch video metadata for a list of artists (for trending/search results)
  async prefetchArtistVideos(artistNames: string[], videosPerArtist: number = 3): Promise<void> {
    if (!this.canMakeRequest() || artistNames.length === 0) {
      return;
    }

    console.log(`[YouTube] Pre-fetching ${videosPerArtist} videos for ${artistNames.length} artists`);
    
    // Process in small batches to avoid quota exhaustion
    const batchSize = Math.min(3, Math.floor(quotaTracker.checkQuota().remaining / 100));
    const artistBatch = artistNames.slice(0, batchSize);
    
    for (const artistName of artistBatch) {
      try {
        await this.getTopMusicVideos(artistName, videosPerArtist);
        // Small delay to avoid overwhelming the API
        await new Promise(resolve => setTimeout(resolve, 100));
      } catch (error) {
        console.error(`[YouTube] Pre-fetch failed for ${artistName}:`, error);
      }
    }
  }

  // Helper method to get video thumbnail URL
  getVideoThumbnail(video: YouTubeVideo, quality: 'default' | 'medium' | 'high' = 'high'): string {
    return video.snippet.thumbnails[quality]?.url || 
           video.snippet.thumbnails.medium?.url || 
           video.snippet.thumbnails.default?.url ||
           'https://via.placeholder.com/480x360/FF0000/FFFFFF?text=YouTube';
  }

  // Generate YouTube video URL
  getVideoUrl(video: YouTubeVideo): string {
    return `https://www.youtube.com/watch?v=${video.id.videoId}`;
  }

  // Generate YouTube embed URL
  getEmbedUrl(video: YouTubeVideo): string {
    return `https://www.youtube.com/embed/${video.id.videoId}`;
  }

  // Get current quota status
  getQuotaStatus() {
    return quotaTracker.getStatus();
  }

  // Check if API calls are allowed
  canMakeRequest(): boolean {
    return quotaTracker.checkQuota().allowed;
  }
}

export const youtubeService = new YouTubeService();