import { spotifyService } from '@/lib/api/spotify';
import { lastFmService } from '@/lib/api/lastfm';
import { filterKpopArtists } from '@/utils/kpopFilter';
import { 
  ArtistDTO, 
  TrackDTO, 
  AlbumDTO, 
  SimilarArtistDTO, 
  ArtistSearchResultDTO,
  CompleteArtistDataDTO,
  ArtistServiceResponse 
} from '@/types/artist';
import { artistMappingCache } from '@/lib/cache/artist-mapping';
import { swrCache } from '@/lib/cache/swr-cache';

class ArtistService {

  /**
   * Clean and truncate biography to a reasonable length
   */
  private cleanBiography(bio: string | undefined): string | undefined {
    if (!bio) return undefined;
    
    // Remove HTML tags and extra whitespace
    let cleanBio = bio.replace(/<[^>]*>/g, '').replace(/\s+/g, ' ').trim();
    
    // Handle common Last.fm bio format issues
    if (cleanBio.startsWith('There are multiple artists under this name:')) {
      // Find the first artist description (usually after "1. ")
      const firstArtistMatch = cleanBio.match(/1\.\s*(.+?)(?:\n\n|2\.|$)/s);
      if (firstArtistMatch) {
        cleanBio = firstArtistMatch[1].trim();
      }
    }
    
    // Truncate to first 2-3 sentences (approximately 300 characters)
    if (cleanBio.length > 400) {
      const sentences = cleanBio.split(/[.!?]+/);
      if (sentences.length > 1) {
        // Take first 2 complete sentences
        cleanBio = sentences.slice(0, 2).join('. ').trim() + '.';
      } else {
        // If no sentence breaks, truncate at word boundary
        cleanBio = cleanBio.substring(0, 300).replace(/\s+\w*$/, '') + '...';
      }
    }
    
    return cleanBio || undefined;
  }

  // =============================================================================
  // SEARCH
  // =============================================================================

  async searchArtists(query: string, limit: number = 10): Promise<ArtistServiceResponse<ArtistSearchResultDTO[]>> {
    const cacheKey = `unified-search:${query.toLowerCase()}:${limit}`;
    
    const { data: cached, isStale, source } = await swrCache.get(
      cacheKey,
      'artist-search',
      async () => {
        return this.fetchSearchResults(query, limit);
      }
    );
    
    return {
      success: true,
      data: cached,
      metadata: { 
        sources: source === 'cache' ? ['cache'] : ['spotify', 'lastfm'], 
        cacheable: true,
        isStale 
      }
    };
  }

  private async fetchSearchResults(query: string, limit: number): Promise<ArtistSearchResultDTO[]> {

    try {
      // Primary: Spotify search (faster, better data)
      if (spotifyService.isConfigured()) {
        const spotifyResult = await spotifyService.searchArtists(query, limit);
        
        if (spotifyResult.success && spotifyResult.data) {
          // First, map all results to unified format
          const allResults: ArtistSearchResultDTO[] = spotifyResult.data.map(artist => {
            const unifiedId = artist.name.toLowerCase().replace(/\s+/g, '-');
            
            // Cache the Spotify ID mapping for future use
            artistMappingCache.setMapping({
              unifiedId,
              spotifyId: artist.id,
              spotifyName: artist.name
            });
            
            return {
              id: unifiedId,
              name: artist.name,
              image: artist.images?.[0]?.url || '/placeholder-artist.jpg',
              followers: artist.followers?.total || 0,
              popularity: artist.popularity,
              genres: artist.genres, // Include genres for K-pop filtering
              source: 'spotify' as const
            };
          });

          // Filter to only include K-pop artists
          const kpopResults = filterKpopArtists(allResults);
          
          console.log(`[K-pop Filter] Spotify search: ${allResults.length} total → ${kpopResults.length} K-pop artists`);
          
          return kpopResults;
        }
      }

      // Fallback: Last.fm search
      console.log('Spotify unavailable, using Last.fm search fallback');
      const lastFmResult = await lastFmService.searchKpopArtists(query, limit);
      
      if (lastFmResult.success) {
        const allResults: ArtistSearchResultDTO[] = lastFmResult.data.map(artist => {
          const unifiedId = artist.name.toLowerCase().replace(/\s+/g, '-');
          
          // Cache the Last.fm name mapping for future use
          artistMappingCache.setMapping({
            unifiedId,
            lastFmName: artist.name
          });
          
          return {
            id: unifiedId,
            name: artist.name,
            image: artist.image?.[2]?.['#text'] || '/placeholder-artist.jpg',
            followers: parseInt(artist.listeners || '0'), // Last.fm calls it 'listeners' but it's really followers
            source: 'lastfm' as const
          };
        });

        // Apply K-pop filtering to Last.fm results as well
        const kpopResults = filterKpopArtists(allResults);
        
        console.log(`[K-pop Filter] Last.fm search: ${allResults.length} total → ${kpopResults.length} K-pop artists`);
        
        return kpopResults;
      }

      throw new Error('No search results found');

    } catch (error) {
      throw new Error(error instanceof Error ? error.message : 'Search failed');
    }
  }

