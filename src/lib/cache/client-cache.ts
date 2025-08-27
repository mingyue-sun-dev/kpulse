/**
 * Client-side cache utility with TTL support
 * Stores data in memory with automatic expiration
 */

interface CacheItem<T> {
  data: T
  timestamp: number
  ttl: number // Time to live in milliseconds
}

interface CacheOptions {
  ttl?: number // Default TTL in milliseconds
  maxSize?: number // Maximum number of items to store
}

class ClientCache {
  private cache = new Map<string, CacheItem<any>>()
  private defaultTTL: number
  private maxSize: number

  constructor(options: CacheOptions = {}) {
    this.defaultTTL = options.ttl || 5 * 60 * 1000 // Default 5 minutes
    this.maxSize = options.maxSize || 100 // Default max 100 items
  }

  /**
   * Set an item in the cache with optional TTL override
   */
  set<T>(key: string, data: T, ttl?: number): void {
    const now = Date.now()
    const timeToLive = ttl || this.defaultTTL

    // Remove oldest items if cache is full
    if (this.cache.size >= this.maxSize) {
      this.cleanup()
      
      // If still at capacity after cleanup, remove oldest item
      if (this.cache.size >= this.maxSize) {
        const firstKey = this.cache.keys().next().value
        if (firstKey) {
          this.cache.delete(firstKey)
        }
      }
    }

    this.cache.set(key, {
      data,
      timestamp: now,
      ttl: timeToLive
    })
  }

  /**
   * Get an item from the cache
   * Returns null if item doesn't exist or has expired
   */
  get<T>(key: string): T | null {
    const item = this.cache.get(key)
    
    if (!item) {
      return null
    }

    const now = Date.now()
    const isExpired = now - item.timestamp > item.ttl

    if (isExpired) {
      this.cache.delete(key)
      return null
    }

    return item.data
  }

  /**
   * Check if an item exists and is not expired
   */
  has(key: string): boolean {
    return this.get(key) !== null
  }

  /**
   * Remove an item from the cache
   */
  delete(key: string): boolean {
    return this.cache.delete(key)
  }

  /**
   * Clear all items from the cache
   */
  clear(): void {
    this.cache.clear()
  }

  /**
   * Remove expired items from the cache
   */
  cleanup(): void {
    const now = Date.now()
    
    for (const [key, item] of this.cache.entries()) {
      const isExpired = now - item.timestamp > item.ttl
      if (isExpired) {
        this.cache.delete(key)
      }
    }
  }

  /**
   * Get cache statistics
   */
  getStats() {
    const now = Date.now()
    let validItems = 0
    let expiredItems = 0

    for (const [, item] of this.cache.entries()) {
      const isExpired = now - item.timestamp > item.ttl
      if (isExpired) {
        expiredItems++
      } else {
        validItems++
      }
    }

    return {
      totalItems: this.cache.size,
      validItems,
      expiredItems,
      maxSize: this.maxSize,
      usage: (this.cache.size / this.maxSize) * 100
    }
  }

  /**
   * Get or set pattern - fetch data if not cached
   */
  async getOrSet<T>(
    key: string,
    fetcher: () => Promise<T>,
    ttl?: number
  ): Promise<T> {
    const cached = this.get<T>(key)
    
    if (cached !== null) {
      return cached
    }

    const data = await fetcher()
    this.set(key, data, ttl)
    return data
  }
}

// Cache instances for different types of data with longer TTLs for better UX
export const artistCache = new ClientCache({
  ttl: 30 * 60 * 1000, // 30 minutes for artist data (increased from 10)
  maxSize: 100 // Increased cache size
})

export const searchCache = new ClientCache({
  ttl: 15 * 60 * 1000, // 15 minutes for search results (increased from 5)
  maxSize: 200 // Increased cache size
})

export const newsCache = new ClientCache({
  ttl: 60 * 60 * 1000, // 1 hour for news (increased from 15 minutes)
  maxSize: 50 // Increased cache size
})

export const videosCache = new ClientCache({
  ttl: 2 * 60 * 60 * 1000, // 2 hours for music videos (increased from 30 minutes)
  maxSize: 100 // Increased cache size
})

// Auto cleanup expired items every 5 minutes
setInterval(() => {
  artistCache.cleanup()
  searchCache.cleanup()
  newsCache.cleanup()
  videosCache.cleanup()
}, 5 * 60 * 1000)

export default ClientCache