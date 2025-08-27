# KPulse - K-Pop Artist Dashboard

## Project Overview
KPulse is a comprehensive K-Pop artist discovery platform that aggregates real-time data from multiple APIs to provide fans with artist statistics, music, videos, news, and social features.

## Tech Stack
- **Frontend**: Next.js 15, TypeScript, Tailwind CSS 4
- **Backend**: Supabase (PostgreSQL, Auth, RLS)
- **APIs**: Spotify Web API (primary), Last.fm, YouTube Data API, NewsAPI
- **Performance**: Multi-level caching (SWR), rate limiting, intelligent API aggregation

## Core Features

### Artist Discovery & Search
- **K-pop Filtered Search**: Only returns K-pop artists using intelligent genre, name pattern, and Korean text detection
- **Spotify-Powered**: Sub-second search with real follower counts and high-quality images
- **Smart Fallback**: Last.fm backup when Spotify unavailable

### Artist Dashboard Pages
- **Top Songs**: Spotify embeds with 30-second previews
- **Latest News**: K-pop industry news with quality filtering
- **Latest Album**: Full Spotify album embeds
- **Music Video**: Single best video with lazy-loading, optimized from 3 → 1 video display
- **Related Artists**: Spotify + Last.fm recommendations (renamed from "Similar Artists")

### User Features
- **Authentication**: Supabase email/password with secure sessions
- **Favorites & Follow**: Heart button + follow system with real-time notifications
- **Personal Dashboard**: User favorites and followed artists
- **Smart Notifications**: Bell UI with content polling for new releases

## Data Architecture

### Unified Artist Service (`/src/lib/services/artistService.ts`)
- **Single API Interface**: All artist data goes through this abstraction layer
- **Intelligent Aggregation**: Spotify primary + Last.fm fallback with source attribution
- **Performance**: 98.9% faster with SWR caching (1251ms → 14ms search times)

### K-pop Filtering System (`/src/utils/kpopFilter.ts`)
- **Multi-Criteria Detection**: Genres, Korean text, name patterns, entertainment companies
- **Smart Pattern Recognition**: Recognizes major K-pop groups, solo artists, and Korean naming conventions
- **Real-Time Filtering**: Applied to all search results before returning to frontend

### API Integration
- **Spotify (Primary)**: Search, artist data, tracks, albums, images
- **Last.fm (Secondary)**: Related artists, trending data, fallback search
- **YouTube**: Single best music video with intelligent scoring algorithm
- **NewsAPI**: K-pop industry news with relevance filtering

## Database Schema (Supabase)
- **user_profiles**: User data with authentication
- **favorite_artists**: User's favorited artists
- **follows**: Artist follow relationships for notifications
- **notifications**: Real-time notification system
- **RLS Policies**: Complete user data isolation

## Performance & Caching

### SWR Cache System
- **Content-Specific TTLs**: Albums (24h), artist data (30min), search (10min), videos (6h)
- **Background Revalidation**: Serves stale content immediately, updates in background
- **98.9% Performance Improvement**: Artist data 982ms → 11ms

### Artist ID Mapping Cache
- **60-80% Request Reduction**: Cached Spotify ↔ Last.fm ID mappings
- **Smart Direct Calls**: Uses cached IDs to avoid redundant searches

## Module Structure (Renamed for Consistency)
- **TopSongsModule.tsx**: Multiple top songs display
- **LatestNewsModule.tsx**: K-pop news articles  
- **LatestAlbumModule.tsx**: Single latest album (renamed from TopAlbumsModule)
- **MusicVideoModule.tsx**: Single best video (renamed from MusicVideosModule)
- **RelatedArtistsModule.tsx**: Artist recommendations (renamed from SimilarArtistsModule)

## Key File Locations
- **Data Layer**: `/src/lib/services/artistService.ts`
- **API Services**: `/src/lib/api/` (spotify.ts, lastfm.ts, youtube.ts)
- **Caching**: `/src/lib/cache/` (swr-cache.ts, artist-mapping.ts)
- **K-pop Filter**: `/src/utils/kpopFilter.ts`
- **Modules**: `/src/modules/` (all artist page components)
- **API Routes**: `/src/app/api/artists/[id]/` (latest-album, videos, related, etc.)

## Environment Variables Required
```
LAST_FM_API_KEY=
SPOTIFY_CLIENT_ID=
SPOTIFY_CLIENT_SECRET=
YOUTUBE_API_KEY=
NEWS_API_KEY=
NEXT_PUBLIC_SUPABASE_URL=
NEXT_PUBLIC_SUPABASE_ANON_KEY=
SUPABASE_SERVICE_ROLE_KEY=
```

## Development Commands
- `npm run dev` - Development server
- `npm run build` - Production build  
- `npm run lint` - ESLint checks


## Notes for Future Development
- **Data Layer**: All API calls go through `artistService.ts` - modify this for new data sources
- **K-pop Filtering**: Extend `/src/utils/kpopFilter.ts` patterns for better detection accuracy
- **API Swapping**: Easy to change data sources without touching UI code
- **Module Consistency**: All module files and titles now match semantic functionality
- **Performance**: Search performance is critical - maintain Spotify primary with Last.fm fallback