  // =============================================================================
  // ARTIST DATA AGGREGATION
  // =============================================================================

  async getArtistData(artistName: string): Promise<ArtistServiceResponse<ArtistDTO>> {
    const cacheKey = `unified-artist:${artistName.toLowerCase()}`;
    
    const { data: cached, isStale, source } = await swrCache.get(
      cacheKey,
      'artist-data',
      async () => {
        return this.fetchArtistData(artistName);
      }
    );
    
    return {
      success: true,
      data: cached,
      metadata: { 
        sources: source === 'cache' ? ['cache'] : ['spotify', 'lastfm'], 
        cacheable: true,
        isStale 
      }
    };
  }

  private async fetchArtistData(artistName: string): Promise<ArtistDTO> {

    try {
      const sources: string[] = [];
      const unifiedId = artistName.toLowerCase().replace(/\s+/g, '-');
      
      // Check if we have cached mapping to avoid duplicate requests
      const mapping = artistMappingCache.getByUnifiedId(unifiedId) || 
                     artistMappingCache.getByLastFmName(artistName);
      
      // Get Spotify data (images, followers) - use cached ID if available
      let spotifyData = null;
      if (spotifyService.isConfigured()) {
        let spotifyResult;
        
        if (mapping?.spotifyId) {
          // Use cached Spotify ID to avoid search API call
          console.log(`[Optimization] Using cached Spotify ID ${mapping.spotifyId} for ${artistName}`);
          spotifyResult = await this.getSpotifyArtistById(mapping.spotifyId);
        } else {
          // Fallback to search if no cached ID
          spotifyResult = await spotifyService.getArtistData(artistName);
        }
        
        if (spotifyResult.success && spotifyResult.data) {
          spotifyData = spotifyResult.data;
          sources.push('spotify');
          
          // Cache the mapping for future requests
          if (!mapping?.spotifyId) {
            artistMappingCache.setMapping({
              unifiedId,
              spotifyId: spotifyData.id,
              spotifyName: spotifyData.name
            });
          }
        }
      }

      // Get Last.fm data (biography, tags, listeners) - use cached name if available  
      let lastFmData = null;
      const lastFmName = mapping?.lastFmName || artistName;
      const lastFmResult = await lastFmService.getArtistInfo(lastFmName);
      
      if (lastFmResult.success && lastFmResult.data) {
        lastFmData = lastFmResult.data;
        sources.push('lastfm');
        
        // Update mapping cache with Last.fm name if not already cached
        if (!mapping?.lastFmName) {
          artistMappingCache.setMapping({
            unifiedId,
            lastFmName: lastFmData.name
          });
        }
      }

      // Aggregate data with smart fallbacks - only include data that actually exists
      const rawBio = lastFmData?.bio?.content || lastFmData?.bio?.summary;
      const artistData: ArtistDTO = {
        id: unifiedId,
        name: spotifyData?.name || lastFmData?.name || artistName,
        image: spotifyData?.images?.[0]?.url || lastFmData?.image?.[3]?.['#text'] || '/placeholder-artist.jpg',
        biography: this.cleanBiography(rawBio),
        followers: spotifyData?.followers?.total || 0,
        popularity: spotifyData?.popularity,
        genres: spotifyData?.genres || [],
        tags: lastFmData?.tags?.tag?.map(t => t.name) || [],
        sources: {
          image: spotifyData?.images?.[0]?.url ? 'spotify' : lastFmData?.image?.[3]?.['#text'] ? 'lastfm' : 'placeholder',
          biography: lastFmData?.bio ? 'lastfm' : null,
          stats: spotifyData ? 'spotify' : 'lastfm'
        }
      };

      if (sources.length === 0) {
        throw new Error('Artist not found');
      }

      return artistData;

    } catch (error) {
      throw new Error(error instanceof Error ? error.message : 'Failed to get artist data');
    }
  }

