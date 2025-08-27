/**
 * Stale-While-Revalidate (SWR) Cache System
 * 
 * This advanced caching system:
 * 1. Serves cached content immediately (even if stale)
 * 2. Updates content in the background for next request
 * 3. Uses content type granularity with different TTLs
 * 4. Provides significant performance improvements
 */

interface CacheEntry<T> {
  data: T;
  createdAt: number;
  isRevalidating: boolean;
  contentType: ContentType;
}

type ContentType = 
  | 'artist-search'    // 10 minutes fresh, serve stale up to 1 hour
  | 'artist-data'      // 30 minutes fresh, serve stale up to 2 hours  
  | 'artist-stats'     // 1 hour fresh, serve stale up to 4 hours
  | 'tracks'           // 24 hours fresh, serve stale up to 7 days
  | 'similar'          // 6 hours fresh, serve stale up to 24 hours (legacy)
  | 'related'          // 6 hours fresh, serve stale up to 24 hours
  | 'videos'           // 6 hours fresh, serve stale up to 24 hours
  | 'news'             // 4 hours fresh, serve stale up to 12 hours
  | 'trending'         // 15 minutes fresh, serve stale up to 1 hour
  | 'artist-mapping';  // 24 hours fresh, serve stale up to 7 days

interface CacheConfig {
  freshTTL: number;  // Time when content is fresh
  staleTTL: number;  // Maximum time to serve stale content
  description: string;
}

class SWRCache {
  private cache = new Map<string, CacheEntry<any>>();
  private revalidationPromises = new Map<string, Promise<any>>();

  private readonly CONFIG: Record<ContentType, CacheConfig> = {
    'artist-search': {
      freshTTL: 10 * 60 * 1000,       // 10 minutes
      staleTTL: 60 * 60 * 1000,       // 1 hour
      description: 'Artist search results'
    },
    'artist-data': {
      freshTTL: 30 * 60 * 1000,       // 30 minutes
      staleTTL: 2 * 60 * 60 * 1000,   // 2 hours
      description: 'Artist biographical data'
    },
    'artist-stats': {
      freshTTL: 60 * 60 * 1000,       // 1 hour
      staleTTL: 4 * 60 * 60 * 1000,   // 4 hours
      description: 'Artist followers/popularity stats'
    },
    'tracks': {
      freshTTL: 24 * 60 * 60 * 1000,  // 24 hours
      staleTTL: 7 * 24 * 60 * 60 * 1000, // 7 days
      description: 'Artist top tracks (rarely change)'
    },
    'similar': {
      freshTTL: 6 * 60 * 60 * 1000,   // 6 hours
      staleTTL: 24 * 60 * 60 * 1000,  // 24 hours
      description: 'Similar artists recommendations (legacy)'
    },
    'related': {
      freshTTL: 6 * 60 * 60 * 1000,   // 6 hours
      staleTTL: 24 * 60 * 60 * 1000,  // 24 hours
      description: 'Related artists from Spotify'
    },
    'videos': {
      freshTTL: 6 * 60 * 60 * 1000,   // 6 hours  
      staleTTL: 24 * 60 * 60 * 1000,  // 24 hours
      description: 'YouTube videos'
    },
    'news': {
      freshTTL: 4 * 60 * 60 * 1000,   // 4 hours
      staleTTL: 12 * 60 * 60 * 1000,  // 12 hours
      description: 'Artist news articles'
    },
    'trending': {
      freshTTL: 15 * 60 * 1000,       // 15 minutes
      staleTTL: 60 * 60 * 1000,       // 1 hour
      description: 'Trending artists'
    },
    'artist-mapping': {
      freshTTL: 24 * 60 * 60 * 1000,  // 24 hours
      staleTTL: 7 * 24 * 60 * 60 * 1000, // 7 days
      description: 'Artist ID mappings'
    }
  };

