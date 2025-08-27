// Rate limiter to protect against excessive API calls during development
interface RateLimitEntry {
  count: number;
  resetTime: number;
  blocked: boolean;
  blockUntil?: number;
  burstCount: number;
  lastBurstReset: number;
}

class RateLimiter {
  private limits = new Map<string, RateLimitEntry>();

  // Extremely generous limits for excellent user experience
  private readonly LIMITS = {
    // Per endpoint limits - very high for smooth browsing
    "artist-detail": { max: 500, window: 60000 }, // 500 requests per minute
    "artist-search": { max: 500, window: 60000 }, // 500 requests per minute
    "artist-image": { max: 1000, window: 60000 }, // 1000 requests per minute for Spotify images
    "spotify-tracks": { max: 100, window: 300000 }, // 100 requests per 5 minutes (involves multiple Spotify calls)
    "spotify-albums": { max: 50, window: 300000 }, // 50 requests per 5 minutes (involves multiple Spotify calls)
    "spotify-related": { max: 100, window: 300000 }, // 100 requests per 5 minutes for related artists
    "trending-artists": { max: 100, window: 600000 }, // 100 requests per 10 minutes
    "youtube-videos": { max: 50, window: 3600000 }, // 50 requests per hour (still quota-safe)
    "artist-news": { max: 200, window: 3600000 }, // 200 requests per hour
    global: { max: 2000, window: 60000 }, // 2000 total requests per minute (extremely generous)

    // Much shorter block duration (30 seconds instead of 2 minutes)
    blockDuration: 30000,

    // Burst allowance - allow generous bursts for normal user behavior
    burstWindow: 60000, // 60 seconds (full minute)
    burstMax: 300, // Allow 300 requests per minute for burst activity (very generous)
  };

  private getOrCreateEntry(key: string): RateLimitEntry {
    const now = Date.now();
    let entry = this.limits.get(key);

    const getWindow = (key: string): number => {
      const limit = this.LIMITS[key as keyof typeof this.LIMITS];
      if (typeof limit === 'object' && limit && 'window' in limit) {
        return limit.window;
      }
      return 60000;
    };

    if (!entry) {
      entry = {
        count: 0,
        resetTime: now + getWindow(key),
        blocked: false,
        burstCount: 0,
        lastBurstReset: now,
      };
      this.limits.set(key, entry);
    }

    // Reset counter if window expired
    if (now > entry.resetTime) {
      entry.count = 0;
      entry.resetTime = now + getWindow(key);
      entry.blocked = false;
      delete entry.blockUntil;
    }

    // Reset burst counter if burst window expired
    if (now > entry.lastBurstReset + this.LIMITS.burstWindow) {
      entry.burstCount = 0;
      entry.lastBurstReset = now;
    }

    // Check if still blocked
    if (entry.blocked && entry.blockUntil && now < entry.blockUntil) {
      return entry;
    } else if (entry.blocked && entry.blockUntil && now >= entry.blockUntil) {
      // Unblock
      entry.blocked = false;
      entry.count = 0;
      entry.burstCount = 0;
      delete entry.blockUntil;
    }

    return entry;
  }