  // =============================================================================
  // TOP TRACKS
  // =============================================================================

  async getTopTracks(artistName: string, limit: number = 5): Promise<ArtistServiceResponse<TrackDTO[]>> {
    const cacheKey = `unified-tracks:${artistName.toLowerCase()}:${limit}`;
    
    const { data: cached, isStale, source } = await swrCache.get(
      cacheKey,
      'tracks',
      async () => {
        return this.fetchTopTracks(artistName, limit);
      }
    );
    
    return {
      success: true,
      data: cached,
      metadata: { 
        sources: source === 'cache' ? ['cache'] : ['spotify', 'lastfm'], 
        cacheable: true,
        isStale 
      }
    };
  }

  private async fetchTopTracks(artistName: string, limit: number): Promise<TrackDTO[]> {

    try {
      const unifiedId = artistName.toLowerCase().replace(/\s+/g, '-');
      const mapping = artistMappingCache.getByUnifiedId(unifiedId) || 
                     artistMappingCache.getByLastFmName(artistName);
      
      // Primary: Spotify top tracks (better for embeds) - use cached ID if available
      if (spotifyService.isConfigured()) {
        let spotifyResult;
        
        if (mapping?.spotifyId) {
          console.log(`[Optimization] Using cached Spotify ID ${mapping.spotifyId} for top tracks`);
          spotifyResult = await this.getSpotifyArtistTopTracksById(mapping.spotifyId, limit);
        } else {
          // Get Spotify ID first, then use direct API call to avoid circular dependency
          const artistResult = await spotifyService.getArtistData(artistName);
          if (artistResult.success && artistResult.data?.id) {
            // Cache the mapping for future requests
            artistMappingCache.setMapping({
              unifiedId,
              spotifyId: artistResult.data.id,
              spotifyName: artistResult.data.name
            });
            spotifyResult = await this.getSpotifyArtistTopTracksById(artistResult.data.id, limit);
          } else {
            spotifyResult = { success: false, error: { message: 'Artist not found', source: 'spotify' } };
          }
        }
        
        if (spotifyResult.success && spotifyResult.data) {
          const unifiedTracks: TrackDTO[] = spotifyResult.data.map((track, index) => ({
            id: `${artistName}-track-${index}`,
            title: track.name || `Track ${index + 1}`,
            duration: track.duration_ms ? Math.round(track.duration_ms / 1000) : undefined,
            spotifyId: track.id,
            spotifyPreviewUrl: track.preview_url,
            source: 'spotify' as const
          }));

          return unifiedTracks;
        }
      }

      // Fallback: Last.fm top tracks - use cached name if available
      const lastFmName = mapping?.lastFmName || artistName;
      const lastFmResult = await lastFmService.getArtistTopTracks(lastFmName, limit);
      
      if (lastFmResult.success) {
        const unifiedTracks: TrackDTO[] = lastFmResult.data.map((track, index) => ({
          id: `${artistName}-track-${index}`,
          title: track.name,
          duration: track.duration ? parseInt(track.duration) : undefined,
          plays: track.playcount ? parseInt(track.playcount) : undefined,
          source: 'lastfm' as const
        }));

        return unifiedTracks;
      }

      return [];

    } catch (error) {
      throw new Error(error instanceof Error ? error.message : 'Failed to get top tracks');
    }
  }

  // =============================================================================
  // RELATED ARTISTS
  // =============================================================================

  async getRelatedArtists(artistName: string, limit: number = 6): Promise<ArtistServiceResponse<SimilarArtistDTO[]>> {
    const cacheKey = `unified-related:${artistName.toLowerCase()}:${limit}`;
    
    const { data: cached, isStale, source } = await swrCache.get(
      cacheKey,
      'related',
      async () => {
        return this.fetchRelatedArtists(artistName, limit);
      }
    );
    
    return {
      success: true,
      data: cached,
      metadata: { 
        sources: source === 'cache' ? ['cache'] : ['spotify'], 
        cacheable: true,
        isStale 
      }
    };
  }

