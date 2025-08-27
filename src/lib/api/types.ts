// API Response Types
export interface LastFmArtist {
  name: string;
  mbid?: string;
  url: string;
  image: LastFmImage[];
  streamable: string;
  similar?: {
    artist: LastFmArtist[];
  };
  ontour?: string;
  stats?: {
    listeners: string;
    playcount: string;
  };
  bio?: {
    links?: {
      link?: {
        '#text': string;
        href: string;
      };
    };
    published?: string;
    summary?: string;
    content?: string;
  };
  tags?: {
    tag: Array<{
      name: string;
      url: string;
    }>;
  };
}

export interface LastFmImage {
  '#text': string;
  size: 'small' | 'medium' | 'large' | 'extralarge' | 'mega';
}

export interface LastFmTrack {
  name: string;
  duration?: string;
  playcount?: string;
  listeners?: string;
  mbid?: string;
  url: string;
  streamable?: {
    '#text': string;
    fulltrack: string;
  };
  artist: {
    name: string;
    mbid?: string;
    url: string;
  };
  image?: LastFmImage[];
  '@attr'?: {
    rank: string;
  };
}

export interface LastFmSearchResult {
  results: {
    '@attr': {
      for: string;
    };
    artistmatches: {
      artist: LastFmArtist[];
    };
  };
}

export interface LastFmTopTracksResult {
  toptracks: {
    track: LastFmTrack[];
    '@attr': {
      artist: string;
      page: string;
      perPage: string;
      totalPages: string;
      total: string;
    };
  };
}

// YouTube API Types
export interface YouTubeVideo {
  id: {
    videoId: string;
  };
  snippet: {
    title: string;
    description: string;
    thumbnails: {
      default: YouTubeThumbnail;
      medium: YouTubeThumbnail;
      high: YouTubeThumbnail;
    };
    channelTitle: string;
    publishedAt: string;
  };
}

export interface YouTubeThumbnail {
  url: string;
  width: number;
  height: number;
}

export interface YouTubeSearchResult {
  items: YouTubeVideo[];
  nextPageToken?: string;
  pageInfo: {
    totalResults: number;
    resultsPerPage: number;
  };
}

// Enhanced video metadata for caching and lazy loading
export interface VideoMetadata {
  id: string;
  title: string;
  description: string;
  thumbnail: string;
  channelTitle: string;
  publishedAt: string;
  viewCount?: number;
  duration?: string;
  score?: number; // Combined recency + popularity score
  isOfficial?: boolean; // Whether the channel is an official K-pop channel
}

// Cached video data (metadata without embed)
export interface CachedVideoData {
  metadata: VideoMetadata;
  embedUrl: string;
  url: string;
  cachedAt: number;
}

// News API Types
export interface NewsArticle {
  source: {
    id: string | null;
    name: string;
  };
  author: string | null;
  title: string;
  description: string | null;
  url: string;
  urlToImage: string | null;
  publishedAt: string;
  content: string | null;
}

export interface NewsApiResult {
  status: string;
  totalResults: number;
  articles: NewsArticle[];
}

// Internal App Types
export interface ArtistData {
  id: string;
  name: string;
  image: string;
  bio: string;
  listeners: string;
  playcount: string;
  url: string;
  tags: string[];
}

export interface TrackData {
  name: string;
  playcount: string;
  url: string;
  duration?: string;
}

export interface AlbumData {
  name: string;
  playcount: string;
  url: string;
  image: string;
  year?: string;
  tracks?: number;
}

// Last.fm Album Response Types
export interface LastFmAlbum {
  name: string;
  playcount: string;
  url: string;
  image: LastFmImage[];
  artist: {
    name: string;
    url: string;
  };
}

export interface LastFmTopAlbumsResult {
  topalbums: {
    album: LastFmAlbum[];
    '@attr': {
      artist: string;
      page: string;
      perPage: string;
      totalPages: string;
      total: string;
    };
  };
}

// API Error Types
export interface ApiError {
  message: string;
  status?: number;
  code?: string;
}

export type ApiResponse<T> = {
  success: true;
  data: T;
} | {
  success: false;
  error: ApiError;
};

// Spotify API Types
export interface SpotifyImage {
  height: number;
  url: string;
  width: number;
}

export interface SpotifyArtist {
  id: string;
  name: string;
  images: SpotifyImage[];
  popularity: number;
  followers: {
    total: number;
  };
  genres: string[];
  external_urls: {
    spotify: string;
  };
}

export interface SpotifySearchResponse {
  artists: {
    items: SpotifyArtist[];
    total: number;
    limit: number;
    offset: number;
  };
}

export interface SpotifyTokenResponse {
  access_token: string;
  token_type: string;
  expires_in: number;
}