/**
 * Simple server-side cache with TTL support
 */

interface CacheItem<T> {
  data: T;
  timestamp: number;
}

class SimpleCache {
  private cache = new Map<string, CacheItem<any>>();

  get<T>(key: string): T | null {
    const item = this.cache.get(key);
    if (!item) return null;
    return item.data;
  }

  set<T>(key: string, data: T, ttlSeconds: number = 600): void {
    this.cache.set(key, {
      data,
      timestamp: Date.now() + (ttlSeconds * 1000)
    });
  }

  has(key: string): boolean {
    const item = this.cache.get(key);
    if (!item) return false;
    
    if (Date.now() > item.timestamp) {
      this.cache.delete(key);
      return false;
    }
    
    return true;
  }

  delete(key: string): boolean {
    return this.cache.delete(key);
  }

  clear(): void {
    this.cache.clear();
  }

  cleanup(): number {
    const now = Date.now();
    let removed = 0;
    
    for (const [key, item] of this.cache.entries()) {
      if (now > item.timestamp) {
        this.cache.delete(key);
        removed++;
      }
    }
    
    return removed;
  }
}

export const apiCache = new SimpleCache();

// Cleanup expired items every 10 minutes
setInterval(() => {
  apiCache.cleanup();
}, 10 * 60 * 1000);