  private async fetchRelatedArtists(artistName: string, limit: number): Promise<SimilarArtistDTO[]> {

    try {
      // Primary: Spotify Related Artists API
      const spotifyResult = await spotifyService.getRelatedArtists(artistName, limit);
      
      if (spotifyResult.success && spotifyResult.data && spotifyResult.data.length > 0) {
        const unifiedRelated: SimilarArtistDTO[] = spotifyResult.data.map(artist => ({
          id: artist.id,
          name: artist.name,
          image: artist.image,
          source: 'spotify' as const
        }));

        console.log(`Related artists completed via spotify - ${unifiedRelated.length} results`);
        return unifiedRelated;
      }

      // Fallback: Last.fm (if Spotify fails)
      const lastFmResult = await lastFmService.getSimilarArtists(artistName, limit);
      
      if (lastFmResult.success && lastFmResult.data) {
        const unifiedSimilar: SimilarArtistDTO[] = lastFmResult.data.map(artistName => ({
          id: artistName.toLowerCase().replace(/\s+/g, '-'),
          name: artistName,
          image: '/placeholder-artist.jpg', // Will be loaded by ArtistImage component
          source: 'lastfm' as const
        }));

        console.log(`Related artists completed via lastfm fallback - ${unifiedSimilar.length} results`);
        return unifiedSimilar;
      }

      return [];

    } catch (error) {
      throw new Error(error instanceof Error ? error.message : 'Failed to get related artists');
    }
  }

  // =============================================================================
  // LATEST ALBUM
  // =============================================================================

  async getLatestAlbum(artistName: string): Promise<ArtistServiceResponse<AlbumDTO | null>> {
    const cacheKey = `unified-album:${artistName.toLowerCase()}`;
    
    const { data: cached, isStale, source } = await swrCache.get(
      cacheKey,
      'albums',
      async () => {
        return this.fetchLatestAlbum(artistName);
      }
    );
    
    return {
      success: true,
      data: cached,
      metadata: { 
        sources: source === 'cache' ? ['cache'] : ['spotify'], 
        cacheable: true,
        isStale 
      }
    };
  }

  private async fetchLatestAlbum(artistName: string): Promise<AlbumDTO | null> {

    try {
      const unifiedId = artistName.toLowerCase().replace(/\s+/g, '-');
      const mapping = artistMappingCache.getByUnifiedId(unifiedId) || 
                     artistMappingCache.getByLastFmName(artistName);
      
      // Primary: Spotify (better for embeds) - use cached ID if available
      if (spotifyService.isConfigured()) {
        let spotifyResult;
        
        if (mapping?.spotifyId) {
          console.log(`[Optimization] Using cached Spotify ID ${mapping.spotifyId} for latest album`);
          spotifyResult = await this.getSpotifyArtistLatestAlbumById(mapping.spotifyId);
        } else {
          // Get Spotify ID first, then use direct API call to avoid circular dependency
          const artistResult = await spotifyService.getArtistData(artistName);
          if (artistResult.success && artistResult.data?.id) {
            // Cache the mapping for future requests
            artistMappingCache.setMapping({
              unifiedId,
              spotifyId: artistResult.data.id,
              spotifyName: artistResult.data.name
            });
            spotifyResult = await this.getSpotifyArtistLatestAlbumById(artistResult.data.id);
          } else {
            spotifyResult = { success: false, error: { message: 'Artist not found', source: 'spotify' } };
          }
        }
        
        if (spotifyResult.success && spotifyResult.data) {
          const album = spotifyResult.data;
          const unifiedAlbum: AlbumDTO = {
            id: album.id,
            name: album.name,
            image: album.images?.[0]?.url,
            releaseDate: album.release_date,
            trackCount: album.total_tracks,
            spotifyId: album.id,
            source: 'spotify' as const
          };

          return unifiedAlbum;
        }
      }

      return null;

    } catch (error) {
      throw new Error(error instanceof Error ? error.message : 'Failed to get latest album');
    }
  }

  // =============================================================================
  // HELPER METHODS
  // =============================================================================