  checkLimit(
    endpoint:
      | "artist-detail"
      | "artist-search"
      | "artist-image"
      | "spotify-tracks"
      | "spotify-albums"
      | "spotify-related"
      | "trending-artists"
      | "youtube-videos"
      | "artist-news"
  ): {
    allowed: boolean;
    remaining: number;
    resetIn: number;
    message?: string;
  } {
    const now = Date.now();

    // In development, be extra lenient to avoid frustrating developers
    const isDevelopment = process.env.NODE_ENV === "development";

    // Check endpoint-specific limit
    const endpointEntry = this.getOrCreateEntry(endpoint);
    const endpointLimit = this.LIMITS[endpoint];

    // Check global limit
    const globalEntry = this.getOrCreateEntry("global");
    const globalLimit = this.LIMITS.global;

    // If blocked, return immediately
    if (endpointEntry.blocked) {
      const resetIn = Math.ceil((endpointEntry.blockUntil! - now) / 1000);
      return {
        allowed: false,
        remaining: 0,
        resetIn,
        message: `${endpoint} endpoint blocked for ${resetIn}s due to rate limit exceeded`,
      };
    }

    if (globalEntry.blocked) {
      const resetIn = Math.ceil((globalEntry.blockUntil! - now) / 1000);
      return {
        allowed: false,
        remaining: 0,
        resetIn,
        message: `All API calls blocked for ${resetIn}s due to global rate limit exceeded`,
      };
    }

    // Check if would exceed regular limits (primary protection)
    const wouldExceedEndpoint = endpointEntry.count >= endpointLimit.max;
    const wouldExceedGlobal = globalEntry.count >= globalLimit.max;

    if (wouldExceedEndpoint || wouldExceedGlobal) {
      // Block the endpoint/global
      if (wouldExceedEndpoint) {
        endpointEntry.blocked = true;
        endpointEntry.blockUntil = now + this.LIMITS.blockDuration;
      }

      if (wouldExceedGlobal) {
        globalEntry.blocked = true;
        globalEntry.blockUntil = now + this.LIMITS.blockDuration;
      }

      const resetIn = Math.ceil(this.LIMITS.blockDuration / 1000);
      return {
        allowed: false,
        remaining: 0,
        resetIn,
        message: `Rate limit exceeded. Please wait ${resetIn} seconds before making more requests.`,
      };
    }

    // Skip burst limiting entirely in development mode
    if (!isDevelopment) {
      // Only check burst limits for truly excessive usage (secondary protection)
      // This only kicks in for truly abusive patterns - like automated scripts
      const wouldExceedBurst = globalEntry.burstCount >= this.LIMITS.burstMax;

      if (wouldExceedBurst) {
        // Very soft throttling - only apply if requests are extremely rapid
        const burstResetIn = Math.ceil(
          (globalEntry.lastBurstReset + this.LIMITS.burstWindow - now) / 1000
        );

        // Only throttle if there's less than 3 seconds left in burst window (extremely lenient)
        if (burstResetIn <= 3) {
          return {
            allowed: false,
            remaining: 0,
            resetIn: burstResetIn,
            message: `Please slow down a bit. Try again in ${burstResetIn} seconds.`,
          };
        }
      }
    }

    // Increment counters
    endpointEntry.count++;
    globalEntry.count++;

    // Only track burst count in production
    if (!isDevelopment) {
      globalEntry.burstCount++;
    }

    const remaining = Math.min(
      endpointLimit.max - endpointEntry.count,
      globalLimit.max - globalEntry.count
    );

    const resetIn = Math.ceil(
      Math.min(endpointEntry.resetTime - now, globalEntry.resetTime - now) /
        1000
    );

    return {
      allowed: true,
      remaining,
      resetIn,
    };
  }

  // Get current status for monitoring
  getStatus() {
    const now = Date.now();
    const status: any = {};

    for (const [key, entry] of this.limits.entries()) {
      const limit = this.LIMITS[key as keyof typeof this.LIMITS];
      if (typeof limit === "object" && "max" in limit) {
        status[key] = {
          count: entry.count,
          max: limit.max,
          remaining: Math.max(0, limit.max - entry.count),
          resetIn: Math.ceil((entry.resetTime - now) / 1000),
          blocked: entry.blocked,
          blockUntil: entry.blockUntil
            ? Math.ceil((entry.blockUntil - now) / 1000)
            : undefined,
        };
      }
    }

    return status;
  }

  // Reset all limits (for development/testing)
  reset() {
    this.limits.clear();
    console.log("Rate limiter reset - all limits cleared");
  }

  // Reset specific endpoint limits
  resetEndpoint(endpoint: string) {
    this.limits.delete(endpoint);
    this.limits.delete("global");
    console.log(`Rate limiter reset for endpoint: ${endpoint}`);
  }

  // Method to check limit without incrementing (for cache hits)
  checkLimitWithoutIncrement(
    endpoint:
      | "artist-detail"
      | "artist-search"
      | "artist-image"
      | "spotify-tracks"
      | "spotify-albums"
      | "spotify-related"
      | "trending-artists"
      | "youtube-videos"
      | "artist-news"
  ): {
    allowed: boolean;
    remaining: number;
    resetIn: number;
    message?: string;
  } {
    const now = Date.now();

    // Get entries without incrementing
    const endpointEntry = this.getOrCreateEntry(endpoint);
    const globalEntry = this.getOrCreateEntry("global");

    // Check if blocked
    if (endpointEntry.blocked || globalEntry.blocked) {
      const resetIn = Math.ceil(this.LIMITS.blockDuration / 1000);
      return {
        allowed: false,
        remaining: 0,
        resetIn,
        message: `Rate limited - cache hit avoided API call`,
      };
    }

    return {
      allowed: true,
      remaining: Math.min(
        this.LIMITS[endpoint].max - endpointEntry.count,
        this.LIMITS.global.max - globalEntry.count
      ),
      resetIn: Math.ceil((endpointEntry.resetTime - now) / 1000),
    };
  }
}

// Export singleton instance
export const rateLimiter = new RateLimiter();