  /**
   * Get data with SWR strategy:
   * 1. Return cached data immediately (even if stale)
   * 2. If stale, trigger background revalidation
   * 3. Next request gets fresh data
   */
  async get<T>(
    key: string, 
    contentType: ContentType, 
    revalidator: () => Promise<T>
  ): Promise<{ data: T; isStale: boolean; source: 'cache' | 'fresh' }> {
    const entry = this.cache.get(key);
    const config = this.CONFIG[contentType];
    const now = Date.now();

    // No cached data - fetch fresh
    if (!entry) {
      console.log(`[SWR] Cache MISS for ${contentType}: ${key}`);
      const freshData = await this.executeFetch(key, revalidator);
      this.cache.set(key, {
        data: freshData,
        createdAt: now,
        isRevalidating: false,
        contentType
      });
      return { data: freshData, isStale: false, source: 'fresh' };
    }

    const age = now - entry.createdAt;

    // Data is too old - fetch fresh (but serve stale first if not expired)
    if (age > config.staleTTL) {
      console.log(`[SWR] Cache EXPIRED for ${contentType}: ${key} (age: ${Math.round(age / 1000)}s)`);
      const freshData = await this.executeFetch(key, revalidator);
      this.cache.set(key, {
        data: freshData,
        createdAt: now,
        isRevalidating: false,
        contentType
      });
      return { data: freshData, isStale: false, source: 'fresh' };
    }

    // Data is fresh - serve immediately
    if (age <= config.freshTTL) {
      console.log(`[SWR] Cache HIT (fresh) for ${contentType}: ${key} (age: ${Math.round(age / 1000)}s)`);
      return { data: entry.data, isStale: false, source: 'cache' };
    }

    // Data is stale but acceptable - serve immediately and revalidate in background
    console.log(`[SWR] Cache HIT (stale) for ${contentType}: ${key} (age: ${Math.round(age / 1000)}s) - revalidating in background`);
    
    // Trigger background revalidation if not already running
    if (!entry.isRevalidating) {
      this.triggerBackgroundRevalidation(key, contentType, revalidator);
    }

    return { data: entry.data, isStale: true, source: 'cache' };
  }

  /**
   * Set data directly (for cases where we have fresh data)
   */
  set<T>(key: string, data: T, contentType: ContentType): void {
    this.cache.set(key, {
      data,
      createdAt: Date.now(),
      isRevalidating: false,
      contentType
    });
    console.log(`[SWR] Cache SET for ${contentType}: ${key}`);
  }

  /**
   * Execute fetch with promise deduplication
   */
  private async executeFetch<T>(key: string, revalidator: () => Promise<T>): Promise<T> {
    // Deduplicate concurrent requests for same key
    if (this.revalidationPromises.has(key)) {
      console.log(`[SWR] Deduplicating concurrent request: ${key}`);
      return this.revalidationPromises.get(key)!;
    }

    const promise = revalidator();
    this.revalidationPromises.set(key, promise);

    try {
      const result = await promise;
      return result;
    } finally {
      this.revalidationPromises.delete(key);
    }
  }

  /**
   * Trigger background revalidation without blocking current request
   */
  private triggerBackgroundRevalidation<T>(
    key: string, 
    contentType: ContentType, 
    revalidator: () => Promise<T>
  ): void {
    // Mark as revalidating
    const entry = this.cache.get(key);
    if (entry) {
      entry.isRevalidating = true;
    }

    // Execute in background (don't await)
    this.executeFetch(key, revalidator)
      .then(freshData => {
        // Update cache with fresh data
        this.cache.set(key, {
          data: freshData,
          createdAt: Date.now(),
          isRevalidating: false,
          contentType
        });
        console.log(`[SWR] Background revalidation complete for ${contentType}: ${key}`);
      })
      .catch(error => {
        // Keep serving stale data if revalidation fails
        const entry = this.cache.get(key);
        if (entry) {
          entry.isRevalidating = false;
        }
        console.error(`[SWR] Background revalidation failed for ${contentType}: ${key}`, error);
      });
  }

  /**
   * Get cache statistics
   */
  getStats(): {
    totalEntries: number;
    byContentType: Record<ContentType, number>;
    revalidating: number;
  } {
    const byContentType = {} as Record<ContentType, number>;
    let revalidating = 0;

    for (const [_, entry] of this.cache) {
      byContentType[entry.contentType] = (byContentType[entry.contentType] || 0) + 1;
      if (entry.isRevalidating) revalidating++;
    }

    return {
      totalEntries: this.cache.size,
      byContentType,
      revalidating
    };
  }

  /**
   * Clean up expired entries
   */
  cleanup(): number {
    const now = Date.now();
    const toDelete: string[] = [];

    for (const [key, entry] of this.cache) {
      const config = this.CONFIG[entry.contentType];
      const age = now - entry.createdAt;
      
      if (age > config.staleTTL) {
        toDelete.push(key);
      }
    }

    toDelete.forEach(key => this.cache.delete(key));
    
    if (toDelete.length > 0) {
      console.log(`[SWR] Cleaned up ${toDelete.length} expired entries`);
    }

    return toDelete.length;
  }
}

export const swrCache = new SWRCache();

// Cleanup expired entries every hour
if (typeof window === 'undefined') { // Only in server environment
  setInterval(() => {
    swrCache.cleanup();
  }, 60 * 60 * 1000); // 1 hour
}