  /**
   * Get Spotify artist by ID (cached mapping optimization)
   */
  private async getSpotifyArtistById(spotifyId: string): Promise<ArtistServiceResponse<any>> {
    try {
      const token = await (spotifyService as any).getAccessToken();
      if (!token) {
        return {
          success: false,
          error: { message: 'Failed to authenticate with Spotify', source: 'spotify' }
        };
      }

      const response = await fetch(`https://api.spotify.com/v1/artists/${spotifyId}`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });

      if (!response.ok) {
        return {
          success: false,
          error: { message: `Spotify API error: ${response.statusText}`, source: 'spotify' }
        };
      }

      const artistData = await response.json();
      return {
        success: true,
        data: artistData
      };
    } catch (error) {
      return {
        success: false,
        error: { 
          message: error instanceof Error ? error.message : 'Unknown error',
          source: 'spotify'
        }
      };
    }
  }

  /**
   * Get Spotify artist latest album by ID (cached mapping optimization)
   */
  private async getSpotifyArtistLatestAlbumById(spotifyId: string): Promise<ArtistServiceResponse<any>> {
    try {
      const token = await (spotifyService as any).getAccessToken();
      if (!token) {
        return {
          success: false,
          error: { message: 'Failed to authenticate with Spotify', source: 'spotify' }
        };
      }

      const response = await fetch(`https://api.spotify.com/v1/artists/${spotifyId}/albums?include_groups=album,single&market=US&limit=1&offset=0`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });

      if (!response.ok) {
        return {
          success: false,
          error: { message: `Spotify API error: ${response.statusText}`, source: 'spotify' }
        };
      }

      const albumsData = await response.json();
      if (!albumsData.items || albumsData.items.length === 0) {
        return {
          success: true,
          data: null
        };
      }

      const latestAlbum = albumsData.items[0];
      return {
        success: true,
        data: {
          id: latestAlbum.id,
          name: latestAlbum.name,
          release_date: latestAlbum.release_date,
          total_tracks: latestAlbum.total_tracks,
          images: latestAlbum.images,
          external_urls: latestAlbum.external_urls
        }
      };
    } catch (error) {
      return {
        success: false,
        error: { 
          message: error instanceof Error ? error.message : 'Unknown error',
          source: 'spotify'
        }
      };
    }
  }

  /**
   * Get Spotify artist top tracks by ID (cached mapping optimization)
   */
  private async getSpotifyArtistTopTracksById(spotifyId: string, limit: number): Promise<ArtistServiceResponse<any[]>> {
    try {
      const token = await (spotifyService as any).getAccessToken();
      if (!token) {
        return {
          success: false,
          error: { message: 'Failed to authenticate with Spotify', source: 'spotify' }
        };
      }

      const response = await fetch(`https://api.spotify.com/v1/artists/${spotifyId}/top-tracks?market=US`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });

      if (!response.ok) {
        return {
          success: false,
          error: { message: `Spotify API error: ${response.statusText}`, source: 'spotify' }
        };
      }

      const tracksData = await response.json();
      const topTracks = tracksData.tracks?.slice(0, limit).map((track: any) => ({
        id: track.id,
        name: track.name,
        popularity: track.popularity,
        preview_url: track.preview_url,
        duration_ms: track.duration_ms,
        external_urls: track.external_urls
      })) || [];

      return {
        success: true,
        data: topTracks
      };
    } catch (error) {
      return {
        success: false,
        error: { 
          message: error instanceof Error ? error.message : 'Unknown error',
          source: 'spotify'
        }
      };
    }
  }

  // =============================================================================
  // COMPLETE ARTIST DATA
  // =============================================================================

  async getCompleteArtistData(artistName: string): Promise<ArtistServiceResponse<CompleteArtistDataDTO>> {
    try {
      // Parallel data fetching for better performance
      const [
        artistResult,
        tracksResult,
        albumResult,
        relatedResult
      ] = await Promise.all([
        this.getArtistData(artistName),
        this.getTopTracks(artistName, 5),
        this.getLatestAlbum(artistName),
        this.getRelatedArtists(artistName, 6)
      ]);

      if (!artistResult.success) {
        return {
          success: false,
          error: artistResult.error
        };
      }

      const completeData: CompleteArtistDataDTO = {
        artist: artistResult.data!,
        topTracks: tracksResult.success ? tracksResult.data! : [],
        latestAlbum: albumResult.success ? albumResult.data! : undefined,
        topAlbums: [], // TODO: Implement if needed
        similarArtists: relatedResult.success ? relatedResult.data! : [],
        aggregatedAt: new Date().toISOString(),
        cacheKey: `complete-artist:${artistName.toLowerCase()}`
      };

      const allSources = [
        ...(artistResult.metadata?.sources || []),
        ...(tracksResult.metadata?.sources || []),
        ...(albumResult.metadata?.sources || []),
        ...(relatedResult.metadata?.sources || [])
      ].filter(Boolean);

      return {
        success: true,
        data: completeData,
        metadata: { 
          sources: [...new Set(allSources)], 
          cacheable: true 
        }
      };

    } catch (error) {
      return {
        success: false,
        error: { 
          message: error instanceof Error ? error.message : 'Failed to get complete artist data',
          source: 'aggregation'
        }
      };
    }
  }
}

export const artistService = new ArtistService();