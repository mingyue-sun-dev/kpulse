/**
 * Artist ID Mapping Cache
 * 
 * This cache stores mappings between different API service IDs to reduce
 * duplicate API requests when searching across multiple services.
 */

interface ArtistMapping {
  spotifyId?: string;
  spotifyName?: string;
  lastFmName?: string;
  unifiedId: string; // The standardized ID used across the app
  lastUpdated: number;
}

class ArtistMappingCache {
  private cache = new Map<string, ArtistMapping>();
  private readonly TTL = 24 * 60 * 60 * 1000; // 24 hours

  /**
   * Get mapping by unified artist ID
   */
  getByUnifiedId(unifiedId: string): ArtistMapping | null {
    const mapping = this.cache.get(unifiedId);
    if (!mapping) return null;

    if (Date.now() - mapping.lastUpdated > this.TTL) {
      this.cache.delete(unifiedId);
      return null;
    }

    return mapping;
  }

  /**
   * Get mapping by Spotify ID
   */
  getBySpotifyId(spotifyId: string): ArtistMapping | null {
    for (const [_, mapping] of this.cache) {
      if (mapping.spotifyId === spotifyId && 
          Date.now() - mapping.lastUpdated <= this.TTL) {
        return mapping;
      }
    }
    return null;
  }

  /**
   * Get mapping by Last.fm name (case-insensitive)
   */
  getByLastFmName(lastFmName: string): ArtistMapping | null {
    const searchName = lastFmName.toLowerCase();
    for (const [_, mapping] of this.cache) {
      if (mapping.lastFmName?.toLowerCase() === searchName && 
          Date.now() - mapping.lastUpdated <= this.TTL) {
        return mapping;
      }
    }
    return null;
  }

  /**
   * Set or update artist mapping
   */
  setMapping(data: {
    unifiedId: string;
    spotifyId?: string;
    spotifyName?: string;
    lastFmName?: string;
  }): void {
    const existing = this.cache.get(data.unifiedId);
    
    const mapping: ArtistMapping = {
      unifiedId: data.unifiedId,
      spotifyId: data.spotifyId || existing?.spotifyId,
      spotifyName: data.spotifyName || existing?.spotifyName,
      lastFmName: data.lastFmName || existing?.lastFmName,
      lastUpdated: Date.now()
    };

    this.cache.set(data.unifiedId, mapping);
    
    console.log(`[ArtistMapping] Cached mapping for ${data.unifiedId}:`, {
      spotify: mapping.spotifyId ? `${mapping.spotifyId} (${mapping.spotifyName})` : 'none',
      lastfm: mapping.lastFmName || 'none'
    });
  }

  /**
   * Get cache statistics
   */
  getStats(): { size: number; expired: number } {
    const now = Date.now();
    let expired = 0;

    for (const [key, mapping] of this.cache) {
      if (now - mapping.lastUpdated > this.TTL) {
        expired++;
      }
    }

    return {
      size: this.cache.size,
      expired
    };
  }

  /**
   * Clear expired entries
   */
  cleanup(): void {
    const now = Date.now();
    const toDelete: string[] = [];

    for (const [key, mapping] of this.cache) {
      if (now - mapping.lastUpdated > this.TTL) {
        toDelete.push(key);
      }
    }

    toDelete.forEach(key => this.cache.delete(key));
    
    if (toDelete.length > 0) {
      console.log(`[ArtistMapping] Cleaned up ${toDelete.length} expired mappings`);
    }
  }

  /**
   * Helper to create unified ID from artist name
   */
  static createUnifiedId(artistName: string): string {
    return artistName.toLowerCase().replace(/\s+/g, '-');
  }
}

export const artistMappingCache = new ArtistMappingCache();

// Cleanup expired entries every hour
if (typeof window === 'undefined') { // Only in server environment
  setInterval(() => {
    artistMappingCache.cleanup();
  }, 60 * 60 * 1000); // 1 hour
}