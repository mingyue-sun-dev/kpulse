export interface Artist {
  id: string;
  name: string;
  image: string;
  members?: string[];
  followers: string;
  popularity?: number; // Spotify popularity score (0-100)
  // Note: monthlyListeners removed - not available from Spotify API
  bio: string;
  timeline: TimelineEvent[];
  topSongs: TopSong[];
  topAlbums: TopAlbum[];
  recentNews: NewsItem[];
  sentimentData: SentimentData;
}

export interface TimelineEvent {
  year: number;
  event: string;
}

export interface TopSong {
  title: string;
  plays: string;
  year: number;
  spotifyId?: string | null;
}

export interface TopAlbum {
  title: string;
  year: number;
  tracks: number;
}

export interface NewsItem {
  title: string;
  date: string;
  summary: string;
}

export interface SentimentData {
  positive: number;
  neutral: number;
  negative: number;
}

export interface TrendingArtist {
  id: string;
  name: string;
  image: string;
  followers: string;
  // Note: monthlyListeners removed - not available from Spotify API
}

export interface LatestNews {
  id: number;
  title: string;
  summary: string;
  date: string;
  image: string;
}

export interface HeroStats {
  totalArtists: string;
  totalSongs: string;
  globalFans: string;
}

// =============================================================================
// UNIFIED DATA TRANSFER OBJECTS (DTOs)
// =============================================================================

// Unified Artist Data Transfer Objects
export interface ArtistDTO {
  id: string;
  name: string;
  image: string;
  biography?: string;
  followers: number;
  popularity?: number; // Spotify popularity score (0-100)
  genres: string[];
  tags?: string[];
  // Data source metadata
  sources: {
    image: 'spotify' | 'lastfm' | 'placeholder';
    biography: 'lastfm' | null;
    stats: 'spotify' | 'lastfm';
  };
}

export interface TrackDTO {
  id: string;
  title: string;
  duration?: number;
  plays?: number;
  year?: number;
  spotifyId?: string;
  spotifyPreviewUrl?: string;
  // Data source
  source: 'spotify' | 'lastfm';
}

export interface AlbumDTO {
  id: string;
  name: string;
  image?: string;
  releaseDate?: string;
  trackCount?: number;
  spotifyId?: string;
  year?: number;
  // Data source
  source: 'spotify' | 'lastfm';
}

export interface SimilarArtistDTO {
  id: string;
  name: string;
  image: string;
  // Data source
  source: 'spotify' | 'lastfm';
}

export interface ArtistSearchResultDTO {
  id: string;
  name: string;
  image: string;
  followers: number;
  popularity?: number; // Spotify popularity score (0-100) 
  genres?: string[]; // Genres from Spotify for K-pop filtering
  // Data source
  source: 'spotify' | 'lastfm';
}

// Complete artist data aggregation
export interface CompleteArtistDataDTO {
  artist: ArtistDTO;
  topTracks: TrackDTO[];
  latestAlbum?: AlbumDTO;
  topAlbums: AlbumDTO[];
  similarArtists: SimilarArtistDTO[];
  // Aggregation metadata
  aggregatedAt: string;
  cacheKey: string;
}

// API Response wrapper
export interface ArtistServiceResponse<T> {
  success: boolean;
  data?: T;
  error?: {
    message: string;
    code?: string;
    source?: 'spotify' | 'lastfm' | 'youtube' | 'news' | 'aggregation';
  };
  metadata?: {
    sources: string[];
    cacheable: boolean;
    ttl?: number;
  };
}