import { 
  LastFmArtist, 
  LastFmSearchResult, 
  LastFmTopTracksResult, 
  LastFmTopAlbumsResult,
  ArtistData, 
  TrackData,
  AlbumData, 
  ApiResponse,
  LastFmImage 
} from './types';

const LASTFM_API_KEY = process.env.LAST_FM_API_KEY;
const LASTFM_BASE_URL = 'http://ws.audioscrobbler.com/2.0';

class LastFmService {
  private async fetchFromLastFm<T>(params: Record<string, string>): Promise<ApiResponse<T>> {
    if (!LASTFM_API_KEY) {
      return {
        success: false,
        error: {
          message: 'Last.fm API key not configured. Please add LAST_FM_API_KEY to .env.local',
          code: 'MISSING_API_KEY'
        }
      };
    }

    const searchParams = new URLSearchParams({
      api_key: LASTFM_API_KEY,
      format: 'json',
      ...params
    });

    try {
      const response = await fetch(`${LASTFM_BASE_URL}?${searchParams.toString()}`);
      
      if (!response.ok) {
        return {
          success: false,
          error: {
            message: `Last.fm API error: ${response.statusText}`,
            status: response.status
          }
        };
      }

      const data = await response.json();

      // Check for Last.fm specific errors
      if (data.error) {
        return {
          success: false,
          error: {
            message: data.message || 'Unknown Last.fm API error',
            code: data.error.toString()
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

  async searchArtists(query: string, limit: number = 10): Promise<ApiResponse<LastFmArtist[]>> {
    const result = await this.fetchFromLastFm<LastFmSearchResult>({
      method: 'artist.search',
      artist: query,
      limit: limit.toString()
    });

    if (!result.success) {
      return result;
    }

    const artists = result.data.results?.artistmatches?.artist || [];
    return {
      success: true,
      data: Array.isArray(artists) ? artists : [artists]
    };
  }

  async getArtistInfo(artistName: string): Promise<ApiResponse<LastFmArtist>> {
    const result = await this.fetchFromLastFm<{ artist: LastFmArtist }>({
      method: 'artist.getinfo',
      artist: artistName
    });

    if (!result.success) {
      return result;
    }

    return {
      success: true,
      data: result.data.artist
    };
  }

  async getArtistTopTracks(artistName: string, limit: number = 5): Promise<ApiResponse<TrackData[]>> {
    const result = await this.fetchFromLastFm<LastFmTopTracksResult>({
      method: 'artist.gettoptracks',
      artist: artistName,
      limit: limit.toString()
    });

    if (!result.success) {
      return result;
    }

    const tracks = result.data.toptracks?.track || [];
    const trackList = Array.isArray(tracks) ? tracks : [tracks];
    
    const processedTracks: TrackData[] = trackList.map(track => ({
      name: track.name,
      playcount: track.playcount || '0',
      url: track.url,
      duration: track.duration || '0'
    }));

    return {
      success: true,
      data: processedTracks
    };
  }

  async getSimilarArtists(artistName: string, limit: number = 5): Promise<ApiResponse<string[]>> {
    const result = await this.fetchFromLastFm<{ similarartists: { artist: LastFmArtist[] } }>({
      method: 'artist.getsimilar',
      artist: artistName,
      limit: limit.toString()
    });

    if (!result.success) {
      return result;
    }

    const similarArtists = result.data.similarartists?.artist || [];
    const artistNames = (Array.isArray(similarArtists) ? similarArtists : [similarArtists])
      .map(artist => artist.name);

    return {
      success: true,
      data: artistNames
    };
  }

  async getArtistTopAlbums(artistName: string, limit: number = 5): Promise<ApiResponse<AlbumData[]>> {
    const result = await this.fetchFromLastFm<LastFmTopAlbumsResult>({
      method: 'artist.getTopAlbums',
      artist: artistName,
      limit: limit.toString()
    });

    if (!result.success) {
      return result;
    }

    const albums = result.data.topalbums?.album || [];
    const albumList = Array.isArray(albums) ? albums : [albums];

    const transformedAlbums: AlbumData[] = albumList.map(album => ({
      name: album.name,
      playcount: album.playcount,
      url: album.url,
      image: this.getBestImage(album.image, 'large'), // Last.fm still provides album images
      year: '0', // Last.fm doesn't provide year in top albums
      tracks: '0' // Last.fm doesn't provide track count in top albums
    }));

    return {
      success: true,
      data: transformedAlbums
    };
  }

  // Helper method to get the best image from Last.fm image array (works for albums)
  getBestImage(images: LastFmImage[], preferredSize: 'large' | 'extralarge' | 'mega' = 'extralarge'): string {
    if (!images || images.length === 0) {
      return 'https://via.placeholder.com/300x300/FFB3E6/000000?text=No+Image';
    }

    // Try to find preferred size
    const preferredImage = images.find(img => img.size === preferredSize);
    if (preferredImage && preferredImage['#text']) {
      return preferredImage['#text'];
    }

    // Fallback to largest available
    const sizePriority = ['mega', 'extralarge', 'large', 'medium', 'small'];
    for (const size of sizePriority) {
      const image = images.find(img => img.size === size);
      if (image && image['#text']) {
        return image['#text'];
      }
    }

    // Final fallback
    return images[0]['#text'] || 'https://via.placeholder.com/300x300/FFB3E6/000000?text=No+Image';
  }

  async getTopKpopArtists(limit: number = 10): Promise<ApiResponse<LastFmArtist[]>> {
    // Try multiple K-pop related tags to get a good variety
    const kpopTags = ['k-pop', 'korean', 'kpop'];
    const allArtists: LastFmArtist[] = [];
    const seenArtists = new Set<string>();

    for (const tag of kpopTags) {
      const result = await this.fetchFromLastFm<{ topartists: { artist: LastFmArtist[] } }>({
        method: 'tag.gettopartists',
        tag: tag,
        limit: Math.ceil(limit * 2 / kpopTags.length).toString() // Get extra to account for filtering
      });

      if (result.success && result.data.topartists?.artist) {
        const artists = Array.isArray(result.data.topartists.artist) 
          ? result.data.topartists.artist 
          : [result.data.topartists.artist];
        
        for (const artist of artists) {
          if (!seenArtists.has(artist.name.toLowerCase()) && allArtists.length < limit) {
            seenArtists.add(artist.name.toLowerCase());
            allArtists.push(artist);
          }
        }
      }
    }

    return {
      success: true,
      data: allArtists.slice(0, limit)
    };
  }

  async searchKpopArtists(query: string, limit: number = 10): Promise<ApiResponse<LastFmArtist[]>> {
    // Fast K-pop search - prioritize tag-based search over detailed verification
    const kpopArtists: LastFmArtist[] = [];
    const seenArtists = new Set<string>();
    
    try {
      // Strategy 1: Fast tag-based search (most reliable and fast)
      const kpopTags = ['k-pop', 'korean', 'kpop'];
      for (const tag of kpopTags) {
        if (kpopArtists.length >= limit) break;

        const tagResult = await this.fetchFromLastFm<{ topartists: { artist: LastFmArtist[] } }>({
          method: 'tag.gettopartists',
          tag: tag,
          limit: '100' // Get more artists to search through
        });

        if (tagResult.success && tagResult.data.topartists?.artist) {
          const artists = Array.isArray(tagResult.data.topartists.artist) 
            ? tagResult.data.topartists.artist 
            : [tagResult.data.topartists.artist];
          
          for (const artist of artists) {
            const artistLower = artist.name.toLowerCase();
            const queryLower = query.toLowerCase();
            
            if (!seenArtists.has(artistLower) && 
                kpopArtists.length < limit &&
                artistLower.includes(queryLower)) {
              seenArtists.add(artistLower);
              kpopArtists.push(artist);
            }
          }
        }
      }

      // Strategy 2: Quick name-based matching from known K-pop artists (very fast)
      if (kpopArtists.length < limit) {
        const searchResult = await this.searchArtists(query, limit);
        if (searchResult.success) {
          for (const artist of searchResult.data) {
            if (kpopArtists.length >= limit) break;
            
            const artistLower = artist.name.toLowerCase();
            if (!seenArtists.has(artistLower) && this.isLikelyKpopName(artist.name)) {
              seenArtists.add(artistLower);
              kpopArtists.push(artist);
            }
          }
        }
      }

      return {
        success: true,
        data: kpopArtists.slice(0, limit)
      };
    } catch (error) {
      console.error('K-pop search failed:', error);
      return {
        success: true,
        data: []
      };
    }
  }

  // Helper method to detect likely K-pop artist names
  private isLikelyKpopName(name: string): boolean {
    const kpopIndicators = [
      // Top tier groups
      'bts', 'blackpink', 'twice', 'stray kids', 'newjeans', 'le sserafim', 
      'aespa', 'itzy', 'red velvet', 'girls generation', 'snsd', 'bigbang',
      'exo', 'seventeen', 'nct', 'ive', 'gidle', 'mamamoo', 'got7', 'txt',
      'enhypen', 'ateez', 'loona', 'fromis_9', 'oh my girl', 'everglow',
      // Additional popular groups
      'shinee', 'super junior', 'wonder girls', 'kara', 'f(x)', 'apink',
      'sistar', 'miss a', 'boa', 'rain', 'psy', 'cl', 'dara', 'gdragon',
      'taeyang', 'top', 'daesung', 'seungri', 'taeyeon', 'tiffany', 'jessica',
      'yuri', 'sooyoung', 'yoona', 'seohyun', 'sunny', 'hyoyeon', 'irene',
      'seulgi', 'wendy', 'joy', 'yeri', 'jennie', 'lisa', 'rose', 'jisoo',
      'nayeon', 'jeongyeon', 'momo', 'sana', 'jihyo', 'mina', 'dahyun',
      'chaeyoung', 'tzuyu', 'rm', 'jin', 'suga', 'j-hope', 'jimin', 'v',
      'jungkook', 'woozi', 'hoshi', 'the8', 'mingyu', 'dk', 'seungkwan',
      'vernon', 'dino', 's.coups', 'jeonghan', 'joshua', 'jun', 'wonwoo',
      // Solo artists and other groups
      'iu', 'taeyeon', 'sunmi', 'chungha', 'heize', 'dean', 'crush',
      'zion.t', 'jay park', 'simon dominic', 'epik high', 'dynamic duo',
      'davichi', 'mamamoo', 'hwasa', 'solar', 'moonbyul', 'wheein',
      'momoland', 'cosmic girls', 'wjsn', 'iz*one', 'izone', 'wanna one',
      'x1', 'produce', 'ioi', 'kep1er', 'cherry bullet', 'purple kiss',
      'dreamcatcher', 'pixy', 'billlie', 'nmixx', 'babymonster', 'baby monster'
    ];
    
    const nameLower = name.toLowerCase();
    return kpopIndicators.some(indicator => nameLower.includes(indicator));
  }

  // Convert Last.fm artist data to internal format
  transformArtistData(lastFmArtist: LastFmArtist): ArtistData {
    return {
      id: lastFmArtist.name.toLowerCase().replace(/\s+/g, '-'),
      name: lastFmArtist.name,
      image: 'https://via.placeholder.com/300x300/FFB3E6/000000?text=No+Image', // Last.fm no longer provides real images
      bio: lastFmArtist.bio?.summary?.replace(/<[^>]*>/g, '') || 'No biography available.',
      listeners: lastFmArtist.stats?.listeners || '0',
      playcount: lastFmArtist.stats?.playcount || '0',
      url: lastFmArtist.url,
      tags: lastFmArtist.tags?.tag?.map(tag => tag.name) || [],
    };
  }
}

export const lastFmService = new LastFmService();